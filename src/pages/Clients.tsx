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

const mockClients = [
  { name: "Société Verne", email: "contact@societe-verne.fr", date: "22/10/2025" },
  { name: "Hôtel Riverside", email: "reservation@riverside-hotel.fr", date: "22/10/2025" },
  { name: "Boulangerie du Coin", email: "bonjour@boulangerie-ducoin.fr", date: "22/10/2025" },
  { name: "Garage Auto Plus", email: "service@autoplus-garage.fr", date: "22/10/2025" },
  { name: "Cabinet Médical Centre", email: "accueil@cabinet-centre.fr", date: "22/10/2025" },
];

const Clients = () => {
  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos clients, leurs informations légales et leur suivi en un seul endroit.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un client
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher"
            className="pl-10"
          />
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
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
                  <TableRow key={client.email}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-primary">{client.email}</TableCell>
                    <TableCell>{client.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Clients;
