import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Mapping des price IDs vers les plans
const PRICE_TO_PLAN: Record<string, { plan: string; interval: string }> = {
  "price_1SPRFgD3myr3drrgxZBsTlZl": { plan: "essentiel", interval: "monthly" },
  "price_1SPKtQD3myr3drrgxODHVnrh": { plan: "essentiel", interval: "yearly" },
  "price_1SHlZoD3myr3drrganWIUw9q": { plan: "avance", interval: "monthly" },
  "price_1SPL6OD3myr3drrgWIAMUkJi": { plan: "avance", interval: "yearly" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    // Create a client with the user's token for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: { persistSession: false }
      }
    );
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });
    
    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: null,
        interval: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let plan = null;
    let interval = null;
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;
    let stripeCustomerId = customerId;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      
      // Vérifier et convertir les timestamps de manière sécurisée
      const periodEnd = subscription.current_period_end;
      const periodStart = subscription.current_period_start;
      
      logStep("Subscription timestamps", { 
        periodEnd, 
        periodStart,
        periodEndType: typeof periodEnd,
        periodStartType: typeof periodStart
      });
      
      if (periodEnd && typeof periodEnd === 'number') {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      } else {
        logStep("Warning: Invalid period_end", { periodEnd });
      }
      
      const priceId = subscription.items.data[0].price.id;
      
      const planInfo = PRICE_TO_PLAN[priceId];
      if (planInfo) {
        plan = planInfo.plan;
        interval = planInfo.interval;
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        plan,
        interval,
        priceId
      });

      // Mettre à jour la table subscriptions seulement si on a les données nécessaires
      if (periodStart && periodEnd && typeof periodStart === 'number' && typeof periodEnd === 'number') {
        const { error: upsertError } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            plan: plan || 'unknown',
            interval: interval || 'unknown',
            status: 'active',
            current_period_start: new Date(periodStart * 1000).toISOString(),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          }, {
            onConflict: 'stripe_subscription_id'
          });

        if (upsertError) {
          logStep("Error updating subscription in database", { error: upsertError });
        } else {
          logStep("Subscription updated in database");
        }
      } else {
        logStep("Skipping database update due to invalid timestamps");
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      interval,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
