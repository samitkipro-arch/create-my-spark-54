import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, ChevronDown, Plus, Search } from "lucide-react";
import { UploadInstructionsDialog } from "@/components/Recus/UploadInstructionsDialog";

const Recus = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            24/09/2025 - 24/10/2025
          </Button>
          <Button variant="outline" className="gap-2">
            <ChevronDown className="w-4 h-4" />
            Sélectionner un client
          </Button>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client, numéro ou adresse"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Liste des reçus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Aucun reçu trouvé
            </div>
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
