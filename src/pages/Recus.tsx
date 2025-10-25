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

type Receipt = {
  id: number;
  created_at: string | null;
  date_traitement?: string | null;
  enseigne?: string | null;
  adresse?: string | null;
  montant?: number | null;
  montant_ttc?: number | null;
  tva?: number | null;
  client_id?: string | null;
  status?: string | null;
};

type Client = {
  id: string;
  name: string;
  display_name?: string | null;
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
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Filtres
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedClient, setSelectedClient] = useState<string | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "traite" | "en_cours" | "en_attente">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Debounce recherche
  const debouncedQuery = useDebounce(searchQuery, 350);
  
  // Drawer détail
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Charger les clients
  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from("clients" as any)
        .select("id, name")
        .order("name", { ascending: true });
      
      setClients((data as unknown as Client[]) || []);
    };
    
    fetchClients();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);

    try {
      // Map des filtres ("all" → null)
      const p_client_id = selectedClient && selectedClient !== "all" ? selectedClient : null;
      const p_status = selectedStatus && selectedStatus !== "all" ? selectedStatus : null;
      const p_query = debouncedQuery || null;

      // 🔹 Tentative principale : RPC
      let data: any[] | null = null;
      let rpcError: any = null;

      ({ data, error: rpcError } = await (supabase.rpc as any)("recus_feed_list", {
        p_from: null,
        p_to: null,
        p_client_ids: p_client_id ? [p_client_id] : null,
        p_statuses: p_status ? [p_status] : null,
        p_search: p_query,
        p_limit: 100,
        p_offset: 0,
      }));

      // 🔸 Fallback : si la RPC échoue, lire directement dans la vue
      if (rpcError) {
        let q = (supabase as any).from("recus_feed").select("id, created_at, date_traitement, enseigne, adresse, montant, montant_ttc, tva, client_id, status");
        
        if (p_client_id) q = q.eq("client_id", p_client_id);
        if (p_status) q = q.eq("status", p_status);
        if (p_query) {
          const s = p_query.replace(/%/g, "\\%").replace(/_/g, "\\_");
          q = q.or(
            `numero_recu.ilike.%${s}%,enseigne.ilike.%${s}%,adresse.ilike.%${s}%`
          );
        }
        
        // Order by date_traitement with fallback to created_at
        q = q.order("date_traitement", { ascending: sortOrder === "asc", nullsFirst: false });
        q = q.order("created_at", { ascending: sortOrder === "asc" });
        q = q.limit(100);
        
        const fb = await q;
        data = fb.data ?? [];
        rpcError = fb.error;
      } else {
        // Sort RPC results client-side
        data = (data || []).sort((a: any, b: any) => {
          const dateA = new Date(a.date_traitement || a.created_at || 0).getTime();
          const dateB = new Date(b.date_traitement || b.created_at || 0).getTime();
          return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        });
      }

      if (rpcError) throw rpcError;

      // Mapping propre pour le tableau
      const safe = (data ?? []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at ?? null,
        date_traitement: r.date_traitement ?? r.created_at ?? null,
        enseigne: r.enseigne ?? null,
        adresse: r.adresse ?? null,
        montant: r.montant ?? null,
        montant_ttc: r.montant_ttc ?? r.montant ?? null,
        tva: r.tva ?? null,
        client_id: r.client_id ?? null,
        status: r.status ?? null,
      }));

      setReceipts(safe);
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch détail du reçu
  useEffect(() => {
    if (!selectedId || !isDrawerOpen) return;

    (async () => {
      setDetailLoading(true);
      setDetailError(null);

      try {
        // 1) lecture principale (vue)
        const { data: r, error: e1 } = await supabase
          .from("recus_feed" as any)
          .select("*")
          .eq("id", selectedId)
          .single();
        if (e1) throw e1;

        const receiptData = r as any;
        let processedByName: string | null = null;
        let clientName: string | null = null;

        // 2) profil (traité par)
        if (receiptData?.processed_by) {
          const { data: p } = await supabase
            .from("profiles" as any)
            .select("first_name, last_name")
            .eq("user_id", receiptData.processed_by)
            .maybeSingle();
          const profileData = p as any;
          processedByName = profileData ? `${profileData.first_name ?? ""} ${profileData.last_name ?? ""}`.trim() : null;
        }

        // 3) client assigné
        if (receiptData?.client_id) {
          const { data: c } = await supabase
            .from("clients" as any)
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

  // Refetch quand les filtres changent
  useEffect(() => {
    fetchReceipts();
  }, [sortOrder, selectedClient, selectedStatus, debouncedQuery]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("recus-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => {
        fetchReceipts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortOrder, selectedClient, selectedStatus, debouncedQuery]);

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
          
          <Select value={selectedClient} onValueChange={(v) => setSelectedClient(v as typeof selectedClient)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={String(client.id)}>
                  {client.name}
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
              <div className="flex items-center justify-center py-16 text-destructive">
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
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date de traitement</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Enseigne</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Montant TTC</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">TVA récupérable</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Assigné à</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Traité par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => {
                      const dateValue = receipt.date_traitement || receipt.created_at;
                      const formattedDate = dateValue 
                        ? new Date(dateValue).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "—";
                      
                      const montantTTC = receipt.montant_ttc ?? receipt.montant;
                      const formattedMontant = montantTTC !== null && montantTTC !== undefined
                        ? `${montantTTC.toFixed(2)} €`
                        : "—";
                      
                      const formattedTVA = receipt.tva !== null && receipt.tva !== undefined
                        ? `${receipt.tva.toFixed(2)} €`
                        : "—";

                      return (
                        <tr 
                          key={receipt.id} 
                          className="border-b border-border hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setSelectedId(receipt.id);
                            setDetail(null);
                            setDetailError(null);
                            setIsDrawerOpen(true);
                          }}
                        >
                          <td className="py-3 px-4 text-sm">{formattedDate}</td>
                          <td className="py-3 px-4 text-sm">{receipt.enseigne || "—"}</td>
                          <td className="py-3 px-4 text-sm text-right">{formattedMontant}</td>
                          <td className="py-3 px-4 text-sm text-right">{formattedTVA}</td>
                          <td className="py-3 px-4 text-sm">—</td>
                          <td className="py-3 px-4 text-sm">—</td>
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
