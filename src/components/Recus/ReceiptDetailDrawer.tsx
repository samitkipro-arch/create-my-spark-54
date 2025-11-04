import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
interface ReceiptDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: any;
  loading: boolean;
  error: string | null;
  clients?: Array<{
    id: string;
    name: string;
  }>;
  members?: Array<{
    id: string;
    name: string;
  }>;
}
export const ReceiptDetailDrawer = ({
  open,
  onOpenChange,
  detail,
  loading,
  error,
  clients = [],
  members = []
}: ReceiptDetailDrawerProps) => {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // States pour les champs éditables
  const [editedData, setEditedData] = useState({
    enseigne: "",
    numero_recu: "",
    montant_ttc: 0,
    tva: 0,
    ville: "",
    adresse: "",
    moyen_paiement: "",
    client_id: "",
    processed_by: ""
  });

  // Synchroniser editedData avec detail
  useEffect(() => {
    if (detail) {
      setEditedData({
        enseigne: detail?.enseigne ?? "",
        numero_recu: detail?.numero_recu ?? "",
        montant_ttc: detail?.montant_ttc ?? detail?.montant ?? 0,
        tva: detail?.tva ?? 0,
        ville: detail?.ville ?? "",
        adresse: detail?.adresse ?? "",
        moyen_paiement: detail?.moyen_paiement ?? "",
        client_id: detail?.client_id ?? "",
        processed_by: detail?.processed_by ?? ""
      });
    }
  }, [detail]);

  // Sauvegarde automatique en temps réel pendant l'édition
  useEffect(() => {
    if (!isEditing || !detail?.id) return;
    const saveChanges = async () => {
      try {
        await (supabase as any).from("recus").update({
          enseigne: editedData.enseigne,
          numero_recu: editedData.numero_recu,
          montant_ttc: editedData.montant_ttc,
          tva: editedData.tva,
          ville: editedData.ville,
          adresse: editedData.adresse,
          moyen_paiement: editedData.moyen_paiement,
          client_id: editedData.client_id || null,
          processed_by: editedData.processed_by || null
        }).eq("id", detail.id);
      } catch (err) {
        console.error("Erreur lors de la sauvegarde automatique:", err);
      }
    };

    // Debounce de 500ms pour éviter trop de requêtes
    const timer = setTimeout(saveChanges, 500);
    return () => clearTimeout(timer);
  }, [editedData, isEditing, detail?.id]);
  const ttc = detail?.montant_ttc ?? detail?.montant ?? null;
  const tva = detail?.tva ?? 0;
  const ht = typeof ttc === "number" ? Math.max(ttc - (typeof tva === "number" ? tva : 0), 0) : null;
  const handleValidate = async () => {
    if (!detail?.id) return;
    try {
      const {
        error
      } = await (supabase as any).from("recus").update({
        status: "traite"
      }).eq("id", detail.id);
      if (error) throw error;

      // Fermer le drawer après validation
      onOpenChange(false);
    } catch (err) {
      console.error("Erreur lors de la validation:", err);
    }
  };
  const handleCorrect = () => {
    setIsEditing(true);
  };
  const handleSave = async () => {
    if (!detail?.id) return;
    try {
      const {
        error
      } = await (supabase as any).from("recus").update({
        enseigne: editedData.enseigne,
        numero_recu: editedData.numero_recu,
        montant_ttc: editedData.montant_ttc,
        tva: editedData.tva,
        ville: editedData.ville,
        adresse: editedData.adresse,
        moyen_paiement: editedData.moyen_paiement,
        client_id: editedData.client_id || null,
        processed_by: editedData.processed_by || null
      }).eq("id", detail.id);
      if (error) throw error;
      setIsEditing(false);
      setActiveField(null);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
    }
  };
  const handleCancel = () => {
    setIsEditing(false);
    setActiveField(null);
    // Réinitialiser avec les valeurs actuelles du detail
    if (detail) {
      setEditedData({
        enseigne: detail?.enseigne ?? "",
        numero_recu: detail?.numero_recu ?? "",
        montant_ttc: detail?.montant_ttc ?? detail?.montant ?? 0,
        tva: detail?.tva ?? 0,
        ville: detail?.ville ?? "",
        adresse: detail?.adresse ?? "",
        moyen_paiement: detail?.moyen_paiement ?? "",
        client_id: detail?.client_id ?? "",
        processed_by: detail?.processed_by ?? ""
      });
    }
  };
  const desktopContent = <div className="relative flex h-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
      {loading ? <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Chargement…</p>
        </div> : error ? <div className="flex items-center justify-center h-full">
          <p className="text-destructive text-sm">{error}</p>
        </div> : detail ? <>
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 text-left">
                <div className="flex items-baseline gap-2">
                <input type="text" value={editedData.enseigne || "—"} onChange={e => isEditing && setEditedData({
                  ...editedData,
                  enseigne: e.target.value
                })} onFocus={() => setActiveField('enseigne')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-lg md:text-2xl font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
                </div>
                
              </div>
            </div>
          </SheetHeader>

          <div className="mt-4 md:mt-6 space-y-4 md:space-y-6">
            {/* Montant TTC */}
            <div className="w-full flex items-center justify-center">
              <div className="inline-block text-center">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant TTC :</p>
                {isEditing ? <div className="inline-flex items-baseline gap-0">
                    <input type="number" step="0.01" value={editedData.montant_ttc} onChange={e => setEditedData({
                  ...editedData,
                  montant_ttc: parseFloat(e.target.value) || 0
                })} onFocus={() => setActiveField('montant_ttc')} onBlur={() => setActiveField(null)} className={cn("text-2xl md:text-4xl font-bold text-center bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none", "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", "cursor-text border-b-2 border-primary")} style={{
                  letterSpacing: '-0.03em',
                  minWidth: '0',
                  width: 'auto'
                }} /><span className="text-2xl md:text-4xl font-bold leading-none inline-block flex-none -ml-[2px]">€</span>
                  </div> : <p className="text-2xl md:text-4xl font-bold whitespace-nowrap tabular-nums">
                    {formatCurrency(editedData.montant_ttc)}
                  </p>}
              </div>
            </div>

            {/* Cartes Montant HT / TVA */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <Card>
                <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant HT :</p>
                  <p className="text-lg md:text-2xl font-semibold whitespace-nowrap tabular-nums">
                    {formatCurrency(editedData.montant_ttc - editedData.tva)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">TVA :</p>
                  {isEditing ? <div className="inline-flex items-baseline gap-0">
                      <input type="number" step="0.01" value={editedData.tva} onChange={e => isEditing && setEditedData({
                    ...editedData,
                    tva: parseFloat(e.target.value) || 0
                  })} onFocus={() => setActiveField('tva')} onBlur={() => setActiveField(null)} className={cn("text-lg md:text-2xl font-semibold text-left bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none", "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", "cursor-text border-b border-primary")} style={{
                    letterSpacing: '-0.03em',
                    minWidth: '0',
                    width: 'auto'
                  }} /><span className="text-lg md:text-2xl font-semibold leading-none inline-block flex-none -ml-[2px]">€</span>
                    </div> : <p className="text-lg md:text-2xl font-semibold whitespace-nowrap tabular-nums">
                      {formatCurrency(editedData.tva)}
                    </p>}
                </CardContent>
              </Card>
            </div>

            {/* Informations détaillées */}
            <div className="space-y-2 md:space-y-4">
              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Date de traitement :</span>
                <span className="text-xs md:text-sm font-medium">
                  {formatDateTime(detail?.date_traitement ?? detail?.created_at)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Moyen de paiement :</span>
                <input type="text" value={editedData.moyen_paiement || "—"} onChange={e => isEditing && setEditedData({
                ...editedData,
                moyen_paiement: e.target.value
              })} onFocus={() => setActiveField('moyen_paiement')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-xs md:text-sm font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-right", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Ville :</span>
                <input type="text" value={editedData.ville || "—"} onChange={e => isEditing && setEditedData({
                ...editedData,
                ville: e.target.value
              })} onFocus={() => setActiveField('ville')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-xs md:text-sm font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-right", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Adresse :</span>
                <input type="text" value={editedData.adresse || "—"} onChange={e => isEditing && setEditedData({
                ...editedData,
                adresse: e.target.value
              })} onFocus={() => setActiveField('adresse')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-xs md:text-sm font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-right", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Traité par :</span>
                {isEditing ? <Select value={editedData.processed_by || "none"} onValueChange={value => setEditedData({
                ...editedData,
                processed_by: value === "none" ? "" : value
              })}>
                    <SelectTrigger className="w-[180px] h-8 text-xs md:text-sm">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {members.map(member => <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select> : <span className="text-xs md:text-sm font-medium">{detail?._processedByName ?? "—"}</span>}
              </div>

              <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                <span className="text-xs md:text-sm text-muted-foreground">Client assigné :</span>
                {isEditing ? <Select value={editedData.client_id || "none"} onValueChange={value => setEditedData({
                ...editedData,
                client_id: value === "none" ? "" : value
              })}>
                    <SelectTrigger className="w-[180px] h-8 text-xs md:text-sm">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {clients.map(client => <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select> : <span className="text-xs md:text-sm font-medium">{detail?._clientName ?? "—"}</span>}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="space-y-3 pt-4 md:pt-6">
              {isEditing ? <div className="flex gap-3">
                  <Button variant="default" className="flex-1 h-10" onClick={handleSave}>
                    Enregistrer
                  </Button>
                  <Button variant="outline" className="flex-1 h-10" onClick={handleCancel}>
                    Annuler
                  </Button>
                </div> : <>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-10" onClick={handleValidate}>
                      Valider
                    </Button>
                    <Button variant="outline" className="flex-1 h-10" onClick={handleCorrect}>
                      Corriger
                    </Button>
                  </div>
                  <Button variant="outline" className="w-full h-10" disabled={!detail?.analysis_report_url} onClick={() => {
                if (detail?.analysis_report_url) {
                  window.open(detail.analysis_report_url, "_blank");
                }
              }}>
                    Consulter le rapport d'analyse
                  </Button>
                </>}
            </div>
          </div>
        </> : null}
      </div>
      
      {/* Indicateur visuel d'édition active */}
      {isEditing && activeField && <div className="w-20 md:w-24 bg-[hsl(222,47%,30%)] flex items-center justify-center border-l-4 border-[hsl(222,47%,20%)] shadow-lg">
          <div className="text-center px-2">
            <div className="text-sm md:text-base font-bold text-white mb-1">
              ✏️
            </div>
            <div className="text-[10px] md:text-xs font-semibold text-white/90 leading-tight">
              {activeField === 'montant_ttc' && 'Montant TTC'}
              {activeField === 'tva' && 'TVA'}
              {activeField === 'moyen_paiement' && 'Paiement'}
              {activeField === 'ville' && 'Ville'}
              {activeField === 'adresse' && 'Adresse'}
              {activeField === 'enseigne' && 'Enseigne'}
              {activeField === 'numero_recu' && 'N° reçu'}
            </div>
          </div>
        </div>}
    </div>;
  const mobileContent = loading ? <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Chargement…</p>
    </div> : error ? <div className="flex items-center justify-center h-full">
      <p className="text-destructive text-sm">{error}</p>
    </div> : detail ? <>
      {/* Header fixe */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1 text-left">
            <div className="flex items-baseline gap-2">
               <input type="text" value={editedData.enseigne || "—"} onChange={e => isEditing && setEditedData({
              ...editedData,
              enseigne: e.target.value
            })} onFocus={() => setActiveField('enseigne')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-lg font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reçu n°{" "}
               <input type="text" value={editedData.numero_recu || "—"} onChange={e => isEditing && setEditedData({
              ...editedData,
              numero_recu: e.target.value
            })} onFocus={() => setActiveField('numero_recu')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-xs", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
           {/* Montant TTC */}
           <div className="w-full flex items-center justify-center">
             <div className="inline-block text-center">
               <p className="text-xs text-muted-foreground mb-1">Montant TTC :</p>
               {isEditing ? <div className="inline-flex items-baseline gap-0">
                   <input type="number" step="0.01" value={editedData.montant_ttc} onChange={e => setEditedData({
                ...editedData,
                montant_ttc: parseFloat(e.target.value) || 0
              })} onFocus={() => setActiveField('montant_ttc')} onBlur={() => setActiveField(null)} className={cn("text-2xl font-bold text-center bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none", "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", "cursor-text border-b-2 border-primary")} style={{
                letterSpacing: '-0.03em',
                minWidth: '0',
                width: 'auto'
              }} /><span className="text-2xl font-bold leading-none inline-block flex-none -ml-[2px]">€</span>
                 </div> : <p className="text-2xl font-bold">
                   {editedData.montant_ttc.toFixed(2)}€
                 </p>}
             </div>
           </div>

          {/* Cartes Montant HT / TVA */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Montant HT :</p>
                <p className="text-lg font-semibold">
                  {(editedData.montant_ttc - editedData.tva).toFixed(2)}€
                </p>
              </CardContent>
            </Card>
             <Card>
               <CardContent className="pt-4 pb-3">
                 <p className="text-xs text-muted-foreground mb-1">TVA :</p>
                 {isEditing ? <div className="inline-flex items-baseline gap-0">
                     <input type="number" step="0.01" value={editedData.tva} onChange={e => setEditedData({
                  ...editedData,
                  tva: parseFloat(e.target.value) || 0
                })} onFocus={() => setActiveField('tva')} onBlur={() => setActiveField(null)} className={cn("text-lg font-semibold text-left bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none", "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", "cursor-text border-b border-primary")} style={{
                  letterSpacing: '-0.03em',
                  minWidth: '0',
                  width: 'auto'
                }} /><span className="text-lg font-semibold leading-none inline-block flex-none -ml-[2px]">€</span>
                   </div> : <p className="text-lg font-semibold">
                     {editedData.tva.toFixed(2)}€
                   </p>}
               </CardContent>
             </Card>
          </div>

          {/* Informations détaillées */}
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-muted-foreground">Date de traitement :</span>
              <span className="text-xs font-medium">
                {formatDateTime(detail?.date_traitement ?? detail?.created_at)}
              </span>
            </div>

             <div className="flex justify-between items-center py-1.5 border-b border-border">
               <span className="text-xs text-muted-foreground">Moyen de paiement :</span>
               <input type="text" value={editedData.moyen_paiement || "—"} onChange={e => isEditing && setEditedData({
              ...editedData,
              moyen_paiement: e.target.value
            })} onFocus={() => setActiveField('moyen_paiement')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-xs font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-right", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
             </div>

             <div className="flex justify-between items-center py-1.5 border-b border-border">
               <span className="text-xs text-muted-foreground">Ville :</span>
               <input type="text" value={editedData.ville || "—"} onChange={e => isEditing && setEditedData({
              ...editedData,
              ville: e.target.value
            })} onFocus={() => setActiveField('ville')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-xs font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-right", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
             </div>

             <div className="flex justify-between items-center py-1.5 border-b border-border">
               <span className="text-xs text-muted-foreground">Adresse :</span>
               <input type="text" value={editedData.adresse || "—"} onChange={e => isEditing && setEditedData({
              ...editedData,
              adresse: e.target.value
            })} onFocus={() => setActiveField('adresse')} onBlur={() => setActiveField(null)} disabled={!isEditing} className={cn("text-xs font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-right", isEditing ? "cursor-text border-b border-primary" : "cursor-default")} />
             </div>

            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-muted-foreground">Traité par :</span>
              {isEditing ? <Select value={editedData.processed_by || "none"} onValueChange={value => setEditedData({
              ...editedData,
              processed_by: value === "none" ? "" : value
            })}>
                  <SelectTrigger className="w-[140px] h-7 text-xs">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {members.map(member => <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select> : <span className="text-xs font-medium">{detail?._processedByName ?? "—"}</span>}
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-xs text-muted-foreground">Client assigné :</span>
              {isEditing ? <Select value={editedData.client_id || "none"} onValueChange={value => setEditedData({
              ...editedData,
              client_id: value === "none" ? "" : value
            })}>
                  <SelectTrigger className="w-[140px] h-7 text-xs">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {clients.map(client => <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select> : <span className="text-xs font-medium">{detail?._clientName ?? "—"}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Footer fixe */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card/95">
        {isEditing ? <div className="flex gap-3">
            <Button variant="default" className="flex-1 h-10" onClick={handleSave}>
              Enregistrer
            </Button>
            <Button variant="outline" className="flex-1 h-10" onClick={handleCancel}>
              Annuler
            </Button>
          </div> : <div className="space-y-2">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10" onClick={handleValidate}>
                Valider
              </Button>
              <Button variant="outline" className="flex-1 h-10" onClick={handleCorrect}>
                Corriger
              </Button>
            </div>
            <Button variant="outline" className="w-full h-10" disabled={!detail?.analysis_report_url} onClick={() => {
          if (detail?.analysis_report_url) {
            window.open(detail.analysis_report_url, "_blank");
          }
        }}>
              Consulter le rapport d'analyse
            </Button>
          </div>}
      </div>
    </> : null;

  // Mobile: Drawer flottant
  if (isMobile) {
    return <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="
            mx-4 mb-8 h-[75vh] rounded-2xl 
            bg-card/95 backdrop-blur-lg 
            shadow-[0_10px_40px_rgba(0,0,0,0.4)]
            border border-border/50
            flex flex-col overflow-hidden
          ">
          {mobileContent}
        </DrawerContent>
      </Drawer>;
  }

  // Desktop: Sheet à droite
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="h-full w-full max-w-[520px] bg-card border-l border-border overflow-y-auto p-0">
        {desktopContent}
      </SheetContent>
    </Sheet>;
};