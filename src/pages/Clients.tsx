import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientDetailDrawer } from "@/components/Clients/ClientDetailDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type Client = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  vat_number?: string | null;
  address?: string | null;
  phone?: string | null;
};

const Clients = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name, email, created_at, vat_number, address, phone")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as Client[];
    },
  });

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setDrawerOpen(true);
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <Button
            className="gap-2 w-full md:w-auto transition-all duration-200"
            onClick={() => {
              setSelectedClient(null);
              setDrawerOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Ajouter un client
          </Button>
        </div>

        <div className="relative transition-all duration-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher"
            className="pl-10"
          />
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-2.5 transition-all duration-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : clients.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Aucun client n'a encore été ajouté
            </div>
          ) : (
            clients.map((client) => (
              <Card 
                key={client.id} 
                className="bg-card/50 border-border transition-all duration-200 hover:shadow-lg cursor-pointer"
                onClick={() => handleClientClick(client)}
              >
                <CardContent className="p-3.5 space-y-2 transition-all duration-150">
                  <div className="font-semibold text-sm">{client.name}</div>
                  <div className="text-xs text-primary">
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
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Chargement…
              </div>
            ) : clients.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun client n'a encore été ajouté
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du client</TableHead>
                    <TableHead>Email de contact</TableHead>
                    <TableHead>Date de création</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleClientClick(client)}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-primary">{client.email || "—"}</TableCell>
                      <TableCell>{new Date(client.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ClientDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          client={selectedClient ? {
            name: selectedClient.name,
            email: selectedClient.email || '',
            vat_number: selectedClient.vat_number || undefined,
            address: selectedClient.address || undefined,
            phone: selectedClient.phone || undefined
          } : null}
        />
      </div>
    </MainLayout>
  );
};

export default Clients;
