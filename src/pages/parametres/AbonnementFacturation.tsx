import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type BillingInterval = "monthly" | "yearly";

interface PricingTier {
  name: string;
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  isEnterprise?: boolean;
  current?: boolean;
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
    current: true,
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
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<string>("Avancé");

  useEffect(() => {
    if (user) {
      loadReceiptsCount();
      loadCurrentPlan();
    }
  }, [user]);

  const loadReceiptsCount = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from("recus")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;
      setReceiptsCount(count || 0);
    } catch (error) {
      console.error("Erreur lors du chargement du nombre de reçus:", error);
    }
  };

  const loadCurrentPlan = async () => {
    // For now, we'll use the hardcoded "Avancé" as current plan
    // In a real scenario, this would come from the subscriptions table
    setCurrentPlan("Avancé");
  };

  const getUsageText = () => {
    switch (currentPlan) {
      case "Essentiel":
        return `Vous avez traité ${receiptsCount} reçus ce mois-ci sur 750 inclus.`;
      case "Avancé":
        return "Reçus illimités — vous pouvez traiter autant de reçus que vous le souhaitez.";
      case "Expert":
        return "Reçus illimités — accompagnement personnalisé.";
      default:
        return "";
    }
  };


  const fmt = new Intl.NumberFormat("fr-FR");

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-8 animate-fade-in-up">
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
          {pricingTiers.map((tier, index) => {
            const isYearly = billingInterval === "yearly";

            return (
              <Card
                key={tier.name}
                className={cn(
                  "relative flex flex-col",
                  tier.highlighted && "border-primary border-2 shadow-lg scale-105"
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
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
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
                  <CardDescription className="text-base mt-4">{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-1 mb-6">
                    <p className="font-medium text-sm mb-3">Ce que cela inclut :</p>
                    {tier.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full mt-auto"
                    variant={tier.highlighted ? "default" : "outline"}
                    disabled={tier.current}
                  >
                    {tier.current
                      ? "Plan actuel"
                      : tier.isEnterprise
                      ? "Être recontacté"
                      : "Choisir ce plan"}
                  </Button>
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
