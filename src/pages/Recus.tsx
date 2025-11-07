import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowDownUp, Plus, Search } from "lucide-react";
import { UploadInstructionsDialog } from "@/components/Recus/UploadInstructionsDialog";
import { ReceiptDetailDrawer } from "@/components/Recus/ReceiptDetailDrawer";
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

/* Debounce */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debouncedValue;
}

const Recus = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  /* Global filters */
  const {
    dateRange: storedDateRange,
    clientId: storedClientId,
    memberId: storedMemberId,
    setClientId,
    setMemberId,
  } = useGlobalFilters();

  /* Local filters */
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "traite" | "en_cours" | "en_attente">("all");
  const [searchQuery, setSearchQuery] = useState("");

  /* Export state */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMethod, setExportMethod] = useState<"sheets" | "pdf" | "">("");
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  /* n8n prod webhook for export */
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

  /* Submit export -> n8n */
  const handleExportSubmit = async () => {
    if (!exportMethod || selectedIds.length === 0) {
      toast({
        title: "Aucun reçu sélectionné",
        description: "Sélectionnez au moins un reçu et une méthode d’export.",
        variant: "destructive",
      });
      return;
    }

    try {
      setExportLoading(true);

      const payload: Record<string, any> = {
        method: exportMethod, // "sheets" | "pdf"
        receipt_ids: selectedIds, // array of string IDs
      };
      if (exportMethod === "sheets" && sheetsSpreadsheetId.trim()) {
        payload.sheets_spreadsheet_id = sheetsSpreadsheetId.trim();
      }

      const res = await fetch(N8N_EXPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // n8n peut répondre 200/202; s'il renvoie un lien direct, on l'ouvre
      const text = await res.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        /* ignore parse */
      }

      if (!res.ok) {
        throw new Error(result?.error || `HTTP ${res.status}`);
      }

      if (result.download_url) {
        window.open(result.download_url, "_blank");
      }

      toast({
        title: "Export lancé",
        description:
          exportMethod === "sheets" ? "Google Sheets va être créé/mis à jour." : "Le PDF est en cours de génération.",
      });

      resetExportUI();
    } catch (err: any) {
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

  /* Drawer détail */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const currentOpenReceiptId = useRef<number | null>(null);
  const isDrawerOpenRef = useRef(false);

  /* Clients */
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
  });

  /* Members (profiles) */
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["members-with-profiles"],
    queryFn: async () => {
      const { data: orgMembers, error: omError } = await (supabase as any).from("org_members").select("user_id");
      if (omError) throw omError;
      if (!orgMembers || orgMembers.length === 0) return [];
      const userIds = orgMembers.map((om: any) => om.user_id);
      const { data: profiles, error: pError } = await (supabase as any)
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      if (pError) throw pError;
      return (profiles || []).map((p: any) => ({
        id: p.user_id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Membre sans nom",
      })) as Member[];
    },
  });

  /* Receipts */
  const {
    data: receipts = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["recus", storedDateRange, storedClientId, storedMemberId, selectedStatus, debouncedQuery, sortOrder],
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
      if (storedClientId && storedClientId !== "all") {
        query = query.eq("client_id", storedClientId);
      }
      if (storedMemberId && storedMemberId !== "all") {
        query = query.eq("processed_by", storedMemberId);
      }
      if (selectedStatus && selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }
      if (debouncedQuery) {
        const escaped = debouncedQuery.replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.or(`numero_recu.ilike.%${escaped}%,enseigne.ilike.%${escaped}%,adresse.ilike.%${escaped}%`);
      }

      query = query.order("date_traitement", {
        ascending: sortOrder === "asc",
        nullsFirst: false,
      });
      query = query.order("created_at", {
        ascending: sortOrder === "asc",
      });

      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at ?? null,
        date_traitement: r.date_traitement ?? null,
        date_recu: r.date_recu ?? null,
        numero_recu: r.numero_recu ?? null,
        receipt_number: r.receipt_number ?? null,
        enseigne: r.enseigne ?? null,
        adresse: r.adresse ?? null,
        ville: r.ville ?? null,
        montant_ht: r.montant_ht ?? null,
        montant_ttc: r.montant_ttc ?? null,
        tva: r.tva ?? null,
        moyen_paiement: r.moyen_paiement ?? null,
        status: r.status ?? null,
        client_id: r.client_id ?? null,
        processed_by: r.processed_by ?? null,
        category_id: r.category_id ?? null,
        org_id: r.org_id ?? null,
      })) as Receipt[];
    },
  });

  const error = queryError ? (queryError as any).message : null;

  /* Fetch détail */
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
          clientName = (c as any)?.name ?? null;
        }

        setDetail({
          ...receiptData,
          _processedByName: processedByName,
          _clientName: clientName,
        });
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

  /* Realtime */
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
            description: `${newRecu.enseigne || "Reçu"} - ${formatCurrency(newRecu.montant_ttc)}`,
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "recus" }, (payload) => {
        const updatedRecu = payload.new as Receipt;
        const oldRecu = payload.old as Receipt;
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
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "recus" }, () => refetch())
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
  }, [refetch]);

  useEffect(() => {
    if (!isDrawerOpen) currentOpenReceiptId.current = null;
    else if (selectedId) currentOpenReceiptId.current = selectedId;
  }, [isDrawerOpen, selectedId]);

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        {/* Top actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3 w-full md:w-auto">
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

            <Button className="gap-2 flex-1 md:flex-initial" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter un reçu</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
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

          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as typeof selectedStatus)}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="traite">Traité</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
            </SelectContent>
          </Select>

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

        {/* List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Liste des reçus</CardTitle>
          </CardHeader>
          <CardContent>
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
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {receipts.map((receipt) => {
                    const dateValue = receipt.date_traitement || receipt.created_at;
                    const formattedDate = formatDate(dateValue);
                    const formattedMontantTTC = formatCurrency(receipt.montant_ttc);
                    const formattedMontantHT = formatCurrency(receipt.montant_ht);
                    const statusLabels: Record<string, string> = {
                      traite: "Validé",
                      en_cours: "En cours",
                      en_attente: "En attente",
                    };
                    return (
                      <div
                        key={receipt.id}
                        className="p-4 rounded-lg bg-card/50 border border-border cursor-pointer hover:bg-muted/50 space-y-3"
                        onClick={() => {
                          setSelectedId(receipt.id);
                          setDetail(null);
                          setDetailError(null);
                          setIsDrawerOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-base">{receipt.enseigne || "—"}</div>
                            {receipt.receipt_number && (
                              <div className="text-xs text-muted-foreground">Reçu n°{receipt.receipt_number}</div>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{formattedDate}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">TTC: </span>
                            <span className="font-semibold whitespace-nowrap tabular-nums">{formattedMontantTTC}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground text-xs">HT: </span>
                            <span className="whitespace-nowrap tabular-nums">{formattedMontantHT}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div className="text-muted-foreground">{receipt.moyen_paiement || "—"}</div>
                          <div className="inline-flex px-2 py-1 rounded text-xs bg-primary/10 text-primary">
                            {statusLabels[receipt.status || ""] || receipt.status || "—"}
                          </div>
                        </div>

                        {(receipt.ville || receipt.numero_recu) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {receipt.ville && <span>{receipt.ville}</span>}
                            {receipt.ville && receipt.numero_recu && <span>•</span>}
                            {receipt.numero_recu && <span>N° {receipt.numero_recu}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
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
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Enseigne</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ville</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant TTC</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant HT</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">TVA</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Moyen de paiement
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
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
                            {receipt.receipt_number && (
                              <div className="text-xs text-muted-foreground">Reçu n°{receipt.receipt_number}</div>
                            )}
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
                            {receipt.ville || "—"}
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
                            {formatCurrency(receipt.montant_ttc)}
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
                            {formatCurrency(receipt.montant_ht)}
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
                            {formatCurrency(receipt.tva)}
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
                            {receipt.moyen_paiement || "—"}
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

        {/* Upload dialog */}
        <UploadInstructionsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

        {/* Drawer detail */}
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
        />

        {/* Export Dialog */}
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
                  <Label htmlFor="sheets-id">ID Spreadsheet (optionnel)</Label>
                  <Input
                    id="sheets-id"
                    placeholder="1a2b3c4d..."
                    value={sheetsSpreadsheetId}
                    onChange={(e) => setSheetsSpreadsheetId(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExportOpen(false)} disabled={exportLoading}>
                Fermer
              </Button>
              <Button onClick={handleExportSubmit} disabled={exportLoading}>
                {exportLoading ? "Export en cours..." : "Valider l'export"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Recus;
