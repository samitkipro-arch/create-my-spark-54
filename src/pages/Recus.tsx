import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, ChevronDown, Plus, Search } from "lucide-react";
import { UploadInstructionsDialog } from "@/components/Recus/UploadInstructionsDialog";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

type DateRange = {
  from: Date | null;
  to: Date | null;
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
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedClient, setSelectedClient] = useState<string | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "traite" | "en_cours" | "en_attente">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Debounce recherche
  const debouncedQuery = useDebounce(searchQuery, 350);

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
    try {
      setLoading(true);
      setError(null);
      
      // Construire la requête de base
      let q = supabase.from("recus_feed" as any).select("*");
      
      // Bornes de date (inclusives) - APPLIQUER UNIQUEMENT si l'utilisateur a choisi une période
      const hasRange = Boolean(dateRange?.from) || Boolean(dateRange?.to);
      const DATE_COL = "date_traitement";
      
      const startIso = dateRange?.from 
        ? new Date(new Date(dateRange.from).setHours(0, 0, 0, 0)).toISOString() 
        : null;
      const endIso = dateRange?.to 
        ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999)).toISOString() 
        : null;
      
      if (hasRange) {
        if (startIso) q = q.gte(DATE_COL, startIso);
        if (endIso) q = q.lte(DATE_COL, endIso);
      }
      
      // Filtres client / statut - N'APPLIQUER QUE si ≠ "all"
      if (selectedClient && selectedClient !== "all") {
        q = q.eq("client_id", selectedClient);
      }
      if (selectedStatus && selectedStatus !== "all") {
        q = q.eq("status", selectedStatus);
      }
      
      // Recherche texte - ILIKE multi-colonnes
      if (debouncedQuery) {
        const s = debouncedQuery.replace(/%/g, "\\%").replace(/_/g, "\\_");
        q = q.or(`numero_recu.ilike.%${s}%,enseigne.ilike.%${s}%,adresse.ilike.%${s}%`);
      }
      
      // Tri + limite
      q = q.order(DATE_COL, { ascending: false }).limit(100);
      
      const { data, error: fetchError } = await q;

      if (fetchError) throw fetchError;
      setReceipts((data as unknown as Receipt[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  // Refetch quand les filtres changent
  useEffect(() => {
    fetchReceipts();
  }, [dateRange, selectedClient, selectedStatus, debouncedQuery]);

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
  }, [dateRange, selectedClient, selectedStatus, debouncedQuery]);
  
  // Formater la période affichée
  const dateRangeLabel = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return "Sélectionner une période";
    }
    if (dateRange.from && !dateRange.to) {
      return format(dateRange.from, "dd/MM/yyyy", { locale: fr });
    }
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd/MM/yyyy", { locale: fr })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: fr })}`;
    }
    return "Sélectionner une période";
  }, [dateRange]);

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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {dateRangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => setDateRange({
                  from: range?.from,
                  to: range?.to
                })}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
          
          <Select value={selectedClient} onValueChange={(v) => setSelectedClient(v as typeof selectedClient)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Sélectionner un client" />
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
                        <tr key={receipt.id} className="border-b border-border hover:bg-muted/50">
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
      </div>
    </MainLayout>
  );
};

export default Recus;
