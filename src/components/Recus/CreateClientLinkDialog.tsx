import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      {/* fenêtre plus haute et moins large */}
      <DialogContent className="rounded-3xl sm:max-w-[420px] w-[92vw] p-6 sm:p-8">
        <div className="text-center space-y-6">
          <p className="text-base sm:text-lg font-semibold leading-snug">
            Générez un lien sécurisé pour permettre à vos clients de déposer leurs reçus directement dans votre espace
            Finvisor.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Vous pourrez ensuite les visualiser dans votre propre espace.
          </p>

          <div className="space-y-4">
            {/* Select en fond blanc, centré, SANS chevron */}
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-12 sm:h-14 rounded-2xl text-base justify-center bg-white text-foreground border [&>svg]:hidden">
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

            {/* Bouton fond blanc, comme le mock (pas d’icône) */}
            <Button className="w-full h-12 sm:h-14 rounded-2xl text-base bg-white text-foreground hover:bg-white/90 border">
              Crée un lien +
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
