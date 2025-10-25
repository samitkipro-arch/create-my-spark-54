import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface ReceiptDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: any;
  loading: boolean;
  error: string | null;
}

export const ReceiptDetailDrawer = ({
  open,
  onOpenChange,
  detail,
  loading,
  error,
}: ReceiptDetailDrawerProps) => {
  const fmtMoney = (v: number | null | undefined) =>
    typeof v === "number" ? `${v.toFixed(2)} €` : "—";

  const fmtDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleString("fr-FR") : "—";

  const ttc = detail?.montant_ttc ?? detail?.montant ?? null;
  const tva = detail?.tva ?? 0;
  const ht = typeof ttc === "number" ? Math.max(ttc - (typeof tva === "number" ? tva : 0), 0) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right"
        className="
          fixed right-0 top-0 bottom-0 w-full max-w-full rounded-none border-0 bg-card shadow-none
          md:fixed md:right-6 md:top-6 md:h-[calc(100vh-3rem)] md:w-full md:max-w-[520px]
          md:rounded-2xl md:border md:shadow-2xl
          bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80
          overflow-y-auto
        "
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Chargement…</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        ) : detail ? (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-2xl">{detail?.enseigne ?? "—"}</SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    Reçu n° {detail?.numero_recu ?? "—"}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Montant TTC */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Montant TTC :</p>
                <p className="text-4xl font-bold">{fmtMoney(ttc)}</p>
              </div>

              {/* Cartes Montant HT / TVA */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Montant HT :</p>
                    <p className="text-2xl font-semibold">{fmtMoney(ht)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">TVA :</p>
                    <p className="text-2xl font-semibold">
                      {fmtMoney(typeof tva === "number" ? tva : null)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Informations détaillées */}
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Reçu numéro :</span>
                  <span className="font-medium">{detail?.numero_recu ?? "—"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Date de traitement :</span>
                  <span className="font-medium">
                    {fmtDate(detail?.date_traitement ?? detail?.created_at)}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Nom de l'enseigne :</span>
                  <span className="font-medium">{detail?.enseigne ?? "—"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Moyen de paiement :</span>
                  <span className="font-medium">{detail?.moyen_paiement ?? "—"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Ville :</span>
                  <span className="font-medium">{detail?.ville ?? "—"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Adresse :</span>
                  <span className="font-medium">{detail?.adresse ?? "—"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Traité par :</span>
                  <span className="font-medium">{detail?._processedByName ?? "—"}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Client assigné :</span>
                  <span className="font-medium">{detail?._clientName ?? "—"}</span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full">
                    Valider
                  </Button>
                  <Button variant="outline" className="w-full">
                    Corriger
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!detail?.analysis_report_url}
                  onClick={() => {
                    if (detail?.analysis_report_url) {
                      window.open(detail.analysis_report_url, "_blank");
                    }
                  }}
                >
                  Consulter le rapport d'analyse
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
