// src/components/Recus/ReceiptDetailDrawer.tsx
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

interface ReceiptDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: any;
  loading: boolean;
  error: string | null;
  clients?: Array<{ id: string; name: string; regime?: string }>;
  members?: Array<{ id: string; name: string }>;
  onValidated?: (id: number) => void;
}

type Member = { id: string; name: string };
type EditedData = {
  enseigne: string;
  numero_recu: string;
  montant_ttc: number;
  tva: number;
  ville: string;
  adresse: string;
  moyen_paiement: string;
  categorie: string;
  client_id: string;
  processed_by: string;
};

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

  /** ----------------- Edition (contrôlée, sans autosave) ----------------- */
  const initialDataRef = useRef<EditedData | null>(null);
  const [editedData, setEditedData] = useState<EditedData>({
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

  // Dirty state calculé
  const isDirty = useMemo(() => {
    const init = initialDataRef.current;
    if (!init) return false;
    return (
      init.enseigne !== editedData.enseigne ||
      init.numero_recu !== editedData.numero_recu ||
      init.montant_ttc !== editedData.montant_ttc ||
      init.tva !== editedData.tva ||
      init.ville !== editedData.ville ||
      init.adresse !== editedData.adresse ||
      init.moyen_paiement !== editedData.moyen_paiement ||
      init.categorie !== editedData.categorie ||
      (init.client_id || "") !== (editedData.client_id || "") ||
      (init.processed_by || "") !== (editedData.processed_by || "")
    );
  }, [editedData]);

  // Sync depuis detail à l’ouverture / changement de reçu
  useEffect(() => {
    if (!detail) return;
    const next: EditedData = {
      enseigne: detail?.enseigne ?? "",
      numero_recu: detail?.numero_recu ?? "",
      montant_ttc: Number(detail?.montant_ttc ?? detail?.montant ?? 0) || 0,
      tva: Number(detail?.tva ?? 0) || 0,
      ville: detail?.ville ?? "",
      adresse: detail?.adresse ?? "",
      moyen_paiement: detail?.moyen_paiement ?? "",
      categorie: detail?.categorie ?? "",
      client_id: detail?.client_id ?? "",
      processed_by: detail?.processed_by ?? "",
    };
    initialDataRef.current = next;
    setEditedData(next);
    setIsEditing(false);
    setActiveField(null);
  }, [detail, open]);

  /** ---------- MEMBRES: chargement robuste ---------- */
  const [orgScopedMembers, setOrgScopedMembers] = useState<Member[]>([]);
  const [genericMembers, setGenericMembers] = useState<Member[]>([]);
  const [membersLoadNote, setMembersLoadNote] = useState<string>("");
  const lastOrgIdRef = useRef<string | null>(null);

  const tryRpcMembers = async (orgId: string): Promise<Member[] | null> => {
    try {
      const { data, error } = await (supabase as any).rpc("get_org_members", { p_org_id: orgId });
      if (error) return null;
      return (data || []).map((r: any) => ({
        id: (r.user_id ?? r.id) as string,
        name: (r.name as string) || "Membre sans nom",
      }));
    } catch {
      return null;
    }
  };

  const tryJoinMembers = async (orgId: string): Promise<Member[] | null> => {
    try {
      const { data: orgMembers, error: e1 } = await (supabase as any)
        .from("org_members")
        .select("user_id")
        .eq("org_id", orgId);
      if (e1) return null;
      const userIds = (orgMembers || []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length === 0) return [];
      const { data: profiles, error: e2 } = await (supabase as any)
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      if (e2) return null;
      return (profiles || []).map((p: any) => ({
        id: p.user_id as string,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Membre sans nom",
      }));
    } catch {
      return null;
    }
  };

  const tryGenericMembers = async (): Promise<Member[] | null> => {
    try {
      const { data: orgMembers, error: e1 } = await (supabase as any).from("org_members").select("user_id");
      if (e1) return null;
      const userIds = (orgMembers || []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length === 0) return [];
      const { data: profiles, error: e2 } = await (supabase as any)
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      if (e2) return null;
      return (profiles || []).map((p: any) => ({
        id: p.user_id as string,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Membre sans nom",
      }));
    } catch {
      return null;
    }
  };

  const loadMembers = async (orgId?: string) => {
    setMembersLoadNote("");
    if (members && members.length > 0) {
      setOrgScopedMembers([]);
      setGenericMembers([]);
      return;
    }
    if (!orgId) {
      const gen = await tryGenericMembers();
      setGenericMembers(gen ?? []);
      if (gen === null) setMembersLoadNote("Accès RLS: org_members/profiles non visibles.");
      return;
    }
    const rpc = await tryRpcMembers(orgId);
    if (rpc !== null) {
      setOrgScopedMembers(rpc);
      if (rpc.length === 0) setMembersLoadNote("Aucun membre pour cette organisation.");
      return;
    }
    const join = await tryJoinMembers(orgId);
    if (join !== null) {
      setOrgScopedMembers(join);
      if (join.length === 0) setMembersLoadNote("Aucun membre pour cette organisation.");
      return;
    }
    const gen = await tryGenericMembers();
    setGenericMembers(gen ?? []);
    if (gen === null) setMembersLoadNote("Accès RLS: org_members/profiles non visibles.");
  };

  useEffect(() => {
    if (!open) return;
    const orgId = detail?.org_id as string | undefined;
    loadMembers(orgId);
    lastOrgIdRef.current = orgId ?? null;
  }, [open, detail?.org_id, members?.length]);

  useEffect(() => {
    if (!open) return;
    const orgId = (detail?.org_id as string) || null;
    if (!orgId || members.length > 0) return;
    const orgChan = (supabase as any)
      .channel(`recus-drawer-org-members-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "org_members", filter: `org_id=eq.${orgId}` },
        async (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newUserId = payload.new?.user_id as string | undefined;
            if (newUserId) {
              const { data: prof } = await (supabase as any)
                .from("profiles")
                .select("user_id, first_name, last_name")
                .eq("user_id", newUserId)
                .maybeSingle();
              const newMember: Member = prof
                ? {
                    id: prof.user_id,
                    name: `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || "Membre sans nom",
                  }
                : { id: newUserId, name: "Membre sans nom" };
              setOrgScopedMembers((prev) => {
                const exists = prev.some((m) => m.id === newMember.id);
                return exists ? prev : [...prev, newMember].sort((a, b) => a.name.localeCompare(b.name));
              });
              return;
            }
          }
          const currentOrg = lastOrgIdRef.current ?? orgId;
          loadMembers(currentOrg || undefined);
        },
      )
      .subscribe();

    const profilesChan = (supabase as any)
      .channel(`recus-drawer-profiles-${orgId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload: any) => {
        const uid = payload.new?.user_id as string | undefined;
        if (!uid) return;
        const name = `${payload.new?.first_name || ""} ${payload.new?.last_name || ""}`.trim() || "Membre sans nom";
        setOrgScopedMembers((prev) => {
          const idx = prev.findIndex((m) => m.id === uid);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = { id: uid, name };
          return copy;
        });
        setGenericMembers((prev) => {
          const idx = prev.findIndex((m) => m.id === uid);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = { id: uid, name };
          return copy;
        });
      })
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel?.(orgChan);
        (supabase as any).removeChannel?.(profilesChan);
      } catch {}
    };
  }, [open, detail?.org_id, members?.length]);

  const effectiveMembers: Member[] =
    (members && members.length > 0 && members) ||
    (orgScopedMembers && orgScopedMembers.length > 0 && orgScopedMembers) ||
    genericMembers;

  const MembersSelectNote =
    effectiveMembers.length === 0 && membersLoadNote ? (
      <div className="text-[10px] md:text-xs text-amber-500 mt-1 text-right">{membersLoadNote}</div>
    ) : null;

  /** ----------------- KPI TVA Récupérable ----------------- */
  const { tvaRecuperable, tvaNonRecuperable, percentRecup, regleTva } = useMemo(() => {
    if (!detail?.tva || !detail?.client_id) {
      return {
        tvaRecuperable: 0,
        tvaNonRecuperable: detail?.tva || 0,
        percentRecup: 0,
        regleTva: "—",
      };
    }

    const client = clients.find((c) => c.id === detail.client_id);
    const categorie = (detail.categorie || "").toLowerCase();

    const regles: Record<string, (client: any) => number> = {
      restauration: (c) => (c?.regime === "reel" ? 1.0 : 0.0),
      hôtellerie: () => 1.0,
      alimentation: () => 1.0,
      transport: () => 1.0,
      "frais généraux": () => 1.0,
      tabac: () => 0.0,
      alcool: () => 0.0,
      cadeaux: () => 0.0,
    };

    let taux = 1.0;
    let regle = "TVA déductible";

    for (const [key, fn] of Object.entries(regles)) {
      if (categorie.includes(key)) {
        taux = fn(client);
        regle = taux === 1.0 ? "TVA déductible" : "TVA non déductible";
        break;
      }
    }

    const tvaRecup = detail.tva * taux;
    const tvaNonRecup = detail.tva - tvaRecup;

    return {
      tvaRecuperable: tvaRecup,
      tvaNonRecuperable: tvaNonRecup,
      percentRecup: Math.round(taux * 100),
      regleTva: regle,
    };
  }, [detail, clients]);

  /** ----------------- Actions ----------------- */
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
    if (!detail?.id || !isDirty) return;
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
      initialDataRef.current = { ...editedData };
      setIsEditing(false);
      setActiveField(null);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
    }
  };

  const handleCancel = () => {
    if (!initialDataRef.current) return;
    setEditedData(initialDataRef.current);
    setIsEditing(false);
    setActiveField(null);
  };

  /** ---------- UI helpers ---------- */
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
  function EditableText({
    label,
    field,
    value,
    onChange,
    isEditing,
  }: {
    label: string;
    field: keyof EditedData;
    value: string;
    onChange: (v: string) => void;
    isEditing: boolean;
  }) {
    return (
      <Row label={label}>
        {isEditing ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setActiveField(field)}
            onBlur={() => setActiveField(null)}
            className={cn(
              "text-xs md:text-sm font-medium bg-transparent border-none p-0 text-right focus:outline-none focus:ring-0",
              "border-b border-primary/50",
            )}
            placeholder="—"
          />
        ) : (
          <span className="text-xs md:text-sm font-medium">{value?.trim() ? value : "—"}</span>
        )}
      </Row>
    );
  }

  /** ---------- Desktop ---------- */
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
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.enseigne}
                      onChange={(e) => setEditedData({ ...editedData, enseigne: e.target.value })}
                      onFocus={() => setActiveField("enseigne")}
                      onBlur={() => setActiveField(null)}
                      className={cn(
                        "text-lg md:text-2xl font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0",
                        "border-b border-primary/50",
                      )}
                      placeholder="Enseigne"
                    />
                  ) : (
                    <div className="text-lg md:text-2xl font-bold">{editedData.enseigne || "—"}</div>
                  )}
                </div>
              </div>
            </SheetHeader>
            <div className="mt-4 md:mt-6 space-y-4 md:space-y-6">
              {/* Montant TTC */}
              <div className="w-full flex items-center justify-center">
                <div className="inline-block text-center">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant TTC :</p>
                  {isEditing ? (
                    <div className="inline-flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={Number.isFinite(editedData.montant_ttc) ? editedData.montant_ttc : 0}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            montant_ttc: Number.isFinite(parseFloat(e.target.value)) ? parseFloat(e.target.value) : 0,
                          })
                        }
                        onFocus={() => setActiveField("montant_ttc")}
                        onBlur={() => setActiveField(null)}
                        className={cn(
                          "text-2xl md:text-4xl font-bold text-center bg-transparent border-none p-0 focus:outline-none",
                          "border-b-2 border-primary/60",
                          "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        )}
                        style={{ letterSpacing: "-0.03em" }}
                      />
                    </div>
                  ) : (
                    <p className="text-2xl md:text-4xl font-bold whitespace-nowrap tabular-nums">
                      {formatCurrency(editedData.montant_ttc)}
                    </p>
                  )}
                </div>
              </div>

              {/* Cartes HT / TVA */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <Card>
                  <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Montant HT :</p>
                    <p className="text-lg md:text-2xl font-semibold whitespace-nowrap tabular-nums">
                      {formatCurrency(Math.max(0, editedData.montant_ttc - editedData.tva))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 md:pt-6 pb-3 md:pb-4">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">TVA :</p>
                    {isEditing ? (
                      <div className="inline-flex items-baseline gap-1">
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={Number.isFinite(editedData.tva) ? editedData.tva : 0}
                          onChange={(e) =>
                            setEditedData({
                              ...editedData,
                              tva: Number.isFinite(parseFloat(e.target.value)) ? parseFloat(e.target.value) : 0,
                            })
                          }
                          onFocus={() => setActiveField("tva")}
                          onBlur={() => setActiveField(null)}
                          className={cn(
                            "text-lg md:text-2xl font-semibold bg-transparent border-none p-0 focus:outline-none",
                            "border-b border-primary/60",
                            "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                          )}
                          style={{ letterSpacing: "-0.03em" }}
                        />
                        <span className="text-lg md:text-2xl font-semibold leading-none">€</span>
                      </div>
                    ) : (
                      <p className="text-lg md:text-2xl font-semibold whitespace-nowrap tabular-nums">
                        {formatCurrency(editedData.tva)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* KPI TVA Récupérable */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mt-4">
                <Card className="border-green-500/20">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">TVA récupérable</p>
                    <p className="text-lg md:text-2xl font-bold text-green-600">{formatCurrency(tvaRecuperable)}</p>
                    <p className="text-[10px] text-green-600 mt-1">{percentRecup}% récupéré</p>
                  </CardContent>
                </Card>
                <Card className="border-red-500/20">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-xs text-muted-foreground mb-1">TVA non récupérable</p>
                    <p className="text-lg md:text-2xl font-bold text-red-600">{formatCurrency(tvaNonRecuperable)}</p>
                    <p className="text-[10px] text-red-600 mt-1">{regleTva}</p>
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
                <EditableText
                  label="Moyen de paiement"
                  field="moyen_paiement"
                  isEditing={isEditing}
                  value={editedData.moyen_paiement}
                  onChange={(v) => setEditedData({ ...editedData, moyen_paiement: v })}
                />
                <EditableText
                  label="Ville"
                  field="ville"
                  isEditing={isEditing}
                  value={editedData.ville}
                  onChange={(v) => setEditedData({ ...editedData, ville: v })}
                />
                <EditableText
                  label="Adresse"
                  field="adresse"
                  isEditing={isEditing}
                  value={editedData.adresse}
                  onChange={(v) => setEditedData({ ...editedData, adresse: v })}
                />
                <EditableText
                  label="Catégorie"
                  field="categorie"
                  isEditing={isEditing}
                  value={editedData.categorie}
                  onChange={(v) => setEditedData({ ...editedData, categorie: v })}
                />
                <Row label="Traité par">
                  <div className="text-right">
                    {isEditing ? (
                      <>
                        <Select
                          value={editedData.processed_by || "none"}
                          onValueChange={(value) =>
                            setEditedData({ ...editedData, processed_by: value === "none" ? "" : value })
                          }
                        >
                          <SelectTrigger className="w-[200px] h-8 text-xs md:text-sm">
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
                </Row>
                <Row label="Client assigné">
                  <div className="text-right">
                    {isEditing ? (
                      <Select
                        value={editedData.client_id || "none"}
                        onValueChange={(value) =>
                          setEditedData({ ...editedData, client_id: value === "none" ? "" : value })
                        }
                      >
                        <SelectTrigger className="w-[200px] h-8 text-xs md:text-sm">
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
                </Row>
              </div>

              {/* Boutons */}
              <div className="pt-4 md:pt-6">
                {isEditing ? (
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" className="h-10 px-4" onClick={handleCancel}>
                      Annuler
                    </Button>
                    <Button className="h-10 px-4" onClick={handleSave} disabled={!isDirty}>
                      Enregistrer
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" className="h-10 px-4" onClick={handleValidate}>
                        Valider
                      </Button>
                      <Button variant="outline" className="h-10 px-4" onClick={() => setIsEditing(true)}>
                        Corriger
                      </Button>
                    </div>
                    <div className="mt-3">
                      <Button variant="outline" className="w-full h-10" disabled={!detail?.id} onClick={openReport}>
                        Consulter le rapport d'analyse
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  /** ---------- Mobile ---------- */
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
            {isEditing ? (
              <input
                type="text"
                value={editedData.enseigne}
                onChange={(e) => setEditedData({ ...editedData, enseigne: e.target.value })}
                onFocus={() => setActiveField("enseigne")}
                onBlur={() => setActiveField(null)}
                className={cn(
                  "text-lg font-bold bg-transparent border-none p-0 focus:outline-none focus:ring-0",
                  "border-b border-primary/50",
                )}
                placeholder="Enseigne"
              />
            ) : (
              <div className="text-lg font-bold">{editedData.enseigne || "—"}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Reçu n°{" "}
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.numero_recu}
                  onChange={(e) => setEditedData({ ...editedData, numero_recu: e.target.value })}
                  onFocus={() => setActiveField("numero_recu")}
                  onBlur={() => setActiveField(null)}
                  className={cn(
                    "bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-xs",
                    "border-b border-primary/50",
                  )}
                  placeholder="—"
                />
              ) : (
                <span>{editedData.numero_recu || "—"}</span>
              )}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Montants */}
          <div className="w-full flex items-center justify-center">
            <div className="inline-block text-center">
              <p className="text-xs text-muted-foreground mb-1">Montant TTC :</p>
              {isEditing ? (
                <div className="inline-flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={Number.isFinite(editedData.montant_ttc) ? editedData.montant_ttc : 0}
                    onChange={(e) =>
                      setEditedData({
                        ...editedData,
                        montant_ttc: Number.isFinite(parseFloat(e.target.value)) ? parseFloat(e.target.value) : 0,
                      })
                    }
                    onFocus={() => setActiveField("montant_ttc")}
                    onBlur={() => setActiveField(null)}
                    className={cn(
                      "text-2xl font-bold text-center bg-transparent border-none p-0 focus:outline-none",
                      "border-b-2 border-primary/60",
                      "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    )}
                    style={{ letterSpacing: "-0.03em" }}
                  />
                  <span className="text-2xl font-bold leading-none">€</span>
                </div>
              ) : (
                <p className="text-2xl font-bold">{formatCurrency(editedData.montant_ttc)}</p>
              )}
            </div>
          </div>

          {/* HT/TVA */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">Montant HT :</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(Math.max(0, editedData.montant_ttc - editedData.tva))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground mb-1">TVA :</p>
                {isEditing ? (
                  <div className="inline-flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={Number.isFinite(editedData.tva) ? editedData.tva : 0}
                      onChange={(e) =>
                        setEditedData({
                          ...editedData,
                          tva: Number.isFinite(parseFloat(e.target.value)) ? parseFloat(e.target.value) : 0,
                        })
                      }
                      onFocus={() => setActiveField("tva")}
                      onBlur={() => setActiveField(null)}
                      className={cn(
                        "text-lg font-semibold bg-transparent border-none p-0 focus:outline-none",
                        "border-b border-primary/60",
                        "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                      )}
                      style={{ letterSpacing: "-0.03em" }}
                    />
                    <span className="text-lg font-semibold leading-none">€</span>
                  </div>
                ) : (
                  <p className="text-lg font-semibold">{formatCurrency(editedData.tva)}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* KPI TVA Récupérable (mobile) */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Card className="border-green-500/20">
              <CardContent className="pt-3 pb-2">
                <p className="text-xs text-muted-foreground mb-1">TVA récupérable</p>
                <p className="text-base font-bold text-green-600">{formatCurrency(tvaRecuperable)}</p>
                <p className="text-[9px] text-green-600">{percentRecup}% récupéré</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/20">
              <CardContent className="pt-3 pb-2">
                <p className="text-xs text-muted-foreground mb-1">TVA non récup.</p>
                <p className="text-base font-bold text-red-600">{formatCurrency(tvaNonRecuperable)}</p>
                <p className="text-[9px] text-red-600">{regleTva}</p>
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
            <RowMobile label="Moyen de paiement">
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.moyen_paiement}
                  onChange={(e) => setEditedData({ ...editedData, moyen_paiement: e.target.value })}
                  className="text-xs text-right bg-transparent border-b border-primary/50 focus:outline-none"
                  placeholder="—"
                />
              ) : (
                <span className="text-xs font-medium">{editedData.moyen_paiement || "—"}</span>
              )}
            </RowMobile>
            <RowMobile label="Ville">
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.ville}
                  onChange={(e) => setEditedData({ ...editedData, ville: e.target.value })}
                  className="text-xs text-right bg-transparent border-b border-primary/50 focus:outline-none"
                  placeholder="—"
                />
              ) : (
                <span className="text-xs font-medium">{editedData.ville || "—"}</span>
              )}
            </RowMobile>
            <RowMobile label="Adresse">
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.adresse}
                  onChange={(e) => setEditedData({ ...editedData, adresse: e.target.value })}
                  className="text-xs text-right bg-transparent border-b border-primary/50 focus:outline-none"
                  placeholder="—"
                />
              ) : (
                <span className="text-xs font-medium">{editedData.adresse || "—"}</span>
              )}
            </RowMobile>
            <RowMobile label="Catégorie">
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.categorie}
                  onChange={(e) => setEditedData({ ...editedData, categorie: e.target.value })}
                  className="text-xs text-right bg-transparent border-b border-primary/50 focus:outline-none"
                  placeholder="—"
                />
              ) : (
                <span className="text-xs font-medium">{editedData.categorie || "—"}</span>
              )}
            </RowMobile>
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
                      <SelectTrigger className="w-[160px] h-7 text-xs">
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
            <RowMobile label="Client assigné">
              {isEditing ? (
                <Select
                  value={editedData.client_id || "none"}
                  onValueChange={(value) => setEditedData({ ...editedData, client_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="w-[160px] h-7 text-xs">
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
            <Button variant="outline" className="h-10 flex-1" onClick={handleCancel}>
              Annuler
            </Button>
            <Button className="h-10 flex-1" onClick={handleSave} disabled={!isDirty}>
              Enregistrer
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-3">
              <Button variant="outline" className="h-10 flex-1" onClick={handleValidate}>
                Valider
              </Button>
              <Button variant="outline" className="h-10 flex-1" onClick={() => setIsEditing(true)}>
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
