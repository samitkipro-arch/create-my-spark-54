import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2 } from "lucide-react";

type Client = { id: string; name: string };

interface CreateClientLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
}

/**
 * Fenêtre "Créer un lien client"
 * - En-tête texte + sous-texte
 * - Deux gros boutons blancs (Select + Action)
 * - Texte bleu foncé identique au fond du modal
 * - Pas de chevron, pas d’effets hover/focus/active
 */
export default function CreateClientLinkDialog({ open, onOpenChange, clients }: CreateClientLinkDialogProps) {
  const [clientId, setClientId] = useState<string>("");

  // Bleu foncé (même esprit que le fond du modal)
  const darkBlue = "#0D1B2A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          sm:max-w-[520px] w-[92vw]
          rounded-2xl
          p-6 sm:p-8
          min-h-[360px]
        "
      >
        {/* Texte d’intro, centré */}
        <div className="text-center space-y-2">
          <p className="font-semibold leading-snug">
            Générez un lien sécurisé pour permettre à vos clients de déposer leurs reçus directement dans votre espace
            Finvisor.
          </p>
          <p className="text-sm text-muted-foreground">Vous pourrez ensuite les visualiser dans votre propre espace.</p>
        </div>

        <div className="mt-6 space-y-4">
          {/* Bouton blanc select — pas de chevron, texte centré */}
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger
              className={`
                h-14 rounded-2xl
                justify-center
                border border-white/20
                bg-white
                text-[15px]
                ring-0 focus:ring-0 focus:outline-none
                hover:bg-white active:bg-white
                [&>svg]:hidden   /* cache le chevron par défaut */
              `}
              style={{ color: darkBlue }}
            >
              <SelectValue placeholder="Choisir un client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Bouton blanc "Crée un lien +" — pas d’effet hover/active */}
          <Button
            className="
              w-full h-14 rounded-2xl text-[15px] gap-2
              bg-white
              ring-0 focus:ring-0 focus:outline-none
              hover:bg-white active:bg-white
              disabled:opacity-60 disabled:cursor-not-allowed
            "
            style={{ color: darkBlue }}
            disabled={!clientId}
            onClick={() => {
              /* action branchée plus tard */
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
