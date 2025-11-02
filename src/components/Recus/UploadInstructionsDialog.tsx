import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Lightbulb, Frame, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadInstructionsDialog = ({
  open,
  onOpenChange,
}: UploadInstructionsDialogProps) => {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    console.log("Uploading file:", file.name);

    try {
      // Récupérer les informations de l'utilisateur et de l'organisation
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!user || !session?.access_token) {
        throw new Error("Utilisateur non authentifié");
      }

      // Récupérer l'org_id de l'utilisateur
      const { data: orgMember } = await (supabase as any)
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!orgMember || !orgMember.org_id) {
        throw new Error("Organisation non trouvée");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", orgMember.org_id);
      // client_id est optionnel et peut être ajouté plus tard

      const response = await fetch("https://samilzr.app.n8n.cloud/webhook-test/Finvisor", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        },
        body: formData,
      });

      if (response.ok) {
        toast({
          title: "Reçu envoyé pour analyse",
          description: "Le reçu est en cours d'analyse. Vous serez notifié une fois le traitement terminé.",
        });
        
        onOpenChange(false);
        setFileInputKey(prev => prev + 1);
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast({
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer le reçu. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0E1420] border-border max-w-2xl text-foreground max-h-[90vh] md:max-h-[90vh] max-h-[60vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base md:text-2xl font-semibold text-center text-foreground mb-3 md:mb-8">
            👉 Quelques consignes avant l'envoi
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 md:gap-8 mb-3 md:mb-8">
          {/* Téléphone en paysage */}
          <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
            <div className="relative">
              <Smartphone className="w-10 h-10 md:w-16 md:h-16 text-white rotate-90" strokeWidth={1.5} />
              <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-2 md:-right-2">
                <svg
                  className="w-5 h-5 md:w-8 md:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
              Prenez la photo de votre reçu en orientant votre téléphone en mode paysage.
            </p>
          </div>

          {/* Lumière / éclairage */}
          <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
            <Lightbulb className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={1.5} />
            <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
              Prenez la photo dans un endroit bien éclairé, sans ombre sur le reçu.
            </p>
          </div>

          {/* Reçu bien cadré */}
          <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
            <Frame className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={1.5} />
            <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
              Le reçu doit être entièrement visible et bien cadré dans l'image.
            </p>
          </div>

          {/* Éviter texte/objets */}
          <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
            <div className="relative">
              <Frame className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={1.5} />
              <X className="w-7 h-7 md:w-10 md:h-10 text-destructive absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={3} />
            </div>
            <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
              Évitez tout texte ou objet autour du reçu pour une meilleure détection.
            </p>
          </div>
        </div>

        <div className="space-y-3 md:space-y-6 pt-2 md:pt-4 border-t border-border">
          <p className="text-center text-[10px] md:text-sm text-muted-foreground">
            Choisissez un fichier (image ou PDF) de votre reçu à analyser.
          </p>

          <div className="space-y-2 md:space-y-4">
            <div className="relative">
              <input
                key={fileInputKey}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
                id="receipt-upload"
              />
              <Button
                asChild
                disabled={isUploading}
                className="w-full bg-white text-black hover:bg-white/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-base h-8 md:h-11"
              >
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  {isUploading ? "Envoi en cours..." : "Choisir un fichier"}
                </label>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
