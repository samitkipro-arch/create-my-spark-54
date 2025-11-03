import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DECREMENT-RECEIPT-CREDITS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Récupérer les crédits actuels
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("receipts_credits")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      logStep("ERROR fetching profile", { message: profileError.message });
      throw new Error(`Error fetching profile: ${profileError.message}`);
    }

    const currentCredits = profile?.receipts_credits ?? 0;
    logStep("Current credits", { credits: currentCredits });

    if (currentCredits <= 0) {
      logStep("No credits remaining");
      return new Response(JSON.stringify({ 
        error: "No receipt credits remaining",
        credits: 0,
        success: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Décrémenter les crédits
    const { data: updatedProfile, error: updateError } = await supabaseClient
      .from("profiles")
      .update({ receipts_credits: currentCredits - 1 })
      .eq("user_id", user.id)
      .select("receipts_credits")
      .single();

    if (updateError) {
      logStep("ERROR updating credits", { message: updateError.message });
      throw new Error(`Error updating credits: ${updateError.message}`);
    }

    const newCredits = updatedProfile?.receipts_credits ?? 0;
    logStep("Credits decremented", { newCredits });

    return new Response(JSON.stringify({ 
      credits: newCredits,
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
