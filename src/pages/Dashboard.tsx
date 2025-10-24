import { MainLayout } from "@/components/Layout/MainLayout";
import { StatCard } from "@/components/Dashboard/StatCard";
import { TeamMemberCard } from "@/components/Dashboard/TeamMemberCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, Receipt, Globe, FileText, ShoppingCart } from "lucide-react";

const Dashboard = () => {
  const stats = [
    { title: "Reçus traités", value: "0", icon: Receipt },
    { title: "Montant HT total", value: "0,00 €", icon: Globe },
    { title: "TVA récupérable", value: "0,00 €", icon: FileText },
    { title: "Montant TTC total", value: "0,00 €", icon: ShoppingCart },
  ];

  const teamMembers = [
    { name: "Natalie Craig", role: "Owner", receiptsCount: 0, tvaAmount: "0,00 €", initials: "NC" },
    { name: "Mehdi Charmou", role: "Admin", receiptsCount: 0, tvaAmount: "0,00 €", initials: "MC" },
    { name: "Silvy Berger", role: "Viewer", receiptsCount: 0, tvaAmount: "0,00 €", initials: "SB" },
    { name: "Jean-Marc Lubriol", role: "Admin", receiptsCount: 0, tvaAmount: "0,00 €", initials: "JL" },
  ];

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            24/09/2025 - 24/10/2025
          </Button>
          <Button variant="outline" className="gap-2">
            <ChevronDown className="w-4 h-4" />
            Sélectionner un client
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>
              Suivi du nombre de reçus traités et montants sur la période sélectionnée
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              24/09/2025 - 24/10/2025 · Axe X = Période · Axe Y = Montant TTC (€)
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Aucune donnée disponible
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Top catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Aucune catégorie trouvée
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Suivi de l'activité et la part des reçus traités par chaque membre de votre équipe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <TeamMemberCard key={member.name} {...member} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
