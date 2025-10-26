import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClientDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    name: string;
    email: string;
    vat_number?: string;
    address?: string;
    phone?: string;
  } | null;
}

export const ClientDetailDrawer = ({
  open,
  onOpenChange,
  client,
}: ClientDetailDrawerProps) => {
  const isMobile = useIsMobile();

  const initials = client?.name
    ? client.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "NC";

  const content = (
    <>
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-16 w-16 md:h-20 md:w-20">
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl md:text-2xl font-bold">
                {client?.name || "Nouveau client"}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {client?.email || ""}
              </p>
            </div>
          </div>
          <Button size="default" className="shrink-0">
            Modifier
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Raison sociale */}
        <div className="space-y-2">
          <Label htmlFor="company-name" className="text-sm font-medium">
            Raison sociale / Nom légal de l'entreprise
          </Label>
          <Input
            id="company-name"
            placeholder="Nom de l'entreprise"
            defaultValue={client?.name}
            className="bg-background/50"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* SIRET/SIREN */}
          <div className="space-y-2">
            <Label htmlFor="vat-number" className="text-sm font-medium">
              SIRET / SIREN (optionnel)
            </Label>
            <Input
              id="vat-number"
              placeholder="123 456 789 00010"
              defaultValue={client?.vat_number}
              className="bg-background/50"
            />
          </div>

          {/* Nom dirigeant */}
          <div className="space-y-2">
            <Label htmlFor="representative" className="text-sm font-medium">
              Nom complet du dirigeant / représentant légal
            </Label>
            <Input
              id="representative"
              placeholder="Prénom Nom"
              className="bg-background/50"
            />
          </div>
        </div>

        {/* Adresse */}
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium">
            Adresse complète du siège social (optionnel)
          </Label>
          <Input
            id="address"
            placeholder="Numéro, rue, ville, code postal"
            defaultValue={client?.address}
            className="bg-background/50"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* E-mail */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              E-mail de contact de l'entreprise
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@entreprise.fr"
              defaultValue={client?.email}
              className="bg-background/50"
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Téléphone de contact de l'entreprise (optionnel)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 1 23 45 67 89"
              defaultValue={client?.phone}
              className="bg-background/50"
            />
          </div>
        </div>

        {/* Commentaire */}
        <div className="space-y-2">
          <Label htmlFor="comment" className="text-sm font-medium">
            Commentaire
          </Label>
          <Textarea
            id="comment"
            placeholder="Notes internes sur ce client..."
            rows={4}
            className="bg-background/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button className="flex-1">
            Enregistrer
          </Button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="mx-4 mb-4 h-[85vh] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50">
          <div className="overflow-y-auto h-full">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="m-4 mr-4 h-[calc(100vh-2rem)] w-full max-w-[680px] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50 overflow-y-auto p-0"
      >
        {content}
      </SheetContent>
    </Sheet>
  );
};
