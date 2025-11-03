import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature) {
      throw new Error("No stripe-signature header found");
    }

    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!endpointSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    logStep("Event verified with webhook secret", { type: event.type });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle customer.subscription.created and customer.subscription.updated
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Processing subscription event", { 
        subscriptionId: subscription.id, 
        customerId: subscription.customer,
        status: subscription.status 
      });

      // Get customer email
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      if (!customer || customer.deleted) {
        throw new Error("Customer not found or deleted");
      }

      const customerEmail = (customer as Stripe.Customer).email;
      if (!customerEmail) {
        throw new Error("Customer email not found");
      }
      logStep("Customer email retrieved", { email: customerEmail });

      // Get user from Supabase by email
      const { data: users, error: userError } = await supabaseClient
        .from("profiles")
        .select("user_id, org_id")
        .eq("email", customerEmail)
        .limit(1);

      if (userError || !users || users.length === 0) {
        throw new Error(`User not found for email: ${customerEmail}`);
      }

      const { user_id, org_id } = users[0];
      logStep("User found in Supabase", { user_id, org_id });

      // Extract plan and interval from price lookup_key or metadata
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const lookupKey = price.lookup_key || "";
      
      logStep("Price lookup key", { lookupKey });

      // Parse plan and interval from lookup_key
      // Expected format: essentiel_monthly, essentiel_yearly, avance_monthly, avance_yearly
      let plan = "essentiel";
      let interval = "monthly";

      if (lookupKey.includes("essentiel")) {
        plan = "essentiel";
      } else if (lookupKey.includes("avance")) {
        plan = "avance";
      }

      if (lookupKey.includes("yearly")) {
        interval = "yearly";
      } else if (lookupKey.includes("monthly")) {
        interval = "monthly";
      }

      logStep("Parsed subscription details", { plan, interval });

      // Upsert subscription in Supabase
      const { error: upsertError } = await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id,
          org_id,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          plan,
          interval,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "stripe_subscription_id"
        });

      if (upsertError) {
        throw new Error(`Failed to upsert subscription: ${upsertError.message}`);
      }

      logStep("Subscription saved to Supabase", { 
        subscription_id: subscription.id,
        plan,
        interval,
        status: subscription.status 
      });
    }

    // Handle customer.subscription.deleted
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      logStep("Processing subscription deletion", { subscriptionId: subscription.id });

      const { error: updateError } = await supabaseClient
        .from("subscriptions")
        .update({ 
          status: "canceled",
          updated_at: new Date().toISOString()
        })
        .eq("stripe_subscription_id", subscription.id);

      if (updateError) {
        throw new Error(`Failed to update subscription status: ${updateError.message}`);
      }

      logStep("Subscription marked as canceled", { subscriptionId: subscription.id });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
