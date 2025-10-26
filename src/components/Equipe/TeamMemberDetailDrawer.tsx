import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";

interface TeamMemberDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    name: string;
    role: string;
    client: string;
    initials: string;
  } | null;
}

export const TeamMemberDetailDrawer = ({
  open,
  onOpenChange,
  member,
}: TeamMemberDetailDrawerProps) => {
  const isMobile = useIsMobile();

  if (!member) return null;

  // Extract first name and last name from full name
  const nameParts = member.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={`
          ${isMobile ? "inset-0 w-full h-full rounded-none" : "h-full w-full max-w-[540px]"}
          bg-card border-l border-border overflow-y-auto p-0
        `}
      >
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="h-16 w-16 md:h-20 md:w-20">
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                  {member.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <SheetTitle className="text-xl md:text-2xl font-bold">
                  {member.name}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {member.name.toLowerCase().replace(/\s+/g, '.')}@finvisor.com
                </p>
              </div>
            </div>
            <Button size="default" className="shrink-0">
              Modifier
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Prénom */}
            <div className="space-y-2">
              <Label htmlFor="first-name" className="text-sm font-medium">
                Prénom
              </Label>
              <Input
                id="first-name"
                placeholder="Prénom"
                defaultValue={firstName}
                className="bg-background/50"
              />
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="last-name" className="text-sm font-medium">
                Nom
              </Label>
              <Input
                id="last-name"
                placeholder="Nom"
                defaultValue={lastName}
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail de contact
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="prenom.nom@finvisor.com"
                defaultValue={`${member.name.toLowerCase().replace(/\s+/g, '.')}@finvisor.com`}
                className="bg-background/50"
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Téléphone (optionnel)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Rôle */}
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">
                Rôle
              </Label>
              <Select defaultValue={member.role.toLowerCase()}>
                <SelectTrigger id="role" className="bg-background/50">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propriétaire</SelectItem>
                  <SelectItem value="admin">Collaborateur</SelectItem>
                  <SelectItem value="viewer">Lecteur</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {member.role === "Owner" && "Accès complet : ajout/suppression membres, reçus, clients"}
                {member.role === "Admin" && "Peut ajouter un membre mais pas en supprimer"}
                {member.role === "Viewer" && "Consultation uniquement, aucune action"}
              </p>
            </div>

            {/* Client assigné */}
            <div className="space-y-2">
              <Label htmlFor="client" className="text-sm font-medium">
                Client assigné
              </Label>
              <Input
                id="client"
                placeholder="Nom du client"
                defaultValue={member.client}
                className="bg-background/50"
              />
            </div>
          </div>

          {/* Commentaire */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Commentaire / Note interne
            </Label>
            <Textarea
              id="comment"
              placeholder="Notes internes sur ce membre..."
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
      </SheetContent>
    </Sheet>
  );
};
