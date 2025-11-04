import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type BillingInterval = "monthly" | "yearly";

// Mapping des price IDs Stripe
const PRICE_IDS = {
  essentiel: {
    monthly: "price_1SPRFgD3myr3drrgxZBsTlZl",
    yearly: "price_1SPKtQD3myr3drrgxODHVnrh",
  },
  avance: {
    monthly: "price_1SHlZoD3myr3drrganWIUw9q",
    yearly: "price_1SPL6OD3myr3drrgWIAMUkJi",
  },
};

interface PricingTier {
  name: string;
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  isEnterprise?: boolean;
  freeMonths?: number;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Essentiel",
    monthlyPrice: 49,
    yearlyMonthlyPrice: 41,
    freeMonths: 2,
    description: "Pour les cabinets qui veulent démarrer simplement.",
    features: [
      "Jusqu'à 750 reçus analysés.",
      "Jusqu'à 10 collaborateurs.",
      "Gestion clients illimitée.",
      "Exports illimités (PDF, Excel, Sheets, etc...).",
      "Notifications en temps réel.",
      "Support standard.",
    ],
  },
  {
    name: "Avancé",
    monthlyPrice: 99,
    yearlyMonthlyPrice: 74,
    freeMonths: 3,
    description: "Pour les cabinets qui traitent un volume élevé de reçus chaque mois.",
    highlighted: true,
    features: [
      "Tout du plan Essentiel +",
      "Volume illimité de reçus analysés.",
      "Collaborateurs illimités.",
      "Support prioritaire 24/7",
      "Portail de visualisation pour vos clients",
    ],
  },
  {
    name: "Expert",
    monthlyPrice: 0,
    yearlyMonthlyPrice: 0,
    description: "Pour les cabinets qui veulent un accompagnement et des intégrations sur-mesure.",
    isEnterprise: true,
    features: [
      "Tout du plan Avancé +",
      "Support dédié & gestionnaire de compte attitré",
      "Intégrations avancées & API dédiées",
      "Accès SSO (Google / Microsoft).",
      "SLA contractuel personnalisé",
      "Formation complète des équipes",
    ],
  },
];

const AbonnementFacturation = () => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { subscription, checkSubscription } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('recus')
        .select('*', { count: 'exact', head: true })
        .eq('processed_by', user.id);
      
      setReceiptsCount(count || 0);
    };

    fetchData();
    checkSubscription();
  }, []);

  const handleCheckout = async (tierName: string) => {
    setCheckoutLoading(tierName);
    try {
      const priceId = PRICE_IDS[tierName.toLowerCase() as keyof typeof PRICE_IDS]?.[billingInterval];
      if (!priceId) {
        throw new Error("Price ID not found");
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;
      if (data?.url) {
        // Rediriger dans la même fenêtre pour éviter le blocage des pop-ups
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la session de paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        // Rediriger dans la même fenêtre pour éviter le blocage des pop-ups
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le portail client. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const getUsageText = () => {
    if (!subscription.plan) {
      return `Vous avez traité ${receiptsCount} reçus. Vous avez 5 crédits gratuits pour tester.`;
    }
    switch (subscription.plan) {
      case "essentiel":
        return `Vous avez traité ${receiptsCount} reçus ce mois-ci sur 750 inclus.`;
      case "avance":
        return "Reçus illimités — vous pouvez traiter autant de reçus que vous le souhaitez.";
      case "expert":
        return "Reçus illimités — accompagnement personnalisé.";
      default:
        return "";
    }
  };

  const fmt = new Intl.NumberFormat("fr-FR");

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Abonnement & Facturation</h1>
          <p className="text-muted-foreground">{getUsageText()}</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={cn(
              "px-6 py-2 rounded-full font-medium transition-all",
              billingInterval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={cn(
              "px-6 py-2 rounded-full font-medium transition-all",
              billingInterval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annuel
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {pricingTiers.map((tier) => {
            const isYearly = billingInterval === "yearly";
            const isCurrentPlan = subscription.subscribed && subscription.plan === tier.name.toLowerCase();

            return (
              <Card
                key={tier.name}
                className={cn(
                  "relative flex flex-col",
                  tier.highlighted && "border-primary border-2 shadow-lg scale-105",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)]">
                    <div className="bg-primary text-primary-foreground text-center py-2 rounded-t-lg font-medium text-sm">
                      Offre la plus avantageuse
                    </div>
                  </div>
                )}

                <CardHeader className={cn(tier.highlighted && "pt-8")}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">{tier.name}</CardTitle>
                      {isCurrentPlan && (
                        <Badge variant="default">Plan actuel</Badge>
                      )}
                    </div>
                    {!tier.isEnterprise ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold">{fmt.format(isYearly ? tier.yearlyMonthlyPrice : tier.monthlyPrice)}€</span>
                        <span className="text-muted-foreground">/mois</span>
                      </div>
                    ) : (
                      <div className="text-5xl font-bold">Sur Devis</div>
                    )}
                    {isYearly && !tier.isEnterprise && tier.freeMonths && (
                      <p className="text-sm text-green-500 font-medium">
                        Économiser {fmt.format(tier.monthlyPrice * tier.freeMonths)}€ / {tier.freeMonths} mois offerts
                      </p>
                    )}
                  </div>
                  <CardDescription className="text-base">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrentPlan ? (
                    <div className="space-y-2">
                      <Button 
                        className="w-full" 
                        variant="secondary"
                        size="lg"
                        onClick={handleManageSubscription}
                      >
                        Gérer mon abonnement
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant={tier.highlighted ? "default" : "outline"}
                      size="lg"
                      onClick={() => tier.isEnterprise ? null : handleCheckout(tier.name)}
                      disabled={checkoutLoading === tier.name}
                    >
                      {checkoutLoading === tier.name ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        tier.isEnterprise ? "Nous Contacter" : "Choisir ce plan"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default AbonnementFacturation;
