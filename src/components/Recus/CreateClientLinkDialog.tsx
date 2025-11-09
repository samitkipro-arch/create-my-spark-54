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
      <DialogContent className="w-[92vw] max-w-[520px] rounded-2xl md:rounded-3xl py-7 md:py-8 px-5 md:px-7 bg-[#0B1220] text-white border-none">
        {/* Texte d'intro */}
        <div className="text-center space-y-2 mb-5">
          <p className="font-semibold leading-snug text-[15px] md:text-[16px] text-white">
            Générez un lien sécurisé pour permettre à vos clients de déposer leurs reçus directement dans votre espace
            Finvisor.
          </p>
          <p className="text-[12px] md:text-[13px] leading-snug" style={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Vous pourrez ensuite les visualiser dans votre propre espace.
          </p>
        </div>

        <div className="space-y-4">
          {/* Bouton 'Choisir un client' */}
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger
              className="relative h-11 md:h-12 rounded-2xl bg-white hover:bg-white active:bg-white focus:bg-white transition-none border shadow-sm text-[14px] md:text-[16px] font-medium pl-5 pr-12 focus-visible:ring-0 focus-visible:outline-none focus:ring-0 outline-none ring-0 text-[#0D1B2A] data-[placeholder]:text-[#0D1B2A] [&>svg]:hidden"
              style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
            >
              <div className="w-full text-center">
                <SelectValue placeholder="Choisir un client" className="text-[#0D1B2A]" />
              </div>

              {/* Chevron manuel à droite */}
              <ChevronDown
                className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-80 pointer-events-none text-[#0D1B2A]"
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

          {/* Bouton 'Créer un lien' */}
          <Button
            type="button"
            className="w-full h-11 md:h-12 rounded-2xl bg-white hover:bg-white active:bg-white focus:bg-white transition-none border shadow-sm text-[14px] md:text-[16px] font-medium gap-2 focus-visible:ring-0 focus-visible:outline-none focus:ring-0 outline-none ring-0 text-[#0D1B2A]"
            style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
            onClick={() => {
              // (Action à brancher plus tard — génération du lien)
            }}
          >
            <Link2 className="w-4 h-4 text-[#0D1B2A]" />
            Crée un lien +
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
