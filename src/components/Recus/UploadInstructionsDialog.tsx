import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { X, Smartphone, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ==== ICÔNES ====
import { IconLightBulb, IconScanFrame } from "@/components/Recus/icons";

interface UploadInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Client = { id: string; name: string };

export const UploadInstructionsDialog = ({ open, onOpenChange }: UploadInstructionsDialogProps) => {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  const [softError, setSoftError] = useState<string | null>(null);

  // --- client selection ---
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Récup org_id + clients à l'ouverture du dialog
  useEffect(() => {
    const fetchOrgAndClients = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 1) org_id (org_members prioritaire, sinon profiles)
        let resolvedOrgId: string | null = null;

        const { data: orgMember } = await (supabase as any)
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .single();

        if (orgMember?.org_id) {
          resolvedOrgId = orgMember.org_id;
        } else {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
          if (profile?.org_id) resolvedOrgId = profile.org_id;
        }

        setOrgId(resolvedOrgId);

        if (!resolvedOrgId) return;

        // 2) Clients de l'org
        const { data: rows } = await (supabase as any)
          .from("clients")
          .select("id, name")
          .eq("org_id", resolvedOrgId)
          .order("name", { ascending: true });

        setClients((rows || []).map((r: any) => ({ id: r.id, name: r.name })));
      } catch {
        // silencieux
      }
    };

    if (open) {
      fetchOrgAndClients();
    }
  }, [open]);

  // Écoute INSERT reçus -> fermer overlay + dialog
  useEffect(() => {
    if (!showAnalysisOverlay) return;

    const channel = supabase
      .channel("recus-insert-listener")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "recus" }, () => {
        setShowAnalysisOverlay(false);
        onOpenChange(false);
      })
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
    if (!selectedClientId) {
      // sécurité UI: on ne devrait pas pouvoir cliquer si pas de client choisi
      return;
    }

    setIsUploading(true);
    setSoftError(null);
    setShowAnalysisOverlay(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!user || !session?.access_token) {
        throw new Error("Utilisateur non authentifié");
      }

      // org_id fallback
      let effectiveOrgId = orgId;
      if (!effectiveOrgId) {
        const { data: orgMember } = await (supabase as any)
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .single();
        if (orgMember?.org_id) {
          effectiveOrgId = orgMember.org_id;
        } else {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
          if (profile?.org_id) effectiveOrgId = profile.org_id;
        }
      }
      if (!effectiveOrgId) throw new Error("Organisation non trouvée.");

      // Envoi webhook n8n
      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", effectiveOrgId);
      formData.append("user_id", user.id);
      formData.append("client_id", selectedClientId); // <-- obligatoire

      const response = await fetch("https://samilzr.app.n8n.cloud/webhook-test/Finvisor", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erreur ${response.status}`);
      }

      setFileInputKey((prev) => prev + 1);
    } catch (err: any) {
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
    setFileInputKey((prev) => prev + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0E1420] border-border max-w-2xl text-foreground max-h-[90vh] md:max-h-[90vh] max-h-[60vh] overflow-y-auto">
        {showAnalysisOverlay ? (
          <div className="flex flex-col items-center justify-center py-16 md:py-24 space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl md:text-2xl font-semibold text-foreground">Analyse IA en cours...</h3>

              <div className="w-full max-w-md px-4">
                <div className="relative h-2 bg-[#1a2332] rounded-full overflow-hidden">
                  <div
                    className="absolute inset-0 translate-x-[-100%] h-full bg-gradient-to-r from-blue-500 to-blue-600 animate-[progress_1.4s_ease-in-out_infinite]"
                    style={{ /* @ts-ignore */ animationName: "progress" }}
                  />
                </div>
              </div>

              {softError ? (
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
              ) : (
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

              <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
                <IconLightBulb className="w-10 h-10 md:w-16 md:h-16 text-white" />
                <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
                  Prenez la photo dans un endroit bien éclairé, sans ombre sur le reçu.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-1.5 md:space-y-3">
                <IconScanFrame className="w-10 h-10 md:w-16 md:h-16 text-white" />
                <p className="text-[10px] md:text-sm text-muted-foreground leading-tight md:leading-relaxed">
                  Le reçu doit être entièrement visible et bien cadré dans l&apos;image.
                </p>
              </div>

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

            {/* --- Bandeau info si aucun client --- */}
            {clients.length === 0 && (
              <p className="text-center text-xs md:text-sm text-muted-foreground mb-2">
                Veuillez ajouter votre premier client.
              </p>
            )}

            {/* --- Les 2 boutons, sans texte entre eux --- */}
            <div className="space-y-2 md:space-y-3">
              {/* Bouton / Select : Assigner un client (obligatoire) */}
              {clients.length > 0 ? (
                <Select value={selectedClientId} onValueChange={(val) => setSelectedClientId(val)}>
                  <SelectTrigger className="w-full h-11 md:h-12 bg-white text-black hover:bg-white/90 font-medium rounded-md flex items-center justify-between px-4">
                    <div className="truncate">
                      {selectedClientId
                        ? clients.find((c) => c.id === selectedClientId)?.name
                        : "Assigner un client (obligatoire)"}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button className="w-full h-11 md:h-12 bg-white text-black hover:bg-white/90" disabled>
                  Assigner un client (obligatoire)
                </Button>
              )}

              {/* Bouton : Déposez votre reçu + */}
              <div className="relative">
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileSelect}
                  disabled={isUploading || !selectedClientId || clients.length === 0}
                  className="hidden"
                  id="receipt-upload"
                />
                <Button
                  asChild
                  disabled={isUploading || !selectedClientId || clients.length === 0}
                  className="w-full bg-white text-black hover:bg-white/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed h-11 md:h-12"
                >
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    {isUploading ? "Envoi en cours..." : "Déposez votre reçu +"}
                  </label>
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
