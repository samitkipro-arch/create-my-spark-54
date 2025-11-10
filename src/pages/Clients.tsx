import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, Users, Bell, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientDetailDrawer } from "@/components/Clients/ClientDetailDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

type Client = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  siret_siren?: string | null;
  legal_representative?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type ClientKpis = {
  total_clients: number;
  active_30d: number;
  to_remind_7d: number;
};

const Clients = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string>("new");
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

  // ---- Clients (liste)
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name, email, created_at, siret_siren, legal_representative, address, phone, notes")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Client[];
    },
  });

  // ---- KPI (ultra rapide via RPC)
  const { data: kpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ["client-kpis"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("client_kpis");
      if (error) throw error;
      const row = (data?.[0] ?? { total_clients: 0, active_30d: 0, to_remind_7d: 0 }) as ClientKpis;
      return row;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  const totalClients = kpis?.total_clients ?? 0;
  const activeClients = kpis?.active_30d ?? 0;
  const toRemindClients = kpis?.to_remind_7d ?? 0;

  const anyLoading = isLoadingClients || isLoadingKpis;

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setDrawerKey(client.id);
    setDrawerOpen(true);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setDrawerKey(`new-${Date.now()}`);
    setDrawerOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!toDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      // .select("id") -> force le retour des lignes supprimées
      // Si RLS bloque, data === [] => on lève une erreur lisible
      const { data, error } = await (supabase as any).from("clients").delete().eq("id", toDelete.id).select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Suppression bloquée par les règles d'accès (RLS). Vérifiez que votre policy autorise DELETE pour ce client.",
        );
      }

      toast({
        title: "Client supprimé",
        description: `« ${toDelete.name} » a été supprimé.`,
      });

      setToDelete(null);
      // Rafraîchir liste + KPI
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-kpis"] });

      if (selectedClient?.id === toDelete.id) {
        setDrawerOpen(false);
        setSelectedClient(null);
      }
    } catch (err: any) {
      toast({
        title: "Impossible de supprimer",
        description: err?.message ?? "Action interdite par la sécurité (RLS) ou autre erreur.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        {/* Header actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <Button className="gap-2 w/full md:w-auto transition-all duration-200" onClick={handleNewClient}>
            <Plus className="w-4 h-4" />
            Ajouter un client
          </Button>
        </div>

        {/* KPI cards — même design que le Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* Total clients */}
          <Card className="bg-card/60 border-border">
            <CardContent className="flex items-center justify-between p-5 md:p-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Clients</div>
                <div className="text-3xl font-semibold tracking-tight">{anyLoading ? "—" : totalClients}</div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Actifs (30j) */}
          <Card className="bg-card/60 border-border">
            <CardContent className="flex items-center justify-between p-5 md:p-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Clients actifs (30j)</div>
                <div className="text-3xl font-semibold tracking-tight">
                  {anyLoading ? "—" : `${activeClients} / ${totalClients}`}
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* À relancer (>7j) */}
          <Card className="bg-card/60 border-border">
            <CardContent className="flex items-center justify-between p-5 md:p-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Clients à relancer (&gt; 7 j)</div>
                <div className="text-3xl font-semibold tracking-tight">
                  {anyLoading ? "—" : `${toRemindClients} / ${totalClients}`}
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Bell className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <div className="relative transition-all duration-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher" className="pl-10" />
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-2.5 transition-all duration-200">
          {isLoadingClients ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement…</div>
          ) : clients.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Aucun client n&apos;a encore été ajouté
            </div>
          ) : (
            clients.map((client) => (
              <Card key={client.id} className="bg-card/50 border-border transition-all duration-200 hover:shadow-lg">
                <CardContent className="p-3.5 space-y-2 transition-all duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm cursor-pointer" onClick={() => handleClientClick(client)}>
                      {client.name}
                    </div>

                    {/* Actions mobile */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions client">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleClientClick(client)}>Modifier</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setToDelete(client)}
                        >
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="text-xs text-primary cursor-pointer" onClick={() => handleClientClick(client)}>
                    {client.email || "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Créé le {new Date(client.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop: Table */}
        <Card className="hidden md:block bg-card border-border transition-all duration-200">
          <CardContent className="p-0 transition-all duration-150">
            {isLoadingClients ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement…</div>
            ) : clients.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun client n&apos;a encore été ajouté
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du client</TableHead>
                    <TableHead>Email de contact</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium cursor-pointer" onClick={() => handleClientClick(client)}>
                        {client.name}
                      </TableCell>
                      <TableCell className="text-primary cursor-pointer" onClick={() => handleClientClick(client)}>
                        {client.email || "—"}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleClientClick(client)}>
                        {new Date(client.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions client">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleClientClick(client)}>Modifier</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setToDelete(client)}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ClientDetailDrawer
          key={drawerKey}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          client={
            selectedClient
              ? {
                  id: selectedClient.id,
                  name: selectedClient.name,
                  email: selectedClient.email || "",
                  siret_siren: selectedClient.siret_siren || undefined,
                  legal_representative: selectedClient.legal_representative || undefined,
                  address: selectedClient.address || undefined,
                  phone: selectedClient.phone || undefined,
                  notes: selectedClient.notes || undefined,
                }
              : null
          }
        />
      </div>

      {/* Confirm suppression */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client <span className="font-medium">{toDelete?.name}</span> sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              onClick={handleDeleteClient}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Clients;
