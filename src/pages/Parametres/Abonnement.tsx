import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const ParametresAbonnement = () => {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { toast } = useToast();
  const { receiptsCredits } = useAuth();

  const handleChoosePlan = async (planName: string, interval: "monthly" | "annual") => {
    setLoadingPlan(planName);
    
    try {
      // Map plan name + interval to Stripe lookup_key
      let lookup_key: string | null = null;
      
      if (planName === "Essentiel") {
        lookup_key = interval === "monthly" ? "essentiel_monthly_test" : "essentiel_yearly";
      } else if (planName === "Avancé") {
        lookup_key = interval === "monthly" ? "avance_monthly" : "avance_yearly";
      }
      
      if (!lookup_key) {
        toast({
          title: "Plan non disponible",
          description: "Ce plan n'est pas encore configuré. Veuillez réessayer plus tard.",
          variant: "destructive",
        });
        return;
      }

      console.log(`[Abonnement] Création checkout pour ${planName} (${interval}), lookup_key: ${lookup_key}`);

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Temps de réponse dépassé (15s)")), 15000)
      );

      const invokePromise = supabase.functions.invoke("create-checkout-session", {
        body: { lookup_key },
      });

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;

      if (error) {
        console.error("[Abonnement] Erreur edge function:", error);
        throw new Error(error.message || "Erreur lors de la création de la session");
      }

      if (!data?.url) {
        console.error("[Abonnement] Pas d'URL dans la réponse:", data);
        throw new Error("URL de paiement non reçue");
      }

      console.log("[Abonnement] Redirection vers:", data.url);
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error("[Abonnement] Erreur:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible de créer la session de paiement",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  // Mock data - à remplacer par les vraies données Stripe plus tard
  const currentPlan = "Gratuit";
  const renewalDate = null;

  const plans = [
    {
      name: "Essentiel",
      description: "Parfait pour les petits cabinets comptables.",
      priceMonthly: 49,
      priceAnnual: 40,
      features: [
        "Jusqu'à 750 reçus analysés/mois",
        "Jusqu'à 10 collaborateurs",
        "Gestion client illimitée",
        "Exports illimités (PDF, Excel, Sheets...)",
        "Notifications en temps réel",
        "Support standard",
      ],
      cta: "Choisir ce plan",
      highlighted: false,
    },
    {
      name: "Avancé",
      description: "Idéal pour les équipes comptables en forte croissance.",
      priceMonthly: 99,
      priceAnnual: 74,
      features: [
        "Volume de reçus illimité",
        "Collaborateurs illimités",
        "Support prioritaire 24/7",
        "Portail de visualisation clients",
      ],
      cta: "Choisir ce plan",
      highlighted: true,
    },
    {
      name: "Expert",
      description: "Idéal pour les grands cabinets comptables.",
      priceMonthly: null,
      priceAnnual: null,
      features: [
        "Volume de reçus flexible",
        "Support dédié + CSM",
        "Intégrations avancées & API dédiées",
        "SSO (Google/Microsoft)",
        "Formation complète des équipes",
      ],
      cta: "Être recontacté",
      highlighted: false,
    },
  ];

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-8">
        {/* Top Section: Current Plan & Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Current Plan Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl">Votre plan actuel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-foreground">{currentPlan}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {renewalDate ? `Se renouvelle le : ${renewalDate}` : "Plan gratuit"}
                </p>
              </div>
              <Button variant="outline" className="w-full" disabled>
                Aucun abonnement actif
              </Button>
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl">Crédits de reçus gratuits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-4xl font-bold text-primary">{receiptsCredits} / 5</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Crédits restants pour analyser des reçus gratuitement
                </p>
              </div>
              <Progress value={(receiptsCredits / 5) * 100} className="h-2" />
              {receiptsCredits === 0 && (
                <p className="text-sm text-destructive">
                  Vous avez utilisé tous vos crédits gratuits. Souscrivez à un abonnement pour continuer.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plans Section */}
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Choisissez Le Plan Qui Vous Correspond Le Mieux
            </h2>

            {/* Billing Period Toggle */}
            <div className="inline-flex items-center gap-3 bg-muted/50 p-1 rounded-lg">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("monthly")}
                className="rounded-md"
              >
                Mensuel
              </Button>
              <Button
                variant={billingPeriod === "annual" ? "default" : "ghost"}
                size="sm"
                onClick={() => setBillingPeriod("annual")}
                className="rounded-md"
              >
                Annuel
              </Button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.highlighted
                    ? "border-primary border-2 shadow-lg"
                    : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Offre la plus avantageuse
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price */}
                  <div>
                    {plan.priceMonthly ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-foreground">
                            {billingPeriod === "monthly"
                              ? plan.priceMonthly
                              : plan.priceAnnual}
                            €
                          </span>
                          <span className="text-muted-foreground">/mois</span>
                        </div>
                        {billingPeriod === "annual" && (
                          <p className="text-sm text-green-500 font-medium mt-1">
                            (Économiser{" "}
                            {((plan.priceMonthly - plan.priceAnnual!) * 12).toFixed(0)}€ / 2 mois
                            offert)
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-4xl font-bold text-foreground">Sur Devis</div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => {
                      if (plan.name === "Expert") {
                        // For Expert plan, open email or contact form
                        window.location.href = "mailto:contact@finvisor.fr?subject=Demande plan Expert";
                      } else {
                        handleChoosePlan(plan.name, billingPeriod === "monthly" ? "monthly" : "annual");
                      }
                    }}
                    disabled={loadingPlan === plan.name}
                  >
                    {loadingPlan === plan.name ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ParametresAbonnement;
