import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockTeam = [
  { name: "Natalie Craig", role: "Owner", client: "TechCorp Solutions, Commerce Plus", status: "Actif", lastConnection: "Il y a 6 jours", initials: "NC" },
  { name: "Mehdi Charmou", role: "Admin", client: "Commerce Plus", status: "Actif", lastConnection: "Jamais", initials: "MC" },
  { name: "Silvy Berger", role: "Viewer", client: "Artisan Services", status: "Actif", lastConnection: "Jamais", initials: "SB" },
  { name: "Jean-Marc Lubriol", role: "Admin", client: "TechCorp Solutions", status: "Actif", lastConnection: "Jamais", initials: "JL" },
];

const Equipe = () => {
  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Équipe</h1>
            <p className="text-muted-foreground mt-1">
              Gérez les membres de votre équipe et leurs autorisations.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un membre
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
                  <TableHead>Prénom & Nom</TableHead>
                  <TableHead>Rôle et autorisations</TableHead>
                  <TableHead>Client assigné</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTeam.map((member) => (
                  <TableRow key={member.name}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{member.role}</Badge>
                    </TableCell>
                    <TableCell>{member.client}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {member.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.lastConnection}</TableCell>
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

export default Equipe;
