import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

type Member = { id: string; name: string };

// --- helpers ---
const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

/**
 * Infère le taux de TVA à partir des valeurs actuelles du reçu.
 * Si impossible, fallback à 20% (0.2).
 */
function inferVatRate(detail: any): number {
  const ht = Number(detail?.montant_ht) || 0;
  const tva = Number(detail?.tva) || 0;
  if (ht > 0 && tva >= 0) {
    const r = tva / ht;
    if (Number.isFinite(r) && r >= 0 && r <= 1) return r; // protège contre des valeurs aberrantes
  }
  return 0.2;
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

  // Taux de TVA utilisé pour recalculer automatiquement TVA & HT pendant l'édition
  const [vatRate, setVatRate] = useState<number>(0.2);

  const N8N_REPORT_URL =
    (import.meta as any).env?.VITE_N8N_REPORT_URL ?? "https://samilzr.app.n8n.cloud/webhook/rapport%20d%27analyse";

  // ----------------- Edition -----------------
  const [editedData, setEditedData] = useState({
    enseigne: "",
    numero_recu: "",
    montant_ttc: 0,
    tva: 0, // TVA est calculée automatiquement à partir du TTC + vatRate
    ville: "",
    adresse: "",
    moyen_paiement: "",
    categorie: "",
    client_id: "",
    processed_by: "",
  });

  // ---------- MEMBRES: chargement scopé org + temps réel ----------
  const [orgMembers, setOrgMembers] = useState<Member[]>([]);
  const [membersError, setMembersError] = useState<string>("");
  const currentOrgIdRef = useRef<string | null>(null);

  const loadOrgMembers = async (orgId: string) => {
    setMembersError("");
    try {
      const { data, error } = await (supabase as any).rpc("get_org_members", { p_org_id: orgId });
      if (error) {
        console.error("❌ RPC get_org_members error:", error);
        setMembersError("Erreur de chargement des membres.");
        setOrgMembers([]);
        return;
      }
      const loaded = ((data as any[]) || []).map((r: any) => ({
        id: r.user_id as string,
        name: r.name as string,
      }));
      setOrgMembers(loaded);
      if (loaded.length === 0) {
        setMembersError("Aucun membre dans cette organisation.");
      }
    } catch (err) {
      console.error("❌ loadOrgMembers exception:", err);
      setMembersError("Erreur de chargement des membres.");
      setOrgMembers([]);
    }
  };

  // Charger les membres quand le drawer s'ouvre ou que l'org change
  useEffect(() => {
    if (!open) {
      setOrgMembers([]);
      setMembersError("");
      currentOrgIdRef.current = null;
      return;
    }

    if (members && members.length > 0) {
      setOrgMembers([]);
      setMembersError("");
      return;
    }

    const orgId = detail?.org_id as string | undefined;
    if (!orgId) {
      setOrgMembers([]);
      setMembersError("Aucune organisation associée.");
      currentOrgIdRef.current = null;
      return;
    }

    if (currentOrgIdRef.current !== orgId) {
      setOrgMembers([]);
      setMembersError("");
      loadOrgMembers(orgId);
      currentOrgIdRef.current = orgId;
    }
  }, [open, detail?.org_id, members]);

  // TEMPS RÉEL: membres + profils
  useEffect(() => {
    if (!open) return;
    const orgId = detail?.org_id as string | undefined;
    if (!orgId || (members && members.length > 0)) return;

    const channelName = `receipt-drawer-members-${orgId}`;
    const channel = (supabase as any)
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "org_members", filter: `org_id=eq.${orgId}` },
        async (payload: any) => {
          const newUserId = payload.new?.user_id;
          if (!newUserId) return;

          const { data: prof } = await (supabase as any)
            .from("profiles")
            .select("user_id, first_name, last_name")
            .eq("user_id", newUserId)
            .maybeSingle();

          const newMember: Member = {
            id: newUserId,
            name: prof
              ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || "Membre sans nom"
              : "Membre sans nom",
          };

          setOrgMembers((prev) => {
            if (prev.some((m) => m.id === newUserId)) return prev;
            return [...prev, newMember].sort((a, b) => a.name.localeCompare(b.name));
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "org_members", filter: `org_id=eq.${orgId}` },
        (payload: any) => {
          const deletedUserId = payload.old?.user_id;
          if (!deletedUserId) return;
          setOrgMembers((prev) => prev.filter((m) => m.id !== deletedUserId));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "org_members", filter: `org_id=eq.${orgId}` },
        () => {
          if (currentOrgIdRef.current) {
            loadOrgMembers(currentOrgIdRef.current);
          }
        },
      )
      .subscribe();

    const profilesChannel = (supabase as any)
      .channel(`receipt-drawer-profiles-${orgId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload: any) => {
        const updatedUserId = payload.new?.user_id;
        if (!updatedUserId) return;

        setOrgMembers((prev) => {
          const exists = prev.find((m) => m.id === updatedUserId);
          if (!exists) return prev;
          const newName =
            `${payload.new?.first_name || ""} ${payload.new?.last_name || ""}`.trim() || "Membre sans nom";
          return prev
            .map((m) => (m.id === updatedUserId ? { ...m, name: newName } : m))
            .sort((a, b) => a.name.localeCompare(b.name));
        });
      })
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
      (supabase as any).removeChannel(profilesChannel);
    };
  }, [open, detail?.org_id, members]);

  const effectiveMembers: Member[] = members && members.length > 0 ? members : orgMembers;

  // ----------------- Sync & TVA auto -----------------
  // Quand on charge un reçu, on synchronise les champs et on infère le taux de TVA.
  useEffect(() => {
    if (detail) {
      const rate = inferVatRate(detail);
      setVatRate(rate);

      setEditedData({
        enseigne: detail?.enseigne ?? "",
        numero_recu: detail?.numero_recu ?? "",
        montant_ttc: detail?.montant_ttc ?? detail?.montant ?? 0,
        tva: Number.isFinite(detail?.tva)
          ? Number(detail.tva)
          : round2((Number(detail?.montant_ttc) || 0) - (Number(detail?.montant_ht) || 0)),
        ville: detail?.ville ?? "",
        adresse: detail?.adresse ?? "",
        moyen_paiement: detail?.moyen_paiement ?? "",
        categorie: detail?.categorie ?? "",
        client_id: detail?.client_id ?? "",
        processed_by: detail?.processed_by ?? "",
      });
    }
  }, [detail]);

  // TVA suit TTC en temps réel pendant l’édition (TVA non éditable)
  useEffect(() => {
    if (!isEditing) return;
    setEditedData((prev) => {
      const ttc = Number(prev.montant_ttc) || 0;
      const ht = ttc / (1 + vatRate);
      const newTva = ttc - ht; // évite les erreurs d’arrondi croisés
      if (round2(newTva) === round2(prev.tva)) return prev;
      return { ...prev, tva: round2(newTva) };
    });
  }, [editedData.montant_ttc, vatRate, isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

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
            tva: editedData.tva, // TVA recalculée sauvegardée
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
      const { error: e } = await (supabase as any).from("recus").update({ status: "traite" }).eq("id", detail.id);
      if (e) throw e;
      onOpenChange(false);
    } catch (err) {
      console.error("Erreur lors de la validation:", err);
    }
  };

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

  const handleSave = async () => {
    if (!detail?.id) return;
    try {
      const { error: e } = await (supabase as any)
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
      if (e) throw e;
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
      // Reset aux valeurs serveur
      const rate = inferVatRate(detail);
      setVatRate(rate);
      setEditedData({
        enseigne: detail?.enseigne ?? "",
        numero_recu: detail?.numero_recu ?? "",
        montant_ttc: detail?.montant_ttc ?? detail?.montant ?? 0,
        tva: Number.isFinite(detail?.tva)
          ? Number(detail.tva)
          : round2((Number(detail?.montant_ttc) || 0) - (Number(detail?.montant_ht) || 0)),
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
  const MembersSelectNote =
    effectiveMembers.length === 0 && membersError ? (
      <div className="text-[10px] md:text-xs text-amber-500 mt-1 text-right">{membersError}</div>
    ) : null;

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
  const EditableInputMobile = (props: any) => <EditableInput {...props} />;

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
              {/* Montant TTC (seul champ éditable côté montants) */}
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

              {/* Cartes HT / TVA : non éditables, suivent TTC */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Card>
                  <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant HT :</p>
                    <p className="text-lg md:text-2xl font-semibold whitespace-nowrap tabular-nums">
                      {formatCurrency(round2(editedData.montant_ttc - editedData.tva))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">TVA :</p>
                    <p className="text-lg md:text-2xl font-semibold whitespace-nowrap tabular-nums">
                      {formatCurrency(editedData.tva)}
                    </p>
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
                  <div className="text-right">
                    {isEditing ? (
                      <>
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
                        {MembersSelectNote}
                      </>
                    ) : (
                      <span className="text-xs md:text-sm font-medium">{detail?._processedByName ?? "—"}</span>
                    )}
                  </div>
                </div>

                {/* Client assigné */}
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-border">
                  <span className="text-xs md:text-sm text-muted-foreground">Client assigné :</span>
                  <div className="text-right">
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
                      <Button variant="outline" className="flex-1 h-10" onClick={() => setIsEditing(true)}>
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

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* TTC (éditable) */}
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

          {/* HT & TVA (non éditables, suivent TTC) */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Montant HT :</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(round2(editedData.montant_ttc - editedData.tva))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">TVA :</p>
                <p className="text-lg font-semibold">{formatCurrency(editedData.tva)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Infos */}
          <div className="space-y-2">
            <RowMobile label="Date de traitement">
              <span className="text-xs font-medium">
                {formatDateTime(detail?.date_traitement ?? detail?.created_at)}
              </span>
            </RowMobile>

            <EditableInput
              label="Moyen de paiement"
              field="moyen_paiement"
              isEditing={isEditing}
              value={editedData.moyen_paiement}
              onChange={(v: string) => setEditedData({ ...editedData, moyen_paiement: v })}
              setActiveField={setActiveField}
            />
            <EditableInput
              label="Ville"
              field="ville"
              isEditing={isEditing}
              value={editedData.ville}
              onChange={(v: string) => setEditedData({ ...editedData, ville: v })}
              setActiveField={setActiveField}
            />
            <EditableInput
              label="Adresse"
              field="adresse"
              isEditing={isEditing}
              value={editedData.adresse}
              onChange={(v: string) => setEditedData({ ...editedData, adresse: v })}
              setActiveField={setActiveField}
            />
            <EditableInput
              label="Catégorie"
              field="categorie"
              isEditing={isEditing}
              value={editedData.categorie}
              onChange={(v: string) => setEditedData({ ...editedData, categorie: v })}
              setActiveField={setActiveField}
            />

            {/* Traité par */}
            <RowMobile label="Traité par">
              <div className="text-right">
                {isEditing ? (
                  <>
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
                    {MembersSelectNote}
                  </>
                ) : (
                  <span className="text-xs font-medium">{detail?._processedByName ?? "—"}</span>
                )}
              </div>
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

      {/* Footer */}
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
              <Button variant="outline" className="flex-1 h-10" onClick={() => setIsEditing(true)}>
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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} modal={false}>
        <DrawerContent className="mx-4 mb-8 h-[75vh] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50 flex flex-col overflow-hidden">
          {mobileContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="h-full w-full max-w-[520px] bg-card border-l border-border overflow-y-auto p-0"
      >
        {desktopContent}
      </SheetContent>
    </Sheet>
  );
};
