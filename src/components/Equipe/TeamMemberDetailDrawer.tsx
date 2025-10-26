import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

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
  const [isEditing, setIsEditing] = useState(false);

  // Extract first name and last name from full name
  const nameParts = member?.name ? member.name.split(" ") : [];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const handleSave = () => {
    // TODO: Implement save logic
    setIsEditing(false);
    console.log("Saving team member data...");
  };

  const content = (
    <>
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4 md:gap-6 flex-1">
            <Avatar className="h-16 w-16 md:h-24 md:w-24">
              <AvatarFallback className="bg-primary/20 text-primary text-xl md:text-2xl font-semibold">
                {member?.initials || "NM"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl md:text-3xl font-bold">
                {member?.name || "Nouveau membre"}
              </SheetTitle>
              <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                {member?.name ? `${member.name.toLowerCase().replace(/\s+/g, '.')}@finvisor.com` : ""}
              </p>
            </div>
          </div>
          <Button size="default" className="shrink-0" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "Annuler" : "Modifier"}
          </Button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Prénom */}
          <div className="space-y-3">
            <Label htmlFor="first-name" className="text-base md:text-lg font-semibold text-foreground">
              Prénom
            </Label>
            <Input
              id="first-name"
              placeholder="Prénom"
              defaultValue={firstName}
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
            />
          </div>

          {/* Nom */}
          <div className="space-y-3">
            <Label htmlFor="last-name" className="text-base md:text-lg font-semibold text-foreground">
              Nom
            </Label>
            <Input
              id="last-name"
              placeholder="Nom"
              defaultValue={lastName}
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* E-mail */}
          <div className="space-y-3">
            <Label htmlFor="email" className="text-base md:text-lg font-semibold text-foreground">
              E-mail de contact
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="prenom.nom@finvisor.com"
              defaultValue={member?.name ? `${member.name.toLowerCase().replace(/\s+/g, '.')}@finvisor.com` : ""}
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-base md:text-lg font-semibold text-foreground">
              Téléphone (optionnel)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Rôle */}
          <div className="space-y-3">
            <Label htmlFor="role" className="text-base md:text-lg font-semibold text-foreground">
              Rôle
            </Label>
            <Select defaultValue={member?.role ? member.role.toLowerCase() : "viewer"} disabled={!isEditing}>
              <SelectTrigger id="role" className="bg-background/50 h-11 md:h-12">
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Propriétaire</SelectItem>
                <SelectItem value="admin">Collaborateur</SelectItem>
                <SelectItem value="viewer">Lecteur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client assigné */}
          <div className="space-y-3">
            <Label htmlFor="client" className="text-base md:text-lg font-semibold text-foreground">
              Client assigné
            </Label>
            <Input
              id="client"
              placeholder="Nom du client"
              defaultValue={member?.client}
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
            />
          </div>
        </div>

        {/* Commentaire */}
        <div className="space-y-3">
          <Label htmlFor="comment" className="text-base md:text-lg font-semibold text-foreground">
            Commentaire / Note interne
          </Label>
          <Textarea
            id="comment"
            placeholder="Notes internes sur ce membre..."
            rows={4}
            className="bg-background/50 resize-none min-h-[100px]"
            disabled={!isEditing}
          />
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="flex gap-3 md:gap-4 pt-6 md:pt-8">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="mx-4 mb-6 h-[85vh] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50 overflow-x-hidden">
          <div className="overflow-y-auto overflow-x-hidden h-full">
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
        className="m-4 mr-4 h-[calc(100vh-2rem)] w-full max-w-[1200px] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50 overflow-y-auto p-0"
      >
        {content}
      </SheetContent>
    </Sheet>
  );
};
