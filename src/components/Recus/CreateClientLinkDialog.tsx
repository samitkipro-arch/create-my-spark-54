// src/components/Recus/CreateClientLinkDialog.tsx
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, ChevronDown } from "lucide-react";

type Client = { id: string; name: string };

interface CreateClientLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
}

export default function CreateClientLinkDialog({ open, onOpenChange, clients }: CreateClientLinkDialogProps) {
  const [clientId, setClientId] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* boîte: un peu plus haute, pas trop large */}
      <DialogContent className="w-[92vw] max-w-[560px] md:max-w-[580px] rounded-2xl md:rounded-3xl py-7 md:py-8 px-5 md:px-7">
        {/* Titre supprimé volontairement */}

        {/* Texte d’intro (inchangé visuel) */}
        <div className="text-center space-y-2 mb-5">
          <p className="font-semibold leading-snug text-[15px] md:text-[16px]">
            Générez un lien sécurisé pour permettre à vos clients de déposer leurs reçus directement dans votre espace
            Finvisor.
          </p>
          <p className="text-muted-foreground text-[12px] md:text-[13px]">
            Vous pourrez ensuite les visualiser dans votre propre espace.
          </p>
        </div>

        <div className="space-y-4">
          {/* Bouton 'Choisir un client' — blanc permanent + chevron visible */}
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger
              className={[
                "h-12 md:h-14 rounded-2xl md:rounded-2xl",
                "bg-white hover:bg-white active:bg-white focus:bg-white",
                "disabled:opacity-100 disabled:cursor-not-allowed",
                "border border-white/20 shadow-sm",
                "text-[14px] md:text-[16px] font-medium",
                "pl-5 pr-10", // espace pour le chevron à droite
                "focus-visible:ring-0 focus-visible:outline-none",
              ].join(" ")}
            >
              <div className="w-full text-center">
                {/* On laisse SelectValue gérer le placeholder/label */}
                <SelectValue placeholder="Choisir un client" />
              </div>

              {/* Chevron toujours visible à droite */}
              <ChevronDown
                className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-80 pointer-events-none"
                aria-hidden="true"
              />
            </SelectTrigger>

            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bouton 'Créer un lien' — blanc permanent (UI uniquement) */}
          <Button
            type="button"
            className={[
              "w-full h-12 md:h-14 rounded-2xl md:rounded-2xl",
              "bg-white hover:bg-white active:bg-white focus:bg-white",
              "disabled:opacity-100 disabled:cursor-not-allowed",
              "border border-white/20 shadow-sm",
              "text-[14px] md:text-[16px] font-medium",
              "gap-2",
              "focus-visible:ring-0 focus-visible:outline-none",
            ].join(" ")}
            onClick={() => {
              // (Action à brancher plus tard — génération du lien)
            }}
          >
            <Link2 className="w-4 h-4" />
            Crée un lien +
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
