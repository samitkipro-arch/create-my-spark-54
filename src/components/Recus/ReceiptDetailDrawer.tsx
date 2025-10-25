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
        side="bottom"
        className="
          fixed bottom-0 left-0 right-0 h-[70vh] w-full rounded-t-[20px] border-t border-border shadow-[0_-8px_30px_rgba(0,0,0,0.3)]
          md:fixed md:right-6 md:top-6 md:left-auto md:bottom-auto md:h-[calc(100vh-3rem)] md:w-full md:max-w-[520px]
          md:rounded-2xl md:border md:shadow-2xl
          bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80
          overflow-y-auto p-4 md:p-6
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
                  <SheetTitle className="text-lg md:text-2xl">{detail?.enseigne ?? "—"}</SheetTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Reçu n° {detail?.numero_recu ?? "—"}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-4 md:mt-6 space-y-4 md:space-y-6">
              {/* Montant TTC */}
              <div className="text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant TTC :</p>
                <p className="text-2xl md:text-4xl font-bold">{fmtMoney(ttc)}</p>
              </div>

              {/* Cartes Montant HT / TVA */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Card>
                  <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant HT :</p>
                    <p className="text-lg md:text-2xl font-semibold">{fmtMoney(ht)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">TVA :</p>
                    <p className="text-lg md:text-2xl font-semibold">
                      {fmtMoney(typeof tva === "number" ? tva : null)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Informations détaillées */}
              <div className="space-y-2 md:space-y-4">
                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Reçu numéro :</span>
                  <span className="text-xs md:text-sm font-medium">{detail?.numero_recu ?? "—"}</span>
                </div>

                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Date de traitement :</span>
                  <span className="text-xs md:text-sm font-medium">
                    {fmtDate(detail?.date_traitement ?? detail?.created_at)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Nom de l'enseigne :</span>
                  <span className="text-xs md:text-sm font-medium">{detail?.enseigne ?? "—"}</span>
                </div>

                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Moyen de paiement :</span>
                  <span className="text-xs md:text-sm font-medium">{detail?.moyen_paiement ?? "—"}</span>
                </div>

                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Ville :</span>
                  <span className="text-xs md:text-sm font-medium">{detail?.ville ?? "—"}</span>
                </div>

                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Adresse :</span>
                  <span className="text-xs md:text-sm font-medium">{detail?.adresse ?? "—"}</span>
                </div>

                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Traité par :</span>
                  <span className="text-xs md:text-sm font-medium">{detail?._processedByName ?? "—"}</span>
                </div>

                <div className="flex justify-between py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Client assigné :</span>
                  <span className="text-xs md:text-sm font-medium">{detail?._clientName ?? "—"}</span>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="space-y-2 md:space-y-3 pt-3 md:pt-4">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <Button variant="outline" className="w-full text-xs md:text-sm h-9 md:h-10">
                    Valider
                  </Button>
                  <Button variant="outline" className="w-full text-xs md:text-sm h-9 md:h-10">
                    Corriger
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full text-xs md:text-sm h-9 md:h-10"
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
