import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Lightbulb, Frame, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Upload modal with:
 * - Always-centered dialog (fixed + translate, high z-index)
 * - Upload -> "Analyse IA en cours…" overlay with progress bar
 * - No red toasts; inline soft errors with retry
 * - Auto-close when a new receipt row is inserted (drawer opens on your side)
 */

interface UploadInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadInstructionsDialog = ({ open, onOpenChange }: UploadInstructionsDialogProps) => {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [softError, setSoftError] = useState<string | null>(null);

  const orgIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const uploadStartedAt = useRef<number | null>(null);
  const rtSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Progress animation: while uploading/processing, gently ramp to 90% max,
  // then finish to 100% on success.
  useEffect(() => {
    if (!isUploading) return;

    let current = 0;
    // If we relaunch after retry, keep the visible progression smoother:
    if (progress > 0) current = progress;

    const id = setInterval(() => {
      // approach 90% but never exceed until we mark success
      current = Math.min(90, current + Math.max(1, Math.floor((90 - current) / 8)));
      setProgress(current);
    }, 300);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUploading]);

  // Clean RT subscription on unmount/close
  useEffect(() => {
    if (!open && rtSubRef.current) {
      supabase.removeChannel(rtSubRef.current);
      rtSubRef.current = null;
    }
  }, [open]);

  const attachRealtimeForReceipts = async () => {
    // Ensure we listen only once per upload
    if (rtSubRef.current) {
      supabase.removeChannel(rtSubRef.current);
      rtSubRef.current = null;
    }
    if (!orgIdRef.current) return;

    // Listen to inserts on public.recus for this org
    const channel = supabase.channel("recus-on-insert-upload-modal").on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "recus",
        filter: `org_id=eq.${orgIdRef.current}`,
      },
      (payload) => {
        // Optionally filter by time (ignore old inserts)
        const now = Date.now();
        const started = uploadStartedAt.current ?? now;
        // When we see an insert after our upload started, close the modal.
        if (now - started >= 0) {
          setProgress(100);
          setStatusMsg("Analyse terminée.");
          // Small delay to let the user see 100%, then close
          setTimeout(() => {
            onOpenChange(false);
            cleanupAfterUpload();
          }, 250);
        }
      },
    );

    rtSubRef.current = channel;
    await channel.subscribe();
  };

  const cleanupAfterUpload = () => {
    setIsUploading(false);
    setProgress(0);
    setStatusMsg(null);
    setSoftError(null);
    setFileInputKey((k) => k + 1);

    if (rtSubRef.current) {
      supabase.removeChannel(rtSubRef.current);
      rtSubRef.current = null;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSoftError(null);
    setStatusMsg("Préparation de l'envoi…");
    setIsUploading(true);
    uploadStartedAt.current = Date.now();

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
      userIdRef.current = user.id;

      // org_id: try org_members first, then profiles
      let orgId: string | null = null;
      const { data: orgMember } = await (supabase as any)
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (orgMember?.org_id) {
        orgId = orgMember.org_id;
      } else {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("org_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.org_id) orgId = profile.org_id;
      }

      if (!orgId) {
        throw new Error("Organisation introuvable pour cet utilisateur.");
      }
      orgIdRef.current = orgId;

      // Start realtime listener so that when the new reçu is inserted,
      // we auto-close the dialog (drawer opens on your side).
      await attachRealtimeForReceipts();

      setStatusMsg("Envoi du reçu vers Finvisor IA…");

      // Build form-data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", orgId);
      formData.append("user_id", user.id);

      // Send to n8n webhook
      const response = await fetch("https://samilzr.app.n8n.cloud/webhook/Finvisor", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Erreur ${response.status} lors de l'envoi.`);
      }

      setStatusMsg("Analyse IA en cours…");
      // After this point, we wait the realtime insert to close the modal.
      // (progress animation continues until 100% when the insert arrives)
    } catch (err: any) {
      setSoftError(err?.message?.toString?.() ?? "Une erreur est survenue pendant l'envoi. Réessaie dans un instant.");
      setIsUploading(false);
      setStatusMsg(null);
    }
  };

  const retry = () => {
    setSoftError(null);
    setStatusMsg(null);
    setIsUploading(false);
    setProgress(0);
    setFileInputKey((k) => k + 1);
  };

  // Always-centered dialog content classes:
  // - fixed + translate center
  // - high z-index
  // - robust max sizes
  const dialogClasses = useMemo(
    () =>
      [
        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        "z-[100]", // above the app shell
        "bg-[#0E1420] border-border text-foreground",
        "w-[92vw] max-w-2xl",
        "max-h-[90vh] overflow-y-auto",
        "shadow-2xl",
      ].join(" "),
    [],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) cleanupAfterUpload();
      }}
    >
      {/* Force an overlay with high z-index so the modal is clearly above the app */}
      <div className="fixed inset-0 z-[95] bg-black/60 data-[state=open]:animate-in" aria-hidden />

      <DialogContent className={dialogClasses}>
        <DialogHeader>
          <DialogTitle className="text-base md:text-2xl font-semibold text-center mb-3 md:mb-6">
            👉 Quelques consignes avant l&apos;envoi
          </DialogTitle>
        </DialogHeader>

        {/* MAIN BODY (hidden when uploading, we show overlay instead) */}
        {!isUploading && (
          <>
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

        {/* OVERLAY “Analyse IA en cours…” */}
        {isUploading && (
          <div className="relative">
            <div className="rounded-2xl bg-[#165DFF] text-white p-6 md:p-8">
              <p className="text-center text-base md:text-xl font-semibold mb-6">
                {statusMsg ?? "Analyse IA en cours…"}
              </p>

              {/* Progress bar */}
              <div className="w-full h-2 md:h-2.5 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Soft error (no red toast) */}
              {softError && (
                <div className="mt-4 text-center text-white/90 text-xs md:text-sm">
                  <p className="mb-3">{softError}</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button onClick={retry} className="bg-white text-black hover:bg-white/90 h-8 md:h-9 px-3 md:px-4">
                      Réessayer
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        onOpenChange(false);
                        cleanupAfterUpload();
                      }}
                      className="h-8 md:h-9 px-3 md:px-4"
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              )}

              {/* Hint (hidden if error) */}
              {!softError && (
                <p className="mt-3 text-center text-white/80 text-[11px] md:text-xs">
                  Cette étape peut prendre quelques secondes. Vous verrez le reçu s’ouvrir automatiquement.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
