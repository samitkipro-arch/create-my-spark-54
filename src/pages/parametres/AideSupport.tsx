import { MainLayout } from "@/components/Layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, FileText, ExternalLink } from "lucide-react";

const AideSupport = () => {
  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
        <h1 className="text-2xl md:text-3xl font-bold">Aide & Support</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <CardTitle>Chat en direct</CardTitle>
              </div>
              <CardDescription>
                Obtenez une réponse immédiate à vos questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Démarrer une conversation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <CardTitle>Email</CardTitle>
              </div>
              <CardDescription>
                Contactez notre équipe support par email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                support@finvisor.com
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Documentation</CardTitle>
              </div>
              <CardDescription>
                Consultez notre base de connaissances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Voir la documentation
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>FAQ</CardTitle>
              </div>
              <CardDescription>
                Questions fréquemment posées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Voir la FAQ
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Horaires de support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lundi - Vendredi</span>
              <span className="font-medium">9h00 - 18h00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Samedi - Dimanche</span>
              <span className="font-medium">Fermé</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Les clients du plan Avancé bénéficient d'un support prioritaire 24/7
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AideSupport;
