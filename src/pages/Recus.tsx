import { useState, useEffect, useRef, useMemo } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Plus, Search, Link2 } from "lucide-react";
import { UploadInstructionsDialog } from "@/components/Recus/UploadInstructionsDialog";
import { ReceiptDetailDrawer } from "@/components/Recus/ReceiptDetailDrawer";
import CreateClientLinkDialog from "@/components/Recus/CreateClientLinkDialog";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGlobalFilters } from "@/stores/useGlobalFilters";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useUserRole } from "@/hooks/useUserRole";

type Receipt = {
  id: number;
  created_at: string | null;
  date_traitement?: string | null;
  date_recu?: string | null;
  numero_recu?: string | null;
  receipt_number?: number | null;
  enseigne?: string | null;
  adresse?: string | null;
  ville?: string | null;
  montant_ht?: number | null;
  montant_ttc?: number | null;
  tva?: number | null;
  moyen_paiement?: string | null;
  status?: string | null;
  client_id?: string | null;
  processed_by?: string | null;
  category_id?: string | null;
  org_id?: string | null;
};

type Client = { id: string; name: string };
type Member = { id: string; name: string };

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const Recus = () => {
  const { role, loading: roleLoading } = useUserRole();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClientLinkOpen, setIsClientLinkOpen] = useState(false);

  const {
    dateRange: storedDateRange,
    clientId: storedClientId,
    memberId: storedMemberId,
    setClientId,
    setMemberId,
  } = useGlobalFilters();

  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMethod, setExportMethod] = useState<"sheets" | "pdf" | "">("");
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const N8N_EXPORT_URL =
    (import.meta as any).env?.VITE_N8N_EXPORT_URL ?? "https://samilzr.app.n8n.cloud/webhook/export-receipt";

  const debouncedQuery = useDebounce(searchQuery, 400);

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = (allIds: string[]) => setSelectedIds((prev) => (prev.length === allIds.length ? [] : allIds));
  const resetExportUI = () => {
    setSelectedIds([]);
    setExportOpen(false);
    setExportMethod("");
    setSheetsSpreadsheetId("");
  };

  const handleExportSubmit = async () => {
    if (!exportMethod || selectedIds.length === 0) {
      toast({
        title: "Sélection incomplète",
        description: "Choisissez une méthode et des reçus.",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(true);
    try {
      const payload: any = { method: exportMethod, receipt_ids: selectedIds };
      if (exportMethod === "sheets" && sheetsSpreadsheetId) payload.sheet_url = sheetsSpreadsheetId;

      const res = await fetch(N8N_EXPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";

      if (exportMethod === "pdf" && contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfModalOpen(true);
        resetExportUI();
        setExportLoading(false);
        return;
      }

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const link = data?.sheet_url || data?.download_url;
      if (link) window.open(link, "_blank");
      else if (exportMethod === "sheets") {
        toast({ title: "Export Google Sheets", description: "Export déclenché." });
      }

      resetExportUI();
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Erreur d’export",
        description: "Une erreur est survenue lors de l’export.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentOpenReceiptId = useRef<number | null>(null);
  const isDrawerOpenRef = useRef(false);
  const ignoreNextUpdateForId = useRef<number | null>(null);

  const { data: clients = [], refetch: refetchClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as Client[];
    },
    enabled: !roleLoading,
  });

  // ⬇️ FIX : on lit directement dans org_members (comme sur le Dashboard)
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["team-members-for-filter"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("org_members")
        .select("user_id, first_name, last_name, email")
        .order("first_name", { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.user_id as string,
        name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email || "Membre sans nom",
      })) as Member[];
    },
    enabled: !roleLoading && role !== "enterprise",
  });

  // -------- Résolution client pour la vue Entreprise --------
  const [enterpriseClientId, setEnterpriseClientId] = useState<string | null>(null);
  useEffect(() => {
    const resolveEnterpriseClient = async () => {
      if (role !== "enterprise") return;
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const { data: ent } = await (supabase as any)
        .from("entreprises")
        .select("name")
        .eq("user_id", userId)
        .maybeSingle();

      const companyName = ent?.name?.trim();
      if (!companyName) {
        setEnterpriseClientId("__none__");
        return;
      }

      const { data: cli } = await supabase
        .from("clients")
        .select("id, name")
        .ilike("name", companyName)
        .limit(1)
        .maybeSingle();

      setEnterpriseClientId(cli?.id ?? "__none__");
    };

    if (!roleLoading) resolveEnterpriseClient();
  }, [role, roleLoading]);

  const clientNameById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients]);
  const memberNameById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m.name])), [members]);

  const {
    data: receipts = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [
      "recus",
      storedDateRange,
      storedClientId,
      storedMemberId,
      debouncedQuery,
      sortOrder,
      enterpriseClientId,
      role,
    ],
    queryFn: async () => {
      let query = (supabase as any)
        .from("recus")
        .select(
          "id, created_at, date_traitement, date_recu, numero_recu, receipt_number, enseigne, adresse, ville, montant_ht, montant_ttc, tva, moyen_paiement, status, client_id, processed_by, category_id, org_id",
        );

      if (storedDateRange.from && storedDateRange.to) {
        query = query.gte("date_traitement", storedDateRange.from);
        query = query.lte("date_traitement", storedDateRange.to);
      }

      if (role === "enterprise") {
        if (!enterpriseClientId || enterpriseClientId === "__none__") return [];
        query = query.eq("client_id", enterpriseClientId);
      } else {
        if (storedClientId && storedClientId !== "all") query = query.eq("client_id", storedClientId);
        if (storedMemberId && storedMemberId !== "all") query = query.eq("processed_by", storedMemberId);
      }

      if (debouncedQuery) {
        const escaped = debouncedQuery.replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.or(`numero_recu.ilike.%${escaped}%,enseigne.ilike.%${escaped}%,adresse.ilike.%${escaped}%`);
      }

      query = query.order("date_traitement", { ascending: sortOrder === "asc", nullsFirst: false });
      query = query.order("created_at", { ascending: sortOrder === "asc" });
      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as Receipt[];
    },
    enabled:
      !roleLoading &&
      role !== null &&
      (role !== "enterprise" || (enterpriseClientId !== null && enterpriseClientId !== "")),
  });

  const error = queryError ? (queryError as any).message : null;

  useEffect(() => {
    if (!selectedId || !isDrawerOpen) return;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const { data: r, error: e1 } = await (supabase as any).from("recus").select("*").eq("id", selectedId).single();
        if (e1) throw e1;

        const receiptData = r as any;

        let processedByName: string | null = null;
        let clientName: string | null = null;

        if (receiptData?.processed_by) {
          const { data: p } = await (supabase as any)
            .from("profiles")
            .select("first_name, last_name")
            .eq("user_id", receiptData.processed_by)
            .maybeSingle();
          const profileData = p as any;
          processedByName = profileData
            ? `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim()
            : null;
        }

        if (receiptData?.client_id) {
          const { data: c } = await (supabase as any)
            .from("clients")
            .select("name")
            .eq("id", receiptData.client_id)
            .maybeSingle();
          const clientData = c as any;
          clientName = clientData?.name ?? null;
        }

        setDetail({ ...receiptData, _processedByName: processedByName, _clientName: clientName });
      } catch (err: any) {
        setDetailError(err?.message || "Erreur lors du chargement du reçu");
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedId, isDrawerOpen]);

  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);

  useEffect(() => {
    const recusChannel = supabase
      .channel("recus-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "recus" }, (payload) => {
        const newRecu = payload.new as Receipt;
        refetch();

        if (!isDrawerOpenRef.current || currentOpenReceiptId.current !== newRecu.id) {
          currentOpenReceiptId.current = newRecu.id;
          setSelectedId(newRecu.id);
          setDetail(null);
          setDetailError(null);
          setIsDrawerOpen(true);
          toast({
            title: "Nouveau reçu analysé !",
            description: `${newRecu.enseigne || "Reçu"} - ${formatCurrency(newRecu.montant_ttc || 0)}`,
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "recus" }, (payload) => {
        const updatedRecu = payload.new as Receipt;
        const oldRecu = payload.old as Receipt;

        if (ignoreNextUpdateForId.current === updatedRecu.id) {
          ignoreNextUpdateForId.current = null;
          refetch();
          return;
        }
        refetch();

        const shouldOpen =
          (!!updatedRecu.receipt_number && !oldRecu.receipt_number) ||
          (updatedRecu.status === "traite" && oldRecu.status !== "traite");

        if (shouldOpen) {
          if (!isDrawerOpenRef.current || currentOpenReceiptId.current !== updatedRecu.id) {
            currentOpenReceiptId.current = updatedRecu.id;
            setSelectedId(updatedRecu.id);
            setDetail(null);
            setDetailError(null);
            setIsDrawerOpen(true);
            toast({
              title: "Reçu validé !",
              description: `${updatedRecu.enseigne || "Reçu"} n°${updatedRecu.receipt_number || "—"}`,
            });
          }
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "recus" }, () => {
        refetch();
      })
      .subscribe();

    const clientsChannel = supabase
      .channel("clients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => refetchClients())
      .subscribe();

    const membersChannel = supabase
      .channel("members-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "org_members" }, () => refetchMembers())
      .subscribe();

    return () => {
      supabase.removeChannel(recusChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [refetch, refetchClients, refetchMembers]);

  useEffect(() => {
    if (!isDrawerOpen) currentOpenReceiptId.current = null;
    else if (selectedId) currentOpenReceiptId.current = selectedId;
  }, [isDrawerOpen, selectedId]);

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <div className="flex gap-3 w-full md:w-auto transition-all duration-200">
            {!roleLoading && role !== "enterprise" && (
              <Button
                variant="outline"
                className="flex-1 md:flex-initial"
                onClick={() => {
                  if (selectedIds.length === 0) {
                    toast({
                      title: "Aucun reçu sélectionné",
                      description: "Sélectionnez au moins un reçu.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setExportOpen(true);
                }}
              >
                {selectedIds.length > 0 ? `Exporter (${selectedIds.length})` : "Exporter"}
              </Button>
            )}

            <Button className="gap-2 flex-1 md:flex-initial" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter un reçu</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>

            {!roleLoading && role !== "enterprise" && (
              <Button className="gap-2 flex-1 md:flex-initial" onClick={() => setIsClientLinkOpen(true)}>
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Créer un lien client</span>
                <span className="sm:hidden">Lien client</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 transition-all duration-200">
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
            <SelectTrigger className="w-full md:w-[240px]">
              <ArrowDownUp className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Du plus récent au plus ancien</SelectItem>
              <SelectItem value="asc">Du plus ancien au plus récent</SelectItem>
            </SelectContent>
          </Select>

          {!roleLoading && role !== "enterprise" && (
            <>
              <Select value={storedClientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={storedMemberId || "all"} onValueChange={setMemberId}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Tous les membres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les membres</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, numéro ou adresse"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Card className="bg-card border-border transition-all duration-200">
          <CardHeader className="transition-all duration-150">
            <CardTitle>Liste des reçus</CardTitle>
          </CardHeader>
          <CardContent className="transition-all duration-200">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">Chargement…</div>
            ) : error ? (
              <div className="flex items-center justify-center py-16 text-sm text-destructive">{error}</div>
            ) : receipts.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun reçu n'a encore été traité
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden space-y-3 transition-all duration-200">
                  {receipts.map((receipt) => {
                    const dateValue = receipt.date_traitement || receipt.created_at;
                    const formattedDate = formatDate(dateValue);
                    const formattedMontantTTC = formatCurrency(receipt.montant_ttc || 0);
                    const formattedTVA = formatCurrency(receipt.tva || 0);
                    const checked = selectedIds.includes(String(receipt.id));
                    const clientName = receipt.client_id ? clientNameById[receipt.client_id] : null;

                    return (
                      <div
                        key={receipt.id}
                        className="relative p-4 rounded-lg bg-card/50 border border-border hover:bg-muted/50 transition-all duration-200 space-y-3"
                        onClick={() => {
                          setSelectedId(receipt.id);
                          setDetail(null);
                          setDetailError(null);
                          setIsDrawerOpen(true);
                        }}
                      >
                        <div
                          className="absolute right-3 top-3 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOne(String(receipt.id));
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          role="button"
                          aria-label="Sélectionner le reçu"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleOne(String(receipt.id))}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="flex items-start justify-between pr-8">
                          <div>
                            <div className="font-semibold text-base">{receipt.enseigne || "—"}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{formattedDate}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">TTC: </span>
                            <span className="font-semibold whitespace-nowrap tabular-nums">{formattedMontantTTC}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground text-xs">TVA: </span>
                            <span className="whitespace-nowrap tabular-nums">{formattedTVA}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="text-muted-foreground">
                            Client : <span className="text-foreground">{clientName || "—"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-10 py-3 px-4">
                          <Checkbox
                            checked={selectedIds.length === receipts.length && receipts.length > 0}
                            onCheckedChange={() => toggleAll(receipts.map((r) => String(r.id)))}
                            disabled={receipts.length === 0}
                            aria-label="Tout sélectionner"
                          />
                        </th>
                        <th className="text-left  py-3 px-4 text-sm font-medium text-muted-foreground">Enseigne</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant TTC</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant HT</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">TVA</th>
                        <th className="text-left  py-3 px-4 text-sm font-medium text-muted-foreground">
                          Client assigné
                        </th>
                        <th className="text-left  py-3 px-4 text-sm font-medium text-muted-foreground">Traité par</th>
                        <th className="text-left  py-3 px-4 text-sm font-medium text-muted-foreground">
                          Date de traitement
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.map((receipt) => (
                        <tr key={receipt.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(String(receipt.id))}
                              onCheckedChange={() => toggleOne(String(receipt.id))}
                            />
                          </td>

                          <td
                            className="py-3 px-4 text-sm cursor-pointer"
                            onClick={() => {
                              setSelectedId(receipt.id);
                              setDetail(null);
                              setDetailError(null);
                              setIsDrawerOpen(true);
                            }}
                          >
                            <div className="font-medium">{receipt.enseigne || "—"}</div>
                          </td>

                          <td
                            className="py-3 px-4 text-sm text-right font-medium whitespace-nowrap tabular-nums cursor-pointer"
                            onClick={() => {
                              setSelectedId(receipt.id);
                              setDetail(null);
                              setDetailError(null);
                              setIsDrawerOpen(true);
                            }}
                          >
                            {formatCurrency(receipt.montant_ttc || 0)}
                          </td>

                          <td
                            className="py-3 px-4 text-sm text-right whitespace-nowrap tabular-nums cursor-pointer"
                            onClick={() => {
                              setSelectedId(receipt.id);
                              setDetail(null);
                              setDetailError(null);
                              setIsDrawerOpen(true);
                            }}
                          >
                            {formatCurrency(receipt.montant_ht || 0)}
                          </td>

                          <td
                            className="py-3 px-4 text-sm text-right whitespace-nowrap tabular-nums cursor-pointer"
                            onClick={() => {
                              setSelectedId(receipt.id);
                              setDetail(null);
                              setDetailError(null);
                              setIsDrawerOpen(true);
                            }}
                          >
                            {formatCurrency(receipt.tva || 0)}
                          </td>

                          <td
                            className="py-3 px-4 text-sm cursor-pointer"
                            onClick={() => {
                              setSelectedId(receipt.id);
                              setDetail(null);
                              setDetailError(null);
                              setIsDrawerOpen(true);
                            }}
                          >
                            {receipt.client_id ? clientNameById[receipt.client_id] || "—" : "—"}
                          </td>

                          <td
                            className="py-3 px-4 text-sm cursor-pointer"
                            onClick={() => {
                              setSelectedId(receipt.id);
                              setDetail(null);
                              setDetailError(null);
                              setIsDrawerOpen(true);
                            }}
                          >
                            {receipt.processed_by ? memberNameById[receipt.processed_by] || "—" : "—"}
                          </td>

                          <td
                            className="py-3 px-4 text-sm cursor-pointer"
                            onClick={() => {
                              setSelectedId(receipt.id);
                              setDetail(null);
                              setDetailError(null);
                              setIsDrawerOpen(true);
                            }}
                          >
                            {formatDate(receipt.date_traitement || receipt.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <UploadInstructionsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

        <ReceiptDetailDrawer
          open={isDrawerOpen}
          onOpenChange={(open) => {
            setIsDrawerOpen(open);
            if (!open) {
              setSelectedId(null);
              setDetail(null);
              setDetailError(null);
            }
          }}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          clients={clients}
          members={members}
          onValidated={(id) => {
            ignoreNextUpdateForId.current = id;
          }}
        />

        <CreateClientLinkDialog open={isClientLinkOpen} onOpenChange={setIsClientLinkOpen} clients={clients} />

        <Dialog open={exportOpen} onOpenChange={setExportOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Exporter les reçus sélectionnés</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Méthode d'export</Label>
                <RadioGroup value={exportMethod} onValueChange={(v) => setExportMethod(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sheets" id="sheets" />
                    <Label htmlFor="sheets" className="font-normal cursor-pointer">
                      Google Sheets
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="font-normal cursor-pointer">
                      PDF
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {exportMethod === "sheets" && (
                <div className="space-y-2">
                  <Label htmlFor="sheets-id">URL de votre feuille Google Sheets</Label>
                  <Input
                    id="sheets-id"
                    placeholder="https://docs.google.com/spreadsheets/d/…/edit"
                    value={sheetsSpreadsheetId}
                    onChange={(e) => setSheetsSpreadsheetId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    <strong>Important :</strong> mettez “Toute personne disposant du lien” en “Peut modifier” avant de
                    lancer l’export.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExportOpen(false)} disabled={exportLoading}>
                Fermer
              </Button>
              <Button onClick={handleExportSubmit} disabled={exportLoading || !exportMethod}>
                {exportLoading ? "Export en cours..." : "Valider l'export"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={pdfModalOpen}
          onOpenChange={(o) => {
            setPdfModalOpen(o);
            if (!o && pdfUrl) {
              URL.revokeObjectURL(pdfUrl);
              setPdfUrl(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export PDF prêt</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground">Votre fichier PDF est prêt à être téléchargé.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPdfModalOpen(false)}>
                Fermer
              </Button>
              <Button asChild disabled={!pdfUrl}>
                <a href={pdfUrl ?? "#"} download="finvisor.pdf" target="_blank" rel="noreferrer">
                  Télécharger le PDF
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Recus;
