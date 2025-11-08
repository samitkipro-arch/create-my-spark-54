// ReceiptDetailDrawer.tsx
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
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
  clients?: Array<{ id: string; name: string }>;
  members?: Array<{ id: string; name: string }>;
  onValidated?: (id: number) => void;
}

export const ReceiptDetailDrawer = ({
  open,
  onOpenChange,
  detail,
  loading,
  error,
  clients = [],
  members = [],
  onValidated,
}: ReceiptDetailDrawerProps) => {
  const isMobile = useIsMobile();

  const [isEditing, setIsEditing] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  // Rapport n8n
  const N8N_REPORT_URL =
    (import.meta as any).env?.VITE_N8N_REPORT_URL ?? "https://samilzr.app.n8n.cloud/webhook/rapport%20d%27analyse";

  const openReport = async () => {
    if (!detail?.id) return;
    const win = window.open("", "_blank");
    if (!win) {
      alert("Autorisez les pop-ups pour afficher le rapport.");
      return;
    }
    win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"/><title>Rapport d’analyse…</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/><style>
html,body{margin:0;padding:0;background:#fff;color:#111;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif}
.wrap{max-width:760px;margin:56px auto;padding:0 20px;text-align:center}
.spinner{width:32px;height:32px;border-radius:50%;border:3px solid #ddd;border-top-color:#111;animation:spin .8s linear infinite;margin:16px auto}
@keyframes spin{to{transform:rotate(360deg)}}
</style></head><body><div class="wrap"><h1>Génération du rapport…</h1><div class="spinner"></div><p>Merci de patienter.</p></div></body></html>`);
    try {
      const res = await fetch(N8N_REPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_id: detail.id }),
      });
      const contentType = res.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await res.json() : await res.text();
      const html = typeof payload === "string" ? payload : (payload?.html ?? "");
      if (!html) throw new Error("Rapport vide");
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e) {
      console.error("Erreur ouverture rapport:", e);
      win.close();
      alert("Erreur lors de l’ouverture du rapport.");
    }
  };

  // --- Edition
  const [editedData, setEditedData] = useState({
    enseigne: "",
    numero_recu: "",
    montant_ttc: 0,
    tva: 0,
    ville: "",
    adresse: "",
    moyen_paiement: "",
    categorie: "",
    client_id: "",
    processed_by: "",
  });

  /**
   * ================== MEMBRES (100% ORG-SCOPÉ) ==================
   * On tente dans l'ordre :
   * 1) `members` passés par le parent (déjà chargés ailleurs)
   * 2) lecture directe dans `profiles` filtré par `org_id` (le plus fiable si votre table a org_id)
   * 3) fallback via `org_members` -> ids -> `profiles`
   * 4) dernier recours: essai générique (peut être bloqué par RLS)
   */
  const [orgScopedMembers, setOrgScopedMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [fallbackMembers, setFallbackMembers] = useState<Array<{ id: string; name: string }>>([]);

  // 2) Essai direct: profiles par org_id (prend l'ID utilisable pour processed_by: user_id si présent, sinon id)
  useEffect(() => {
    const loadProfilesByOrg = async () => {
      if (!open) return;
      const orgId = detail?.org_id;
      if (!orgId) {
        setOrgScopedMembers([]);
        return;
      }
      try {
        const { data: profs, error } = await (supabase as any)
          .from("profiles")
          .select("user_id, id, first_name, last_name, org_id")
          .eq("org_id", orgId);

        if (error) {
          console.warn("[Drawer] profiles by org_id error:", error);
          setOrgScopedMembers([]);
          return;
        }

        if (profs && profs.length > 0) {
          setOrgScopedMembers(
            profs.map((p: any) => ({
              // on privilégie user_id pour rester compatible avec processed_by existant
              id: (p.user_id ?? p.id) as string,
              name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Membre sans nom",
            })),
          );
          return;
        }

        // 3) Fallback via org_members -> profiles si profiles.org_id n'existe pas / est vide
        const { data: orgMembers, error: e1 } = await (supabase as any)
          .from("org_members")
          .select("user_id")
          .eq("org_id", orgId);

        if (e1 || !orgMembers?.length) {
          setOrgScopedMembers([]);
          return;
        }

        const userIds = orgMembers.map((m: any) => m.user_id);
        const { data: profs2, error: e2 } = await (supabase as any)
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", userIds);

        if (e2 || !profs2?.length) {
          setOrgScopedMembers([]);
          return;
        }

        setOrgScopedMembers(
          profs2.map((p: any) => ({
            id: p.user_id as string,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Membre sans nom",
          })),
        );
      } catch (e) {
        console.error("[Drawer] loadProfilesByOrg fatal:", e);
        setOrgScopedMembers([]);
      }
    };
    loadProfilesByOrg();
  }, [open, detail?.org_id]);

  // 4) Dernier recours générique (si ni props ni orgScoped n'ont rendu quelque chose)
  useEffect(() => {
    const loadGeneric = async () => {
      if ((members && members.length) || (orgScopedMembers && orgScopedMembers.length)) {
        setFallbackMembers([]);
        return;
      }
      try {
        const { data: orgMembers, error: omError } = await (supabase as any).from("org_members").select("user_id");
        if (omError || !orgMembers?.length) return;

        const userIds = orgMembers.map((m: any) => m.user_id);
        const { data: profiles, error: pError } = await (supabase as any)
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", userIds);
        if (pError || !profiles) return;

        setFallbackMembers(
          profiles.map((p: any) => ({
            id: p.user_id,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Membre sans nom",
          })),
        );
      } catch (e) {
        console.error("[Drawer] loadGeneric error:", e);
        setFallbackMembers([]);
      }
    };
    loadGeneric();
  }, [members, orgScopedMembers]);

  const effectiveMembers =
    (members && members.length > 0 && members) ||
    (orgScopedMembers && orgScopedMembers.length > 0 && orgScopedMembers) ||
    fallbackMembers;

  // Sync editedData
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
        categorie: detail?.categorie ?? "",
        client_id: detail?.client_id ?? "",
        processed_by: detail?.processed_by ?? "",
      });
    }
  }, [detail]);

  // Autosave
  useEffect(() => {
    if (!isEditing || !detail?.id) return;
    const t = setTimeout(async () => {
      try {
        await (supabase as any)
          .from("recus")
          .update({
            enseigne: editedData.enseigne,
            numero_recu: editedData.numero_recu,
            montant_ttc: editedData.montant_ttc,
            tva: editedData.tva,
            ville: editedData.ville,
            adresse: editedData.adresse,
            moyen_paiement: editedData.moyen_paiement,
            categorie: editedData.categorie,
            client_id: editedData.client_id || null,
            processed_by: editedData.processed_by || null,
          })
          .eq("id", detail.id);
      } catch (err) {
        console.error("Autosave error:", err);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [editedData, isEditing, detail?.id]);

  const handleValidate = async () => {
    if (!detail?.id) return;
    try {
      onValidated?.(detail.id);
      const { error } = await (supabase as any).from("recus").update({ status: "traite" }).eq("id", detail.id);
      if (error) throw error;
      onOpenChange(false);
    } catch (err) {
      console.error("Erreur lors de la validation:", err);
    }
  };

  const handleCorrect = () => setIsEditing(true);

  const handleSave = async () => {
    if (!detail?.id) return;
    try {
      const { error } = await (supabase as any)
        .from("recus")
        .update({
          enseigne: editedData.enseigne,
          numero_recu: editedData.numero_recu,
          montant_ttc: editedData.montant_ttc,
          tva: editedData.tva,
          ville: editedData.ville,
          adresse: editedData.adresse,
          moyen_paiement: editedData.moyen_paiement,
          categorie: editedData.categorie,
          client_id: editedData.client_id || null,
          processed_by: editedData.processed_by || null,
        })
        .eq("id", detail.id);
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
    if (detail) {
      setEditedData({
        enseigne: detail?.enseigne ?? "",
        numero_recu: detail?.numero_recu ?? "",
        montant_ttc: detail?.montant_ttc ?? detail?.montant ?? 0,
        tva: detail?.tva ?? 0,
        ville: detail?.ville ?? "",
        adresse: detail?.adresse ?? "",
        moyen_paiement: detail?.moyen_paiement ?? "",
        categorie: detail?.categorie ?? "",
        client_id: detail?.client_id ?? "",
        processed_by: detail?.processed_by ?? "",
      });
    }
  };

  // ---------- UI ----------
  const desktopContent = (
    <div className="relative flex h-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
                <div className="flex-1 text-left">
                  <div className="flex items-baseline gap-2">
                    <input
                      type="text"
                      value={editedData.enseigne || "—"}
                      onChange={(e) => isEditing && setEditedData({ ...editedData, enseigne: e.target.value })}
                      onFocus={() => setActiveField("enseigne")}
                      onBlur={() => setActiveField(null)}
                      disabled={!isEditing}
                      className={cn(
                        "text-lg md:text-2xl font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0",
                        isEditing ? "cursor-text border-b border-primary" : "cursor-default",
                      )}
                    />
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-4 md:mt-6 space-y-4 md:space-y-6">
              {/* Montant TTC */}
              <div className="w-full flex items-center justify-center">
                <div className="inline-block text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant TTC :</p>
                  {isEditing ? (
                    <div className="inline-flex items-baseline gap-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editedData.montant_ttc}
                        onChange={(e) => setEditedData({ ...editedData, montant_ttc: parseFloat(e.target.value) || 0 })}
                        onFocus={() => setActiveField("montant_ttc")}
                        onBlur={() => setActiveField(null)}
                        className={cn(
                          "text-2xl md:text-4xl font-bold text-center bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none",
                          "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          "cursor-text border-b-2 border-primary",
                        )}
                        style={{ letterSpacing: "-0.03em", minWidth: "0", width: "auto" }}
                      />
                    </div>
                  ) : (
                    <p className="text-2xl md:text-4xl font-bold whitespace-nowrap tabular-nums">
                      {formatCurrency(editedData.montant_ttc)}
                    </p>
                  )}
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
                    {isEditing ? (
                      <div className="inline-flex items-baseline gap-0">
                        <input
                          type="number"
                          step="0.01"
                          value={editedData.tva}
                          onChange={(e) => setEditedData({ ...editedData, tva: parseFloat(e.target.value) || 0 })}
                          onFocus={() => setActiveField("tva")}
                          onBlur={() => setActiveField(null)}
                          className={cn(
                            "text-lg md:text-2xl font-semibold text-left bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none",
                            "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            "cursor-text border-b border-primary",
                          )}
                          style={{ letterSpacing: "-0.03em", minWidth: "0", width: "auto" }}
                        />
                        <span className="text-lg md:text-2xl font-semibold leading-none inline-block flex-none -ml-[2px]">
                          €
                        </span>
                      </div>
                    ) : (
                      <p className="text-lg md:text-2xl font-semibold whitespace-nowrap tabular-nums">
                        {formatCurrency(editedData.tva)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Infos détaillées */}
              <div className="space-y-2 md:space-y-4">
                <Row label="Date de traitement">
                  <span className="text-xs md:text-sm font-medium">
                    {formatDateTime(detail?.date_traitement ?? detail?.created_at)}
                  </span>
                </Row>

                <EditableInput
                  label="Moyen de paiement"
                  field="moyen_paiement"
                  isEditing={isEditing}
                  value={editedData.moyen_paiement}
                  onChange={(v) => setEditedData({ ...editedData, moyen_paiement: v })}
                  setActiveField={setActiveField}
                />
                <EditableInput
                  label="Ville"
                  field="ville"
                  isEditing={isEditing}
                  value={editedData.ville}
                  onChange={(v) => setEditedData({ ...editedData, ville: v })}
                  setActiveField={setActiveField}
                />
                <EditableInput
                  label="Adresse"
                  field="adresse"
                  isEditing={isEditing}
                  value={editedData.adresse}
                  onChange={(v) => setEditedData({ ...editedData, adresse: v })}
                  setActiveField={setActiveField}
                />
                <EditableInput
                  label="Catégorie"
                  field="categorie"
                  isEditing={isEditing}
                  value={editedData.categorie}
                  onChange={(v) => setEditedData({ ...editedData, categorie: v })}
                  setActiveField={setActiveField}
                />

                {/* Traité par */}
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Traité par :</span>
                  {isEditing ? (
                    <Select
                      value={editedData.processed_by || "none"}
                      onValueChange={(value) =>
                        setEditedData({ ...editedData, processed_by: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs md:text-sm">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999] max-h-64 overflow-auto">
                        <SelectItem value="none">Aucun</SelectItem>
                        {effectiveMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs md:text-sm font-medium">{detail?._processedByName ?? "—"}</span>
                  )}
                </div>

                {/* Client assigné */}
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Client assigné :</span>
                  {isEditing ? (
                    <Select
                      value={editedData.client_id || "none"}
                      onValueChange={(value) =>
                        setEditedData({ ...editedData, client_id: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs md:text-sm">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999] max-h-64 overflow-auto">
                        <SelectItem value="none">Aucun</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs md:text-sm font-medium">{detail?._clientName ?? "—"}</span>
                  )}
                </div>
              </div>

              {/* Boutons */}
              <div className="space-y-3 pt-4 md:pt-6">
                {isEditing ? (
                  <div className="flex gap-3">
                    <Button variant="default" className="flex-1 h-10" onClick={handleSave}>
                      Enregistrer
                    </Button>
                    <Button variant="outline" className="flex-1 h-10" onClick={handleCancel}>
                      Annuler
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 h-10" onClick={handleValidate}>
                        Valider
                      </Button>
                      <Button variant="outline" className="flex-1 h-10" onClick={handleCorrect}>
                        Corriger
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full h-10" disabled={!detail?.id} onClick={openReport}>
                      Consulter le rapport d'analyse
                    </Button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  // Mobile
  const mobileContent = loading ? (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground">Chargement…</p>
    </div>
  ) : error ? (
    <div className="flex items-center justify-center h-full">
      <p className="text-destructive text-sm">{error}</p>
    </div>
  ) : detail ? (
    <>
      {/* Header fixe */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1 text-left">
            <div className="flex items-baseline gap-2">
              <input
                type="text"
                value={editedData.enseigne || "—"}
                onChange={(e) => isEditing && setEditedData({ ...editedData, enseigne: e.target.value })}
                onFocus={() => setActiveField("enseigne")}
                onBlur={() => setActiveField(null)}
                disabled={!isEditing}
                className={cn(
                  "text-lg font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0",
                  isEditing ? "cursor-text border-b border-primary" : "cursor-default",
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reçu n°{" "}
              <input
                type="text"
                value={editedData.numero_recu || "—"}
                onChange={(e) => isEditing && setEditedData({ ...editedData, numero_recu: e.target.value })}
                onFocus={() => setActiveField("numero_recu")}
                onBlur={() => setActiveField(null)}
                disabled={!isEditing}
                className={cn(
                  "bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-xs",
                  isEditing ? "cursor-text border-b border-primary" : "cursor-default",
                )}
              />
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
              {isEditing ? (
                <div className="inline-flex items-baseline gap-0">
                  <input
                    type="number"
                    step="0.01"
                    value={editedData.montant_ttc}
                    onChange={(e) => setEditedData({ ...editedData, montant_ttc: parseFloat(e.target.value) || 0 })}
                    onFocus={() => setActiveField("montant_ttc")}
                    onBlur={() => setActiveField(null)}
                    className={cn(
                      "text-2xl font-bold text-center bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none",
                      "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      "cursor-text border-b-2 border-primary",
                    )}
                    style={{ letterSpacing: "-0.03em", minWidth: "0", width: "auto" }}
                  />
                  <span className="text-2xl font-bold leading-none inline-block flex-none -ml-[2px]">€</span>
                </div>
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(editedData.montant_ttc)}</p>
              )}
            </div>
          </div>

          {/* Cartes Montant HT / TVA */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Montant HT :</p>
                <p className="text-lg font-semibold">{formatCurrency(editedData.montant_ttc - editedData.tva)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">TVA :</p>
                {isEditing ? (
                  <div className="inline-flex items-baseline gap-0">
                    <input
                      type="number"
                      step="0.01"
                      value={editedData.tva}
                      onChange={(e) => setEditedData({ ...editedData, tva: parseFloat(e.target.value) || 0 })}
                      onFocus={() => setActiveField("tva")}
                      onBlur={() => setActiveField(null)}
                      className={cn(
                        "text-lg font-semibold text-left bg-transparent border-none inline-block flex-none shrink-0 basis-auto w-auto max-w-fit p-0 pr-0 m-0 mr-0 focus:outline-none leading-none tracking-tight appearance-none",
                        "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        "cursor-text border-b border-primary",
                      )}
                      style={{ letterSpacing: "-0.03em", minWidth: "0", width: "auto" }}
                    />
                    <span className="text-lg font-semibold leading-none inline-block flex-none -ml-[2px]">€</span>
                  </div>
                ) : (
                  <p className="text-lg font-semibold">{formatCurrency(editedData.tva)}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Infos détaillées */}
          <div className="space-y-2">
            <RowMobile label="Date de traitement">
              <span className="text-xs font-medium">
                {formatDateTime(detail?.date_traitement ?? detail?.created_at)}
              </span>
            </RowMobile>

            <EditableInputMobile
              label="Moyen de paiement"
              field="moyen_paiement"
              isEditing={isEditing}
              value={editedData.moyen_paiement}
              onChange={(v: string) => setEditedData({ ...editedData, moyen_paiement: v })}
              setActiveField={setActiveField}
            />
            <EditableInputMobile
              label="Ville"
              field="ville"
              isEditing={isEditing}
              value={editedData.ville}
              onChange={(v: string) => setEditedData({ ...editedData, ville: v })}
              setActiveField={setActiveField}
            />
            <EditableInputMobile
              label="Adresse"
              field="adresse"
              isEditing={isEditing}
              value={editedData.adresse}
              onChange={(v: string) => setEditedData({ ...editedData, adresse: v })}
              setActiveField={setActiveField}
            />
            <EditableInputMobile
              label="Catégorie"
              field="categorie"
              isEditing={isEditing}
              value={editedData.categorie}
              onChange={(v: string) => setEditedData({ ...editedData, categorie: v })}
              setActiveField={setActiveField}
            />

            {/* Traité par */}
            <RowMobile label="Traité par">
              {isEditing ? (
                <Select
                  value={editedData.processed_by || "none"}
                  onValueChange={(value) =>
                    setEditedData({ ...editedData, processed_by: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger className="w-[140px] h-7 text-xs">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999] max-h-64 overflow-auto">
                    <SelectItem value="none">Aucun</SelectItem>
                    {effectiveMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium">{detail?._processedByName ?? "—"}</span>
              )}
            </RowMobile>

            {/* Client assigné */}
            <RowMobile label="Client assigné">
              {isEditing ? (
                <Select
                  value={editedData.client_id || "none"}
                  onValueChange={(value) => setEditedData({ ...editedData, client_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-[140px] h-7 text-xs">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999] max-h-64 overflow-auto">
                    <SelectItem value="none">Aucun</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs font-medium">{detail?._clientName ?? "—"}</span>
              )}
            </RowMobile>
          </div>
        </div>
      </div>

      {/* Footer fixe */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card/95">
        {isEditing ? (
          <div className="flex gap-3">
            <Button variant="default" className="flex-1 h-10" onClick={handleSave}>
              Enregistrer
            </Button>
            <Button variant="outline" className="flex-1 h-10" onClick={handleCancel}>
              Annuler
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-10" onClick={handleValidate}>
                Valider
              </Button>
              <Button variant="outline" className="flex-1 h-10" onClick={handleCorrect}>
                Corriger
              </Button>
            </div>

            <Button variant="outline" className="w-full h-10" disabled={!detail?.id} onClick={openReport}>
              Consulter le rapport d'analyse
            </Button>
          </div>
        )}
      </div>
    </>
  ) : null;

  // Helpers
  function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
        <span className="text-xs md:text-sm text-muted-foreground">{label} :</span>
        {children}
      </div>
    );
  }
  function RowMobile({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="flex justify-between items-center py-1.5 border-b border-border">
        <span className="text-xs text-muted-foreground">{label} :</span>
        {children}
      </div>
    );
  }
  function EditableInput({
    label,
    field,
    value,
    onChange,
    isEditing,
    setActiveField,
  }: {
    label: string;
    field: string;
    value: string;
    onChange: (v: string) => void;
    isEditing: boolean;
    setActiveField: (f: string | null) => void;
  }) {
    return (
      <Row label={label}>
        <input
          type="text"
          value={value || "—"}
          onChange={(e) => isEditing && onChange(e.target.value)}
          onFocus={() => setActiveField(field)}
          onBlur={() => setActiveField(null)}
          disabled={!isEditing}
          className={cn(
            "text-xs md:text-sm font-medium bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-right",
            isEditing ? "cursor-text border-b border-primary" : "cursor-default",
          )}
        />
      </Row>
    );
  }
  function EditableInputMobile(props: any) {
    return <EditableInput {...props} />;
  }

  // Rendu
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="mx-4 mb-8 h-[75vh] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50 flex flex-col overflow-hidden">
          {mobileContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="h-full w-full max-w-[520px] bg-card border-l border-border overflow-y-auto p-0"
      >
        {desktopContent}
      </SheetContent>
    </Sheet>
  );
};
