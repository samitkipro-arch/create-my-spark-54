import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical } from "lucide-react";
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

const Clients = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Force remount du drawer (évite de réutiliser le dernier client)
  const [drawerKey, setDrawerKey] = useState<string>("new");

  // Suppression
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
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

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setDrawerKey(client.id); // remonte le drawer pour ce client
    setDrawerOpen(true);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setDrawerKey(`new-${Date.now()}`); // remonte le drawer en mode "nouveau"
    setDrawerOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!toDelete) return;
    try {
      const { error } = await (supabase as any).from("clients").delete().eq("id", toDelete.id);
      if (error) throw error;

      toast({
        title: "Client supprimé",
        description: `« ${toDelete.name} » a été supprimé.`,
      });

      setToDelete(null);
      // Rafraîchir la liste
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      // Fermer le drawer si on supprimait celui qui était ouvert
      if (selectedClient?.id === toDelete.id) {
        setDrawerOpen(false);
        setSelectedClient(null);
      }
    } catch (err: any) {
      toast({
        title: "Erreur lors de la suppression",
        description: err?.message ?? "Une erreur est survenue.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <Button className="gap-2 w/full md:w-auto transition-all duration-200" onClick={handleNewClient}>
            <Plus className="w-4 h-4" />
            Ajouter un client
          </Button>
        </div>

        <div className="relative transition-all duration-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher" className="pl-10" />
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-2.5 transition-all duration-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement…</div>
          ) : clients.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Aucun client n&apos;a encore été ajouté
            </div>
          ) : (
            clients.map((client) => (
              <Card
                key={client.id}
                className="bg-card/50 border-border transition-all duration-200 hover:shadow-lg"
              >
                <CardContent className="p-3.5 space-y-2 transition-all duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="font-semibold text-sm cursor-pointer"
                      onClick={() => handleClientClick(client)}
                    >
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

                  <div
                    className="text-xs text-primary cursor-pointer"
                    onClick={() => handleClientClick(client)}
                  >
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
            {isLoading ? (
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
                      <TableCell
                        className="font-medium cursor-pointer"
                        onClick={() => handleClientClick(client)}
                      >
                        {client.name}
                      </TableCell>
                      <TableCell
                        className="text-primary cursor-pointer"
                        onClick={() => handleClientClick(client)}
                      >
                        {client.email || "—"}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => handleClientClick(client)}
                      >
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
          key={drawerKey} // force le remount pour reset le formulaire
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
              Cette action est irréversible. Le client{" "}
              <span className="font-medium">{toDelete?.name}</span> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteClient}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Clients;
