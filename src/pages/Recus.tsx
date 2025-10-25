import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, ChevronDown, Plus, Search } from "lucide-react";
import { UploadInstructionsDialog } from "@/components/Recus/UploadInstructionsDialog";
import { supabase } from "@/integrations/supabase/client";

type Receipt = {
  id: number;
  created_at: string | null;
  date_traitement?: string | null;
  enseigne?: string | null;
  adresse?: string | null;
  montant?: number | null;
  montant_ttc?: number | null;
  tva?: number | null;
};

const Recus = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from("recus_feed" as any)
        .select("*")
        .order("date_traitement", { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setReceipts((data as unknown as Receipt[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();

    const channel = supabase
      .channel("recus-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => {
        fetchReceipts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reçus</h1>
          <div className="flex gap-3">
            <Button variant="outline">Exporter</Button>
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Ajouter un reçu
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            24/09/2025 - 24/10/2025
          </Button>
          <Button variant="outline" className="gap-2">
            <ChevronDown className="w-4 h-4" />
            Sélectionner un client
          </Button>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, numéro ou adresse"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Liste des reçus</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Chargement…
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16 text-destructive">
                {error}
              </div>
            ) : receipts.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun reçu trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date de traitement</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Enseigne</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant TTC</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">TVA récupérable</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Assigné à</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Traité par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => {
                      const dateValue = receipt.date_traitement || receipt.created_at;
                      const formattedDate = dateValue 
                        ? new Date(dateValue).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "—";
                      
                      const montantTTC = receipt.montant_ttc ?? receipt.montant;
                      const formattedMontant = montantTTC !== null && montantTTC !== undefined
                        ? `${montantTTC.toFixed(2)} €`
                        : "—";
                      
                      const formattedTVA = receipt.tva !== null && receipt.tva !== undefined
                        ? `${receipt.tva.toFixed(2)} €`
                        : "—";

                      return (
                        <tr key={receipt.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm">{formattedDate}</td>
                          <td className="py-3 px-4 text-sm">{receipt.enseigne || "—"}</td>
                          <td className="py-3 px-4 text-sm text-right">{formattedMontant}</td>
                          <td className="py-3 px-4 text-sm text-right">{formattedTVA}</td>
                          <td className="py-3 px-4 text-sm">—</td>
                          <td className="py-3 px-4 text-sm">—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <UploadInstructionsDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      </div>
    </MainLayout>
  );
};

export default Recus;
