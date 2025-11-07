import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Lightbulb, Frame, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UploadInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadInstructionsDialog = ({ open, onOpenChange }: UploadInstructionsDialogProps) => {
  const [fileInputKey, setFileInputKey] = useState(0);

  // Nouveaux états overlay
  const [isUploading, setIsUploading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [overlayMessage, setOverlayMessage] = useState<"idle" | "upload" | "processing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pour arrêter proprement le timer et la subscription
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Utilitaire : clear timer + realtime channel
  const cleanupRealtime = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // Reset total (utilisé par "Réessayer")
  const hardReset = () => {
    cleanupRealtime();
    setIsUploading(false);
    setShowOverlay(false);
    setProgress(0);
    setOverlayMessage("idle");
    setErrorMsg(null);
    setFileInputKey((k) => k + 1);
  };

  // Ferme le dialog proprement
  const closeDialog = () => {
    cleanupRealtime();
    onOpenChange(false);
    setTimeout(() => {
      // petit délai pour laisser le drawer s’ouvrir de l’autre côté
      hardReset();
    }, 250);
  };

  // Abonnement à l’insert des reçus pour fermer le dialog dès que le nouvel enregistrement arrive
  const watchNewReceiptAndClose = async (orgId: string, currentUserId: string) => {
    // Crée une channel si inexistante
    if (!channelRef.current) {
      channelRef.current = supabase.channel("recus-insert-listener");
    }

    channelRef.current
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "recus",
          // on filtre sur l'org pour éviter de réagir aux inserts des autres orgs
          filter: `org_id=eq.${orgId}`,
        },
        (payload: any) => {
          try {
            // Optionnel : on vérifie si processed_by correspond à l'user courant si disponible
            const row = payload?.new ?? payload?.record ?? {};
            if (!row) return;

            // On considère l'insert comme succès pour l’utilisateur courant
            // (si tu veux être plus strict, décommente la condition ci-dessous)
            // if (row.processed_by && row.processed_by !== currentUserId) return;

            setOverlayMessage("done");
            setProgress(100);

            // ferme le dialog juste après un tout petit délai pour la transition
            setTimeout(() => closeDialog(), 250);
          } catch {
            // on ignore les erreurs ici pour ne pas polluer l’UI
          }
        },
      )
      .subscribe();
  };

  // Timer de progression qui grimpe jusqu’à 85% en attendant l’insert
  const startProgressTimer = () => {
    if (progressTimerRef.current) return;
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => {
        // on plafonne avant 85% tant qu’on n’a pas reçu l’insert
        if (p >= 85) return 85;
        // progression fluide
        return p + Math.max(1, Math.floor((90 - p) / 10));
      });
    }, 350);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowOverlay(true);
    setOverlayMessage("upload");
    setErrorMsg(null);
    setProgress(8); // petit jump initial

    try {
      // Auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!user || !session?.access_token) {
        throw new Error("Utilisateur non authentifié.");
      }

      // Récup org_id (org_members -> profiles fallback)
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
        throw new Error("Organisation introuvable.");
      }

      // Démarre le timer de progression
      startProgressTimer();

      // Lance l’écoute de l’insert pour fermer automatiquement
      watchNewReceiptAndClose(orgId, user.id);

      // Prépare formData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", orgId);
      formData.append("user_id", user.id);

      // Upload vers n8n
      const response = await fetch("https://samilzr.app.n8n.cloud/webhook/Finvisor", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erreur d’envoi (${response.status})`);
      }

      // Envoi ok -> on passe en mode "processing"
      setOverlayMessage("processing");
      setProgress((p) => Math.max(p, 60));
      // On attend maintenant le signal de l’insert (realtime) pour monter à 100% et fermer
    } catch (err: any) {
      // Pas de toast rouge : on affiche discrètement dans l’overlay
      setOverlayMessage("error");
      setErrorMsg(err?.message || "Un problème est survenu pendant l’envoi. Vérifiez votre connexion et réessayez.");
      // on arrête le timer, on laisse le user décider de réessayer
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setIsUploading(false);
    }
  };

  // Si on ferme le dialog (open=false), on nettoie tout
  useEffect(() => {
    if (!open) {
      cleanupRealtime();
      setShowOverlay(false);
      setOverlayMessage("idle");
      setErrorMsg(null);
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0E1420] border-border max-w-2xl text-foreground max-h-[90vh] md:max-h-[90vh] max-h-[60vh] overflow-y-auto relative">
        {/* Contenu "normal" — caché quand l’overlay est visible */}
        {!showOverlay && (
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
                <Lightbulb className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={1.5} />
                <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
                  Prenez la photo dans un endroit bien éclairé, sans ombre sur le reçu.
                </p>
              </div>

              {/* Reçu bien cadré */}
              <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
                <Frame className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={1.5} />
                <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
                  Le reçu doit être entièrement visible et bien cadré dans l&apos;image.
                </p>
              </div>

              {/* Éviter texte/objets */}
              <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
                <div className="relative">
                  <Frame className="w-10 h-10 md:w-16 md:h-16 text-white" strokeWidth={1.5} />
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

        {/* OVERLAY Analyse IA en cours — visible pendant upload/processing/erreur */}
        {showOverlay && (
          <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-xl rounded-2xl shadow-xl bg-[#0B5BFF]/95 border border-white/10 px-6 py-6 md:px-10 md:py-10">
              <div className="text-center space-y-3 md:space-y-4">
                <p className="text-white text-sm md:text-xl font-semibold">
                  {overlayMessage === "error"
                    ? "Échec d’envoi"
                    : overlayMessage === "done"
                      ? "Analyse terminée !"
                      : overlayMessage === "upload"
                        ? "Envoi du reçu…"
                        : overlayMessage === "processing"
                          ? "Analyse IA en cours…"
                          : "Analyse IA en cours…"}
                </p>

                {/* Barre de progression */}
                <div className="w-full bg-white/20 rounded-full h-2 md:h-2.5 overflow-hidden">
                  <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>

                {/* Sous-texte / erreur discrète */}
                {overlayMessage !== "error" ? (
                  <p className="text-white/80 text-xs md:text-sm">
                    Veuillez patienter, cela prend généralement quelques secondes.
                  </p>
                ) : (
                  <p className="text-white text-xs md:text-sm">{errorMsg}</p>
                )}

                {/* Actions en cas d’erreur */}
                {overlayMessage === "error" && (
                  <div className="pt-2">
                    <Button
                      onClick={hardReset}
                      className="bg-white text-black hover:bg-white/90 text-xs md:text-sm h-8 md:h-10"
                    >
                      Réessayer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
