import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    let event;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } else {
      event = JSON.parse(body);
      logStep("Warning: No webhook secret, skipping signature verification");
    }

    logStep("Event type", { type: event.type });

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Processing subscription", { subscriptionId: subscription.id });

      const customerId = subscription.customer as string;
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const userEmail = customer.email;

      if (!userEmail) {
        throw new Error("Customer has no email");
      }

      logStep("Found customer email", { email: userEmail });

      // Get user from Supabase by email
      const { data: users, error: userError } = await supabaseClient
        .from("profiles")
        .select("user_id, org_id")
        .eq("email", userEmail)
        .single();

      if (userError || !users) {
        throw new Error(`User not found for email: ${userEmail}`);
      }

      logStep("Found user in Supabase", { userId: users.user_id, orgId: users.org_id });

      // Determine plan and interval from price
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const lookupKey = price.lookup_key || "";
      
      let plan = "essentiel";
      let interval = "monthly";

      if (lookupKey.includes("avance")) {
        plan = "avance";
      }
      if (lookupKey.includes("yearly")) {
        interval = "yearly";
      }

      logStep("Determined plan details", { plan, interval, lookupKey });

      // Upsert subscription
      const { error: upsertError } = await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: users.user_id,
          org_id: users.org_id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan,
          interval,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "stripe_subscription_id",
        });

      if (upsertError) {
        throw new Error(`Failed to upsert subscription: ${upsertError.message}`);
      }

      logStep("Subscription saved to database");
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Processing subscription deletion", { subscriptionId: subscription.id });

      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (updateError) {
        throw new Error(`Failed to update subscription status: ${updateError.message}`);
      }

      logStep("Subscription marked as canceled");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
