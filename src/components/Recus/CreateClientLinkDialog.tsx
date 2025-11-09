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

export default function CreateClientLinkDialog({ open, onOpenChange, clients }: CreateClientLinkDialogProps) {
  const [clientId, setClientId] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fenêtre étroite et plus longue, comme le mock */}
      <DialogContent className="w-[92vw] max-w-[360px] md:max-w-[380px] rounded-2xl py-7 px-4">
        <div className="space-y-5 text-center">
          <p className="text-[18px] font-semibold leading-snug">
            Générez un lien sécurisé pour permettre à vos clients de déposer leurs reçus directement dans votre espace
            Finvisor.
          </p>
          <p className="text-sm text-muted-foreground">Vous pourrez ensuite les visualiser dans votre propre espace.</p>

          <div className="space-y-3">
            {/* Bouton Select blanc avec libellé centré et chevron à droite */}
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="relative h-14 rounded-2xl bg-white text-foreground shadow-sm px-5">
                {/* Libellé centré (toujours “Choisir un client”) */}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-medium">
                  Choisir un client
                </span>
                {/* Valeur invisible pour conserver la structure du Select + chevron natif */}
                <SelectValue className="opacity-0" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bouton blanc “Crée un lien +” */}
            <Button className="w-full h-14 rounded-2xl text-[16px] gap-2 bg-white text-foreground shadow-sm hover:bg-white/90">
              <Link2 className="w-4 h-4" />
              Crée un lien +
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
