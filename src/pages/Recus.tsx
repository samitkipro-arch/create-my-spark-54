import { useState, useEffect } from "react";
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

type Receipt = {
  id: number;
  created_at: string | null;
  date_traitement?: string | null;
  numero_recu?: string | null;
  enseigne?: string | null;
  adresse?: string | null;
  montant?: number | null;
  montant_ttc?: number | null;
  tva?: number | null;
  client_id?: string | null;
  processed_by?: string | null;
  status?: string | null;
};

type Client = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  name: string;
  role?: string;
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
  const { dateRange: storedDateRange, clientId: storedClientId, memberId: storedMemberId, setClientId, setMemberId } = useGlobalFilters();
  
  // Local filters
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "traite" | "en_cours" | "en_attente">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Debounce recherche
  const debouncedQuery = useDebounce(searchQuery, 400);
  
  // Drawer détail
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load clients with realtime
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

  // Load members with profiles and realtime
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["members-with-profiles"],
    queryFn: async () => {
      const { data: orgMembers, error: omError } = await (supabase as any)
        .from("org_members")
        .select("user_id, role")
        .eq("is_active", true);
      
      if (omError) throw omError;
      if (!orgMembers || orgMembers.length === 0) return [];
      
      const userIds = orgMembers.map((om: any) => om.user_id);
      
      const { data: profiles, error: pError } = await (supabase as any)
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);
      
      if (pError) throw pError;
      
      return (profiles || []).map((p: any) => {
        const orgMember = orgMembers.find((om: any) => om.user_id === p.user_id);
        return {
          id: p.user_id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Membre sans nom',
          role: orgMember?.role || 'viewer',
        };
      }) as Member[];
    },
  });

  // Load receipts with all filters
  const { data: receipts = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ["recus", storedDateRange, storedClientId, storedMemberId, selectedStatus, debouncedQuery, sortOrder],
    queryFn: async () => {
      let query = (supabase as any)
        .from("recus")
        .select("id, created_at, date_traitement, numero_recu, enseigne, adresse, montant, montant_ttc, tva, client_id, processed_by, status");

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
        query = query.or(
          `numero_recu.ilike.%${escaped}%,enseigne.ilike.%${escaped}%,adresse.ilike.%${escaped}%`
        );
      }

      // Apply sorting
      query = query.order("date_traitement", { ascending: sortOrder === "asc", nullsFirst: false });
      query = query.order("created_at", { ascending: sortOrder === "asc" });

      // Limit to 100 for performance
      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at ?? null,
        date_traitement: r.date_traitement ?? null,
        numero_recu: r.numero_recu ?? null,
        enseigne: r.enseigne ?? null,
        adresse: r.adresse ?? null,
        montant: r.montant ?? null,
        montant_ttc: r.montant_ttc ?? null,
        tva: r.tva ?? null,
        client_id: r.client_id ?? null,
        processed_by: r.processed_by ?? null,
        status: r.status ?? null,
      })) as Receipt[];
    },
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
        const { data: r, error: e1 } = await (supabase as any)
          .from("recus")
          .select("*")
          .eq("id", selectedId)
          .single();
        if (e1) throw e1;

        const receiptData = r as any;
        let processedByName: string | null = null;
        let clientName: string | null = null;

        // 2) profil (traité par)
        if (receiptData?.processed_by) {
          const { data: p } = await (supabase as any)
            .from("profiles")
            .select("first_name, last_name")
            .eq("user_id", receiptData.processed_by)
            .maybeSingle();
          const profileData = p as any;
          processedByName = profileData ? `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim() : null;
        }

        // 3) client assigné
        if (receiptData?.client_id) {
          const { data: c } = await (supabase as any)
            .from("clients")
            .select("name")
            .eq("id", receiptData.client_id)
            .maybeSingle();
          const clientData = c as any;
          clientName = clientData?.name ?? null;
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

  // Realtime updates
  useEffect(() => {
    const recusChannel = supabase
      .channel("recus-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => {
        refetch();
      })
      .subscribe();

    const clientsChannel = supabase
      .channel("clients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        refetchClients();
      })
      .subscribe();

    const membersChannel = supabase
      .channel("members-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "org_members" }, () => {
        refetchMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(recusChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, []);

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reçus</h1>
          <div className="flex gap-3">
            <Button variant="outline">Exporter</Button>
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Ajouter un reçu
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
            <SelectTrigger className="w-[240px]">
              <ArrowDownUp className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Du plus récent au plus ancien</SelectItem>
              <SelectItem value="asc">Du plus ancien au plus récent</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={storedClientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={storedMemberId} onValueChange={setMemberId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tous les membres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les membres</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                  {member.role && member.role !== 'viewer' && (
                    <span className="ml-2 text-xs text-muted-foreground">({member.role})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as typeof selectedStatus)}>
            <SelectTrigger className="w-[160px]">
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

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Liste des reçus</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Chargement…
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-16 text-sm text-destructive">
                {error}
              </div>
            ) : receipts.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun reçu trouvé
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">N° Reçu</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Enseigne</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Adresse</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant TTC</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => {
                      const dateValue = receipt.date_traitement || receipt.created_at;
                      const formattedDate = dateValue 
                        ? new Date(dateValue).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "—";
                      
                      const montantTTC = receipt.montant_ttc ?? receipt.montant;
                      const formattedMontant = montantTTC !== null && montantTTC !== undefined
                        ? `${Number(montantTTC).toFixed(2)} €`
                        : "—";
                      
                      const formattedTVA = receipt.tva !== null && receipt.tva !== undefined
                        ? `${Number(receipt.tva).toFixed(2)} €`
                        : "—";

                      return (
                        <tr 
                          key={receipt.id} 
                          className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}
                        >
                          <td className="py-3 px-4 text-sm">{formattedDate}</td>
                          <td className="py-3 px-4 text-sm">{receipt.numero_recu || "—"}</td>
                          <td className="py-3 px-4 text-sm">{receipt.enseigne || "—"}</td>
                          <td className="py-3 px-4 text-sm">{receipt.adresse || "—"}</td>
                          <td className="py-3 px-4 text-sm text-right font-medium">{formattedMontant}</td>
                          <td className="py-3 px-4 text-sm text-right">{formattedTVA}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <UploadInstructionsDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />

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
        />
      </div>
    </MainLayout>
  );
};

export default Recus;
