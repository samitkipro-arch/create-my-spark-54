import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ==== ICÔNES ====
// (on garde tes icônes custom pour lumière + cadrage)
import { IconLightBulb, IconScanFrame } from "@/components/Recus/icons";

interface UploadInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadInstructionsDialog = ({ open, onOpenChange }: UploadInstructionsDialogProps) => {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  const [softError, setSoftError] = useState<string | null>(null);

  // Écouter les INSERT sur la table des reçus : ferme l’overlay + le dialog quand le drawer s’ouvre
  useEffect(() => {
    if (!showAnalysisOverlay) return;

    const channel = supabase
      .channel("recus-insert-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recus" }, // <- IMPORTANT: table "recus"
        () => {
          setShowAnalysisOverlay(false);
          onOpenChange(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showAnalysisOverlay, onOpenChange]);

  const cleanupAfterUpload = () => {
    setIsUploading(false);
    setShowAnalysisOverlay(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSoftError(null);
    setShowAnalysisOverlay(true);

    try {
      // Auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!user || !session?.access_token) {
        throw new Error("Utilisateur non authentifié");
      }

      // Récup org_id (org_members -> profiles)
      let orgId: string | null = null;

      const { data: orgMember } = await (supabase as any)
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (orgMember?.org_id) {
        orgId = orgMember.org_id;
      } else {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("org_id")
          .eq("user_id", user.id)
          .single();
        if (profile?.org_id) orgId = profile.org_id;
      }

      if (!orgId) {
        throw new Error("Organisation non trouvée.");
      }

      // Envoi webhook n8n
      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", orgId);
      formData.append("user_id", user.id);

      const response = await fetch("https://samilzr.app.n8n.cloud/webhook/Finvisor", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erreur ${response.status}`);
      }

      // Pas de toast ici → on laisse l’overlay jusqu’à l’INSERT Supabase (drawer)
      setFileInputKey((prev) => prev + 1);
    } catch (err: any) {
      // Pas d’erreur rouge : on affiche un message discret dans l’overlay + boutons
      setSoftError("L’envoi a échoué. Vous pouvez réessayer ou fermer cette fenêtre.");
      console.error("Upload error:", err?.message || err);
    } finally {
      setIsUploading(false);
    }
  };

  const retry = () => {
    setSoftError(null);
    setShowAnalysisOverlay(false);
    setTimeout(() => setShowAnalysisOverlay(true), 0);
    // L’utilisateur doit re-choisir un fichier : on réinitialise l’input
    setFileInputKey((prev) => prev + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0E1420] border-border max-w-2xl text-foreground max-h-[90vh] md:max-h-[90vh] max-h-[60vh] overflow-y-auto">
        {showAnalysisOverlay ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-24 space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl md:text-2xl font-semibold text-foreground">Analyse IA en cours...</h3>

              {/* Barre de progression indéterminée, style Finvisor */}
              <div className="w-full max-w-md px-4">
                <div className="relative h-2 bg-[#1a2332] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 translate-x-[-100%] h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-[progress_1.4s_ease-in-out_infinite]"
                    style={{
                      // @ts-ignore – on utilise une keyframes utilitaire via tailwind config ou inline
                      animationName: "progress",
                    }}
                  />
                </div>
              </div>

              {/* Message discret si erreur */}
              {softError && (
                <div className="mt-4 text-center text-white/80 text-[13px]">
                  {softError}
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Button onClick={retry} className="bg-white text-black hover:bg-white/90 h-8 px-3">
                      Réessayer
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        onOpenChange(false);
                        cleanupAfterUpload();
                      }}
                      className="h-8 px-3"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              )}

              {!softError && (
                <p className="mt-3 text-center text-white/80 text-[12px]">
                  Cette étape peut prendre quelques secondes. Le reçu s’ouvrira automatiquement.
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base md:text-2xl font-semibold text-center text-foreground mb-3 md:mb-8">
                👉 Quelques consignes avant l&apos;envoi
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
                <IconLightBulb className="w-10 h-10 md:w-16 md:h-16 text-white" />
                <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
                  Prenez la photo dans un endroit bien éclairé, sans ombre sur le reçu.
                </p>
              </div>

              {/* Reçu bien cadré */}
              <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
                <IconScanFrame className="w-10 h-10 md:w-16 md:h-16 text-white" />
                <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
                  Le reçu doit être entièrement visible et bien cadré dans l&apos;image.
                </p>
              </div>

              {/* Éviter texte/objets */}
              <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
                <div className="relative">
                  <IconScanFrame className="w-10 h-10 md:w-16 md:h-16 text-white" />
                  <X
                    className="w-7 h-7 md:w-10 md:h-10 text-destructive absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    strokeWidth={3}
                  />
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
