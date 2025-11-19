import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { X, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { IconLightBulb, IconScanFrame } from "@/components/Recus/icons";

interface UploadInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Client = { id: string; name: string };

// 🔥 Webhook fixé ici :
const FIXED_N8N_WEBHOOK =
  "https://n8n.wizeenn.com:5678/webhook-test/b5a5520e-f103-43f0-a2e6-c48ac3a461d4";

export const UploadInstructionsDialog = ({ open, onOpenChange }: UploadInstructionsDialogProps) => {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false);
  const [softError, setSoftError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrgAndClients = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

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

        const { data: rows } = await (supabase as any)
          .from("clients")
          .select("id, name")
          .eq("org_id", resolvedOrgId)
          .order("name", { ascending: true });

        setClients((rows || []).map((r: any) => ({ id: r.id, name: r.name })));
      } catch {}
    };

    if (open) fetchOrgAndClients();
  }, [open]);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!selectedClientId) return;

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

      if (!user || !session?.access_token) throw new Error("Utilisateur non authentifié");

      let effectiveOrgId = orgId;
      if (!effectiveOrgId) {
        const { data: orgMember } = await (supabase as any)
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .single();
        if (orgMember?.org_id) effectiveOrgId = orgMember.org_id;
        else {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("org_id")
            .eq("user_id", user.id)
            .single();
          if (profile?.org_id) effectiveOrgId = profile.org_id;
        }
      }
      if (!effectiveOrgId) throw new Error("Organisation non trouvée.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("org_id", effectiveOrgId);
      formData.append("user_id", user.id);
      formData.append("client_id", selectedClientId);

      // 🔥 Appel direct au webhook fixe
      const response = await fetch(FIXED_N8N_WEBHOOK, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!response.ok) throw new Error((await response.text()) || `Erreur ${response.status}`);

      setFileInputKey((prev) => prev + 1);
    } catch (err: any) {
      setSoftError("L’envoi a échoué. Vous pouvez réessayer ou fermer cette fenêtre.");
      console.error("Upload error:", err?.message || err);
    } finally {
      setIsUploading(false);
    }
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
                    style={{ animationName: "progress" }}
                  />
                </div>
              </div>

              {softError ? (
                <div className="mt-4 text-center text-white/80 text-[13px]">
                  {softError}
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <Button
                      onClick={() => window.location.reload()}
                      className="bg-white text-black hover:bg-white/90 h-8 px-3"
                    >
                      Réessayer
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => onOpenChange(false)}
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
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <Smartphone className="w-16 h-16 text-white rotate-90" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Prenez la photo en mode paysage.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <IconLightBulb className="w-16 h-16 text-white" />
                <p className="text-sm text-muted-foreground">
                  Prenez la photo dans un endroit bien éclairé.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <IconScanFrame className="w-16 h-16 text-white" />
                <p className="text-sm text-muted-foreground">
                  Le reçu doit être bien cadré.
                </p>
              </div>

              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <IconScanFrame className="w-16 h-16 text-white" />
                  <X
                    className="w-10 h-10 text-destructive absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    strokeWidth={3}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Évitez les objets autour du reçu.
                </p>
              </div>
            </div>

            {/* Dropdown client */}
            {clients.length > 0 ? (
              <Select value={selectedClientId} onValueChange={(val) => setSelectedClientId(val)}>
                <SelectTrigger className="w-full h-12 bg-white text-black font-medium rounded-md">
                  <SelectValue placeholder="Assigner un client (obligatoire)" />
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
              <Button disabled className="w-full h-12 bg-white text-black opacity-50">
                Assigner un client (obligatoire)
              </Button>
            )}

            {/* Upload */}
            <div className="mt-4">
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
                className="w-full bg-white text-black hover:bg-white/90 font-medium h-12"
              >
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  {isUploading ? "Envoi en cours..." : "Déposez votre reçu +"}
                </label>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
