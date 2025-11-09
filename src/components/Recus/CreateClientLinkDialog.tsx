import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Créer un lien client</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-center px-2">
          <p className="text-xl font-semibold leading-snug">
            Générez un lien sécurisé pour permettre à vos clients de déposer leurs reçus directement dans votre espace
            Finvisor.
          </p>
          <p className="text-muted-foreground">Vous pourrez ensuite les visualiser dans votre propre espace.</p>

          <div className="space-y-4 mt-2">
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-14 rounded-2xl text-lg justify-between px-5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Choisir un client</span>
                </div>
                <ChevronDown className="w-4 h-4" />
                <SelectValue className="hidden" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button className="w-full h-14 rounded-2xl text-lg gap-2">
              <Link2 className="w-4 h-4" />
              Créer un lien
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
