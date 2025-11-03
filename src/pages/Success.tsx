import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Success = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { receiptsCredits, refreshCredits } = useAuth();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Clean URL from session_id parameter
    if (sessionId) {
      window.history.replaceState(null, '', '/success');
    }

    // Refresh credits after successful payment
    const refresh = async () => {
      try {
        await refreshCredits();
      } catch (error) {
        console.error("Error refreshing credits:", error);
      } finally {
        setLoading(false);
      }
    };

    // Wait a bit for webhook to process
    setTimeout(refresh, 2000);
  }, [refreshCredits, sessionId]);

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {loading ? (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              ) : (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              )}
            </div>
            <CardTitle className="text-3xl">
              {loading ? "Traitement du paiement..." : "Paiement réussi !"}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {loading 
                ? "Nous finalisons votre abonnement..."
                : "Votre abonnement a été activé avec succès"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!loading && (
              <>
                <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Statut</span>
                    <span className="font-semibold text-green-600">Actif</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Crédits de reçus</span>
                    <span className="font-semibold">
                      {receiptsCredits === -1 ? "Illimité" : receiptsCredits}
                    </span>
                  </div>
                  {sessionId && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">ID de session</span>
                      <span className="font-mono text-xs">{sessionId.substring(0, 20)}...</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Prochaines étapes :</strong>
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200 list-disc list-inside">
                    <li>Vous pouvez maintenant utiliser toutes les fonctionnalités de votre plan</li>
                    <li>Un email de confirmation a été envoyé à votre adresse</li>
                    <li>Gérez votre abonnement depuis la page Paramètres</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => navigate("/dashboard")} 
                    className="flex-1"
                  >
                    Aller au tableau de bord
                  </Button>
                  <Button 
                    onClick={() => navigate("/parametres/abonnement")} 
                    variant="outline"
                    className="flex-1"
                  >
                    Voir mon abonnement
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Success;
