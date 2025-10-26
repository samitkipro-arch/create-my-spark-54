import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { useState } from "react";

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
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  
  // States pour les champs éditables
  const [editedData, setEditedData] = useState({
    enseigne: "",
    numero_recu: "",
    montant_ttc: 0,
    tva: 0,
    ville: "",
    adresse: "",
    moyen_paiement: "",
  });
  
  const fmtMoney = (v: number | null | undefined) =>
    typeof v === "number" ? `${v.toFixed(2)} €` : "—";

  const fmtDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleString("fr-FR") : "—";

  const ttc = detail?.montant_ttc ?? detail?.montant ?? null;
  const tva = detail?.tva ?? 0;
  const ht = typeof ttc === "number" ? Math.max(ttc - (typeof tva === "number" ? tva : 0), 0) : null;

  const handleValidate = () => {
    console.log("Validating receipt...");
    // TODO: Implement validation logic
  };

  const handleCorrect = () => {
    setIsEditing(true);
    // Initialiser les données éditables avec les valeurs actuelles
    setEditedData({
      enseigne: detail?.enseigne ?? "",
      numero_recu: detail?.numero_recu ?? "",
      montant_ttc: detail?.montant_ttc ?? detail?.montant ?? 0,
      tva: detail?.tva ?? 0,
      ville: detail?.ville ?? "",
      adresse: detail?.adresse ?? "",
      moyen_paiement: detail?.moyen_paiement ?? "",
    });
  };

  const handleSave = () => {
    setIsEditing(false);
    console.log("Saving receipt...", editedData);
    // TODO: Implement save logic
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const content = (
    <div className="overflow-y-auto h-full p-4 md:p-6">
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
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nom de l'enseigne</Label>
                      <Input
                        value={editedData.enseigne}
                        onChange={(e) => setEditedData({ ...editedData, enseigne: e.target.value })}
                        className="text-lg md:text-2xl font-bold h-auto py-1 px-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Numéro de reçu</Label>
                      <Input
                        value={editedData.numero_recu}
                        onChange={(e) => setEditedData({ ...editedData, numero_recu: e.target.value })}
                        className="text-xs md:text-sm h-auto py-1 px-2"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-left">
                    <SheetTitle className="text-lg md:text-2xl text-left">{detail?.enseigne ?? "—"}</SheetTitle>
                    <p className="text-xs md:text-sm text-muted-foreground text-left">
                      Reçu n° {detail?.numero_recu ?? "—"}
                    </p>
                  </div>
                )}
              </div>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="mt-4 md:mt-6 space-y-4 md:space-y-6">
            {/* Montant TTC */}
            <div className="text-center">
              <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant TTC :</p>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editedData.montant_ttc}
                  onChange={(e) => setEditedData({ ...editedData, montant_ttc: parseFloat(e.target.value) || 0 })}
                  className="text-2xl md:text-4xl font-bold text-center h-auto py-2"
                />
              ) : (
                <p className="text-2xl md:text-4xl font-bold">{fmtMoney(ttc)}</p>
              )}
            </div>

            {/* Cartes Montant HT / TVA */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Card>
                <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant HT :</p>
                  {isEditing ? (
                    <p className="text-lg md:text-2xl font-semibold">
                      {fmtMoney(editedData.montant_ttc - editedData.tva)}
                    </p>
                  ) : (
                    <p className="text-lg md:text-2xl font-semibold">{fmtMoney(ht)}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">TVA :</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.tva}
                      onChange={(e) => setEditedData({ ...editedData, tva: parseFloat(e.target.value) || 0 })}
                      className="text-lg md:text-2xl font-semibold text-center h-auto py-1"
                    />
                  ) : (
                    <p className="text-lg md:text-2xl font-semibold">
                      {fmtMoney(typeof tva === "number" ? tva : null)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Informations détaillées */}
            <div className="space-y-2 md:space-y-4">
              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Date de traitement :</span>
                <span className="text-xs md:text-sm font-medium">
                  {fmtDate(detail?.date_traitement ?? detail?.created_at)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Moyen de paiement :</span>
                {isEditing ? (
                  <Input
                    value={editedData.moyen_paiement}
                    onChange={(e) => setEditedData({ ...editedData, moyen_paiement: e.target.value })}
                    className="text-xs md:text-sm font-medium max-w-[200px] h-8"
                  />
                ) : (
                  <span className="text-xs md:text-sm font-medium">{detail?.moyen_paiement ?? "—"}</span>
                )}
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Ville :</span>
                {isEditing ? (
                  <Input
                    value={editedData.ville}
                    onChange={(e) => setEditedData({ ...editedData, ville: e.target.value })}
                    className="text-xs md:text-sm font-medium max-w-[200px] h-8"
                  />
                ) : (
                  <span className="text-xs md:text-sm font-medium">{detail?.ville ?? "—"}</span>
                )}
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Adresse :</span>
                {isEditing ? (
                  <Input
                    value={editedData.adresse}
                    onChange={(e) => setEditedData({ ...editedData, adresse: e.target.value })}
                    className="text-xs md:text-sm font-medium max-w-[200px] h-8"
                  />
                ) : (
                  <span className="text-xs md:text-sm font-medium">{detail?.adresse ?? "—"}</span>
                )}
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Traité par :</span>
                <span className="text-xs md:text-sm font-medium">{detail?._processedByName ?? "—"}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Client assigné :</span>
                <span className="text-xs md:text-sm font-medium">{detail?._clientName ?? "—"}</span>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="space-y-3 pt-4 md:pt-6">
              {isEditing ? (
                <div className="flex gap-3">
                  <Button 
                    variant="default" 
                    className="flex-1 h-10" 
                    onClick={handleSave}
                  >
                    Enregistrer
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-10" 
                    onClick={handleCancel}
                  >
                    Annuler
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-10" 
                      onClick={handleValidate}
                    >
                      Valider
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-10" 
                      onClick={handleCorrect}
                    >
                      Corriger
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-10"
                    disabled={!detail?.analysis_report_url}
                    onClick={() => {
                      if (detail?.analysis_report_url) {
                        window.open(detail.analysis_report_url, "_blank");
                      }
                    }}
                  >
                    Consulter le rapport d'analyse
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  // Mobile: Drawer flottant
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent 
          className="
            mx-4 mb-6 h-[75vh] rounded-2xl 
            bg-card/95 backdrop-blur-lg 
            shadow-[0_10px_40px_rgba(0,0,0,0.4)]
            border border-border/50
          "
        >
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Sheet à droite
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right"
        className="h-full w-full max-w-[520px] bg-card border-l border-border overflow-y-auto p-0"
      >
        {content}
      </SheetContent>
    </Sheet>
  );
};
