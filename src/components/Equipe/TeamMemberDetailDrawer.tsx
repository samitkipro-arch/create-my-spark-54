import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TeamMemberDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    user_id?: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    notes?: string;
    initials: string;
  } | null;
}

type MemberFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

export const TeamMemberDetailDrawer = ({
  open,
  onOpenChange,
  member,
}: TeamMemberDetailDrawerProps) => {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<MemberFormData>({
    defaultValues: {
      first_name: member?.first_name || "",
      last_name: member?.last_name || "",
      email: member?.email || "",
      phone: member?.phone || "",
      notes: member?.notes || "",
    }
  });

  useEffect(() => {
    if (member) {
      reset({
        first_name: member.first_name || "",
        last_name: member.last_name || "",
        email: member.email || "",
        phone: member.phone || "",
        notes: member.notes || "",
      });
    } else {
      reset({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        notes: "",
      });
    }
    setIsEditing(!member);
  }, [member, reset]);

  const fullName = member ? `${member.first_name} ${member.last_name}`.trim() : "";

  const onSubmit = async (data: MemberFormData) => {
    try {
      if (member?.user_id) {
        const { error } = await (supabase as any)
          .from("org_members")
          .update({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone: data.phone,
            notes: data.notes,
          })
          .eq("user_id", member.user_id);

        if (error) throw error;
        toast.success("Membre modifié avec succès");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Non authentifié");

        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("org_id")
          .eq("user_id", user.id)
          .single();

        if (!profile?.org_id) throw new Error("Organisation introuvable");

        const { error } = await (supabase as any)
          .from("org_members")
          .insert({
            org_id: profile.org_id,
            user_id: user.id,
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone: data.phone,
            notes: data.notes,
          });

        if (error) throw error;
        toast.success("Membre ajouté avec succès");
      }

      await queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setIsEditing(false);
      onOpenChange(false);
    } catch (error: any) {
      // Erreur silencieuse
    }
  };

  const content = (
    <form onSubmit={handleSubmit(onSubmit)}>
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
                {fullName || "Nouveau membre"}
              </SheetTitle>
              <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                {member?.email || ""}
              </p>
            </div>
          </div>
          {member && (
            <Button size="default" className="shrink-0" type="button" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Annuler" : "Modifier"}
            </Button>
          )}
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
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
              {...register("first_name")}
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
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
              {...register("last_name")}
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
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
              {...register("email")}
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
              {...register("phone")}
            />
          </div>
        </div>

        {/* Commentaire */}
        <div className="space-y-3">
          <Label htmlFor="notes" className="text-base md:text-lg font-semibold text-foreground">
            Commentaire / Note interne
          </Label>
          <Textarea
            id="notes"
            placeholder="Notes internes sur ce membre..."
            rows={4}
            className="bg-background/50 resize-none min-h-[100px]"
            disabled={!isEditing}
            {...register("notes")}
          />
        </div>

        {/* Actions */}
        {isEditing && (
          <div className="flex gap-3 md:gap-4 pt-6 md:pt-8">
            <Button 
              variant="outline" 
              className="flex-1" 
              type="button"
              onClick={() => {
                if (member) {
                  setIsEditing(false);
                  reset();
                } else {
                  onOpenChange(false);
                }
              }}
            >
              Annuler
            </Button>
            <Button className="flex-1" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        )}
      </div>
    </form>
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
