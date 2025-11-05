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
type Client = {
  id: string;
  name: string;
};
type Member = {
  id: string;
  name: string;
};

// Hook debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
const Recus = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Global filters from store
  const {
    dateRange: storedDateRange,
    clientId: storedClientId,
    memberId: storedMemberId,
    setClientId,
    setMemberId
  } = useGlobalFilters();

  // Local filters
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "traite" | "en_cours" | "en_attente">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Export selection state with sessionStorage persistence
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem("receipts:selectedIds");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMethod, setExportMethod] = useState<"sheets" | "excel" | "drive" | "">("");
  const [exportEmail, setExportEmail] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  // n8n webhook URL
  const N8N_EXPORT_URL =
    (import.meta as any).env?.VITE_N8N_EXPORT_URL ??
    "https://samilzr.app.n8n.cloud/webhook-test/export-receipt";

  // Debounce recherche
  const debouncedQuery = useDebounce(searchQuery, 400);

  // Persist selectedIds to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("receipts:selectedIds", JSON.stringify(selectedIds));
    } catch (e) {
      console.error("Failed to save selection to sessionStorage", e);
    }
  }, [selectedIds]);

  // Selection helpers
  const toggleOne = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = (allIds: string[]) =>
    setSelectedIds(prev => prev.length === allIds.length ? [] : allIds);
  const resetExportUI = () => {
    setSelectedIds([]);
    setExportOpen(false);
    setExportMethod("");
    setExportEmail("");
    setSheetUrl("");
    setDriveFolderId("");
  };

  // Handle export validation and submission
  const handleExportSubmit = async () => {
    if (!exportMethod || !exportEmail || selectedIds.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une méthode et renseigner un email.",
        variant: "destructive",
      });
      return;
    }

    // Validation spécifique pour Google Sheets
    if (exportMethod === "sheets" && !sheetUrl) {
      toast({
        title: "Erreur",
        description: "L'URL Google Sheet est obligatoire pour lancer l'export.",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(true);
    try {
      // Récupérer l'utilisateur courant
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Utilisateur non authentifié");
      }

      // Récupérer l'org_id de l'utilisateur
      const { data: orgMember, error: orgError } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (orgError || !orgMember) {
        throw new Error("Organisation introuvable");
      }

      // Construire le payload avec les IDs en nombres
      const payload: any = {
        org_id: orgMember.org_id,
        email: exportEmail,
        method: exportMethod,
        receipt_ids: selectedIds.map(id => parseInt(id, 10)),
      };

      // Ajouter l'URL du sheet si méthode sheets
      if (exportMethod === "sheets" && sheetUrl) {
        payload.sheet_url = sheetUrl;
      }

      const response = await fetch(N8N_EXPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();

      if (result.download_url) {
        window.open(result.download_url, "_blank");
      }

      toast({
        title: "Export lancé !",
        description: "Le lien/fichier sera envoyé par e-mail.",
      });

      resetExportUI();
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'export.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Drawer détail
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const currentOpenReceiptId = useRef<number | null>(null);
  const isDrawerOpenRef = useRef(false);

  // Load clients with realtime
  const {
    data: clients = [],
    refetch: refetchClients
  } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const {
        data,
        error
      } = await (supabase as any).from("clients").select("id, name").order("name", {
        ascending: true
      });
      if (error) throw error;
      return (data || []) as Client[];
    }
  });

  // Load members with profiles and realtime
  const {
    data: members = [],
    refetch: refetchMembers
  } = useQuery({
    queryKey: ["members-with-profiles"],
    queryFn: async () => {
      const {
        data: orgMembers,
        error: omError
      } = await (supabase as any).from("org_members").select("user_id");
      if (omError) throw omError;
      if (!orgMembers || orgMembers.length === 0) return [];
      const userIds = orgMembers.map((om: any) => om.user_id);
      const {
        data: profiles,
        error: pError
      } = await (supabase as any).from("profiles").select("user_id, first_name, last_name").in("user_id", userIds);
      if (pError) throw pError;
      return (profiles || []).map((p: any) => ({
        id: p.user_id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Membre sans nom'
      })) as Member[];
    }
  });

  // Load receipts with all filters
  const {
    data: receipts = [],
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ["recus", storedDateRange, storedClientId, storedMemberId, selectedStatus, debouncedQuery, sortOrder],
    queryFn: async () => {
      let query = (supabase as any).from("recus").select("id, created_at, date_traitement, date_recu, numero_recu, receipt_number, enseigne, adresse, ville, montant_ht, montant_ttc, tva, moyen_paiement, status, client_id, processed_by, category_id, org_id");

      // Apply date range filter from global store (if set)
      if (storedDateRange.from && storedDateRange.to) {
        query = query.gte("date_traitement", storedDateRange.from);
        query = query.lte("date_traitement", storedDateRange.to);
      }

      // Apply client filter from global store
      if (storedClientId && storedClientId !== "all") {
        query = query.eq("client_id", storedClientId);
      }

      // Apply member filter from global store
      if (storedMemberId && storedMemberId !== "all") {
        query = query.eq("processed_by", storedMemberId);
      }

      // Apply status filter (local)
      if (selectedStatus && selectedStatus !== "all") {
        query = query.eq("status", selectedStatus);
      }

      // Apply search filter (local) with escaped characters
      if (debouncedQuery) {
        const escaped = debouncedQuery.replace(/%/g, "\\%").replace(/_/g, "\\_");
        query = query.or(`numero_recu.ilike.%${escaped}%,enseigne.ilike.%${escaped}%,adresse.ilike.%${escaped}%`);
      }

      // Apply sorting
      query = query.order("date_traitement", {
        ascending: sortOrder === "asc",
        nullsFirst: false
      });
      query = query.order("created_at", {
        ascending: sortOrder === "asc"
      });

      // Limit to 100 for performance
      query = query.limit(100);
      const {
        data,
        error
      } = await query;
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
        org_id: r.org_id ?? null
      })) as Receipt[];
    }
  });
  const error = queryError ? (queryError as any).message : null;

  // Fetch détail du reçu
  useEffect(() => {
    if (!selectedId || !isDrawerOpen) return;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        // 1) lecture principale
        const {
          data: r,
          error: e1
        } = await (supabase as any).from("recus").select("*").eq("id", selectedId).single();
        if (e1) throw e1;
        const receiptData = r as any;
        let processedByName: string | null = null;
        let clientName: string | null = null;

        // 2) profil (traité par)
        if (receiptData?.processed_by) {
          const {
            data: p
          } = await (supabase as any).from("profiles").select("first_name, last_name").eq("user_id", receiptData.processed_by).maybeSingle();
          const profileData = p as any;
          processedByName = profileData ? `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim() : null;
        }

        // 3) client assigné
        if (receiptData?.client_id) {
          const {
            data: c
          } = await (supabase as any).from("clients").select("name").eq("id", receiptData.client_id).maybeSingle();
          const clientData = c as any;
          clientName = clientData?.name ?? null;
        }
        setDetail({
          ...receiptData,
          _processedByName: processedByName,
          _clientName: clientName
        });
      } catch (err: any) {
        setDetailError(err?.message || "Erreur lors du chargement du reçu");
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [selectedId, isDrawerOpen]);

  // Sync ref avec state
  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);

  // Realtime updates
  useEffect(() => {
    const recusChannel = supabase.channel("recus-realtime").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "recus"
    }, payload => {
      const newRecu = payload.new as Receipt;
      console.log("🔴 Realtime INSERT:", newRecu);

      // Refetch pour mettre à jour la liste
      refetch();

      // Ouvrir automatiquement le drawer avec le nouveau reçu si pas déjà ouvert
      if (!isDrawerOpenRef.current || currentOpenReceiptId.current !== newRecu.id) {
        currentOpenReceiptId.current = newRecu.id;
        setSelectedId(newRecu.id);
        setDetail(null);
        setDetailError(null);
        setIsDrawerOpen(true);

        // Afficher une notification
        toast({
          title: "Nouveau reçu analysé !",
          description: `${newRecu.enseigne || 'Reçu'} - ${formatCurrency(newRecu.montant_ttc)}`
        });
      }
    }).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "recus"
    }, payload => {
      const updatedRecu = payload.new as Receipt;
      const oldRecu = payload.old as Receipt;
      console.log("🔵 Realtime UPDATE:", {
        id: updatedRecu.id,
        oldStatus: oldRecu.status,
        newStatus: updatedRecu.status,
        receipt_number: updatedRecu.receipt_number
      });

      // Refetch pour mettre à jour la liste
      refetch();

      // Ouvrir automatiquement le drawer dès qu'un receipt_number est assigné
      // ou si le statut passe à 'traite'
      const shouldOpen = updatedRecu.receipt_number && !oldRecu.receipt_number ||
      // Nouveau numéro assigné
      updatedRecu.status === 'traite' && oldRecu.status !== 'traite' // Status devient traite
      ;
      if (shouldOpen) {
        console.log("✅ Ouverture automatique du drawer pour reçu", updatedRecu.id);
        if (!isDrawerOpenRef.current || currentOpenReceiptId.current !== updatedRecu.id) {
          currentOpenReceiptId.current = updatedRecu.id;
          setSelectedId(updatedRecu.id);
          setDetail(null);
          setDetailError(null);
          setIsDrawerOpen(true);

          // Afficher une notification
          toast({
            title: "Reçu validé !",
            description: `${updatedRecu.enseigne || 'Reçu'} n°${updatedRecu.receipt_number || '—'}`
          });
        }
      }
    }).on("postgres_changes", {
      event: "DELETE",
      schema: "public",
      table: "recus"
    }, () => {
      refetch();
    }).subscribe();
    const clientsChannel = supabase.channel("clients-realtime").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "clients"
    }, () => {
      refetchClients();
    }).subscribe();
    const membersChannel = supabase.channel("members-realtime").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "org_members"
    }, () => {
      refetchMembers();
    }).subscribe();
    return () => {
      supabase.removeChannel(recusChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [refetch]);

  // Mettre à jour la référence quand le drawer s'ouvre/ferme
  useEffect(() => {
    if (!isDrawerOpen) {
      currentOpenReceiptId.current = null;
    } else if (selectedId) {
      currentOpenReceiptId.current = selectedId;
    }
  }, [isDrawerOpen, selectedId]);
  return <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <div className="flex gap-3 w-full md:w-auto transition-all duration-200">
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

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 transition-all duration-200">
          <Select value={sortOrder} onValueChange={v => setSortOrder(v as "desc" | "asc")}>
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
              {clients.map(client => <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={storedMemberId || "all"} onValueChange={setMemberId}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Tous les membres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les membres</SelectItem>
              {members.map(member => <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={selectedStatus} onValueChange={v => setSelectedStatus(v as typeof selectedStatus)}>
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
              <Input placeholder="Rechercher par client, numéro ou adresse" className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>

        <Card className="bg-card border-border transition-all duration-200">
          <CardHeader className="transition-all duration-150">
            <CardTitle>Liste des reçus</CardTitle>
          </CardHeader>
          <CardContent className="transition-all duration-200">
            {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground">
                Chargement…
              </div> : error ? <div className="flex items-center justify-center py-16 text-sm text-destructive">
                {error}
              </div> : receipts.length === 0 ? <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun reçu n'a encore été traité
              </div> : <>
                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3 transition-all duration-200 pb-24">
                  {receipts.map(receipt => {
                const dateValue = receipt.date_traitement || receipt.created_at;
                const formattedDate = formatDate(dateValue);
                const formattedMontantTTC = formatCurrency(receipt.montant_ttc);
                const formattedMontantHT = formatCurrency(receipt.montant_ht);
                const statusLabels: Record<string, string> = {
                  traite: "Validé",
                  en_cours: "En cours",
                  en_attente: "En attente"
                };
                const isSelected = selectedIds.includes(String(receipt.id));
                return <div 
                  key={receipt.id} 
                  className={`relative p-4 rounded-lg bg-card/50 border cursor-pointer hover:bg-muted/50 transition-all duration-200 space-y-3 ${
                    isSelected ? 'ring-2 ring-primary/40 border-primary/40' : 'border-border'
                  }`}
                  onClick={() => {
                    toggleOne(String(receipt.id));
                  }}
                  data-selected={isSelected}
                >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {/* Circular checkbox aligned with title (mobile only) */}
                            <div 
                              className="md:hidden h-7 w-7 rounded-full bg-card shadow-sm ring-1 ring-border flex items-center justify-center flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOne(String(receipt.id));
                              }}
                              aria-label="Sélectionner ce reçu"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOne(String(receipt.id))}
                                className="h-5 w-5 rounded-full"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                            <div>
                              <div className="font-semibold text-base">{receipt.enseigne || "—"}</div>
                              {receipt.receipt_number && <div className="text-xs text-muted-foreground">Reçu n°{receipt.receipt_number}</div>}
                            </div>
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
                            {statusLabels[receipt.status || ''] || receipt.status || "—"}
                          </div>
                        </div>
                        {(receipt.ville || receipt.numero_recu) && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {receipt.ville && <span>{receipt.ville}</span>}
                            {receipt.ville && receipt.numero_recu && <span>•</span>}
                            {receipt.numero_recu && <span>N° {receipt.numero_recu}</span>}
                          </div>}
                      </div>;
              })}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-10 py-3 px-4">
                        <Checkbox
                          checked={selectedIds.length === receipts.length && receipts.length > 0}
                          onCheckedChange={() => toggleAll(receipts.map(r => String(r.id)))}
                          disabled={receipts.length === 0}
                          aria-label="Tout sélectionner"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Enseigne</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ville</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant TTC</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant HT</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">TVA</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Moyen de paiement</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date de traitement</th>
                      
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map(receipt => {
                    const statusLabels: Record<string, string> = {
                      traite: "Validé",
                      en_cours: "En cours",
                      en_attente: "En attente"
                    };
                    return <tr key={receipt.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(String(receipt.id))}
                              onCheckedChange={() => toggleOne(String(receipt.id))}
                            />
                          </td>
                          <td className="py-3 px-4 text-sm cursor-pointer" onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}>
                            <div className="font-medium">{receipt.enseigne || "—"}</div>
                            {receipt.receipt_number && <div className="text-xs text-muted-foreground">Reçu n°{receipt.receipt_number}</div>}
                          </td>
                          <td className="py-3 px-4 text-sm cursor-pointer" onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}>{receipt.ville || "—"}</td>
                          <td className="py-3 px-4 text-sm text-right font-medium whitespace-nowrap tabular-nums cursor-pointer" onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}>
                            {formatCurrency(receipt.montant_ttc)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right whitespace-nowrap tabular-nums cursor-pointer" onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}>
                            {formatCurrency(receipt.montant_ht)}
                          </td>
                          <td className="py-3 px-4 text-sm text-right whitespace-nowrap tabular-nums cursor-pointer" onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}>
                            {formatCurrency(receipt.tva)}
                          </td>
                          <td className="py-3 px-4 text-sm cursor-pointer" onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}>{receipt.moyen_paiement || "—"}</td>
                          <td className="py-3 px-4 text-sm cursor-pointer" onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}>
                            {formatDate(receipt.date_traitement || receipt.created_at)}
                          </td>
                          
                        </tr>;
                  })}
                  </tbody>
                </table>
                </div>
              </>}
          </CardContent>
        </Card>

        {/* Mobile sticky action bar */}
        {selectedIds.length > 0 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg safe-area-inset-bottom">
            <div className="flex items-center gap-2 p-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAll(receipts.map(r => String(r.id)))}
                className="flex-1"
              >
                Tout sélectionner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="flex-1"
              >
                Effacer
              </Button>
              <Button
                size="sm"
                onClick={() => setExportOpen(true)}
                className="flex-1"
              >
                Exporter ({selectedIds.length})
              </Button>
            </div>
          </div>
        )}

        <UploadInstructionsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

        <ReceiptDetailDrawer open={isDrawerOpen} onOpenChange={open => {
        setIsDrawerOpen(open);
        if (!open) {
          setSelectedId(null);
          setDetail(null);
          setDetailError(null);
        }
      }} detail={detail} loading={detailLoading} error={detailError} clients={clients} members={members} />

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
                    <Label htmlFor="sheets" className="font-normal cursor-pointer">Google Sheets</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="excel" id="excel" />
                    <Label htmlFor="excel" className="font-normal cursor-pointer">Excel</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="drive" id="drive" />
                    <Label htmlFor="drive" className="font-normal cursor-pointer">Google Drive</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="export-email">Email destinataire *</Label>
                <Input
                  id="export-email"
                  type="email"
                  placeholder="email@exemple.fr"
                  value={exportEmail}
                  onChange={(e) => setExportEmail(e.target.value)}
                />
              </div>

              {exportMethod === "sheets" && (
                <div className="space-y-2">
                  <Label htmlFor="sheet-url">URL du Google Sheet cible *</Label>
                  <Input
                    id="sheet-url"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Cette URL est obligatoire. Finvisor va ajouter une ligne dans ce document Google Sheets.
                  </p>
                </div>
              )}

              {exportMethod === "drive" && (
                <div className="space-y-2">
                  <Label htmlFor="drive-folder">ID Dossier Drive (optionnel)</Label>
                  <Input
                    id="drive-folder"
                    placeholder="1a2b3c4d..."
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
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
    </MainLayout>;
};
export default Recus;