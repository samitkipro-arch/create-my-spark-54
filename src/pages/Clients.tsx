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

const mockClients = [
  { name: "Société Verne", email: "contact@societe-verne.fr", date: "22/10/2025" },
  { name: "Hôtel Riverside", email: "reservation@riverside-hotel.fr", date: "22/10/2025" },
  { name: "Boulangerie du Coin", email: "bonjour@boulangerie-ducoin.fr", date: "22/10/2025" },
  { name: "Garage Auto Plus", email: "service@autoplus-garage.fr", date: "22/10/2025" },
  { name: "Cabinet Médical Centre", email: "accueil@cabinet-centre.fr", date: "22/10/2025" },
];

const Clients = () => {
  const [selectedClient, setSelectedClient] = useState<typeof mockClients[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleClientClick = (client: typeof mockClients[0]) => {
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
          {mockClients.map((client) => (
            <Card 
              key={client.email} 
              className="bg-card/50 border-border transition-all duration-200 hover:shadow-lg cursor-pointer"
              onClick={() => handleClientClick(client)}
            >
              <CardContent className="p-3.5 space-y-2 transition-all duration-150">
                <div className="font-semibold text-sm">{client.name}</div>
                <div className="text-xs text-primary">
                  {client.email}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Créé le {client.date}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: Table */}
        <Card className="hidden md:block bg-card border-border transition-all duration-200">
          <CardContent className="p-0 transition-all duration-150">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du client</TableHead>
                  <TableHead>Email de contact</TableHead>
                  <TableHead>Date de création</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockClients.map((client) => (
                  <TableRow 
                    key={client.email}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleClientClick(client)}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-primary">{client.email}</TableCell>
                    <TableCell>{client.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ClientDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          client={selectedClient}
        />
      </div>
    </MainLayout>
  );
};

export default Clients;
