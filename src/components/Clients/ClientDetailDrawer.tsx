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

interface ClientDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id?: string;
    name: string;
    email: string;
    siret_siren?: string;
    legal_representative?: string;
    address?: string;
    phone?: string;
    notes?: string;
  } | null;
}

type ClientFormData = {
  name: string;
  siret_siren: string;
  legal_representative: string;
  address: string;
  email: string;
  phone: string;
  notes: string;
}

export const ClientDetailDrawer = ({
  open,
  onOpenChange,
  client,
}: ClientDetailDrawerProps) => {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ClientFormData>({
    defaultValues: {
      name: client?.name || "",
      siret_siren: client?.siret_siren || "",
      legal_representative: client?.legal_representative || "",
      address: client?.address || "",
      email: client?.email || "",
      phone: client?.phone || "",
      notes: client?.notes || "",
    }
  });

  useEffect(() => {
    if (client) {
      reset({
        name: client.name || "",
        siret_siren: client.siret_siren || "",
        legal_representative: client.legal_representative || "",
        address: client.address || "",
        email: client.email || "",
        phone: client.phone || "",
        notes: client.notes || "",
      });
    } else {
      reset({
        name: "",
        siret_siren: "",
        legal_representative: "",
        address: "",
        email: "",
        phone: "",
        notes: "",
      });
    }
    setIsEditing(!client);
  }, [client, reset]);

  const initials = client?.name
    ? client.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "NC";

  const onSubmit = async (data: ClientFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("Organisation introuvable");

      if (client?.id) {
        const { error } = await (supabase as any)
          .from("clients")
          .update({
            name: data.name,
            siret_siren: data.siret_siren,
            legal_representative: data.legal_representative,
            address: data.address,
            email: data.email,
            phone: data.phone,
            notes: data.notes,
          })
          .eq("id", client.id);

        if (error) throw error;
        toast.success("Client modifié avec succès");
      } else {
        const { error } = await (supabase as any)
          .from("clients")
          .insert({
            org_id: profile.org_id,
            name: data.name,
            siret_siren: data.siret_siren,
            legal_representative: data.legal_representative,
            address: data.address,
            email: data.email,
            phone: data.phone,
            notes: data.notes,
          });

        if (error) throw error;
        toast.success("Client ajouté avec succès");
      }

      await queryClient.invalidateQueries({ queryKey: ["clients"] });
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
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl md:text-3xl font-bold">
                {client?.name || "Nouveau client"}
              </SheetTitle>
              <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
                {client?.email || ""}
              </p>
            </div>
          </div>
          {client && (
            <Button size="default" className="shrink-0" type="button" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Annuler" : "Modifier"}
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Raison sociale */}
        <div className="space-y-3">
          <Label htmlFor="company-name" className="text-base md:text-lg font-semibold text-foreground">
            Raison sociale / Nom légal de l'entreprise
          </Label>
          <Input
            id="company-name"
            placeholder="Nom de l'entreprise"
            className="bg-background/50 h-11 md:h-12"
            disabled={!isEditing}
            {...register("name")}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* SIRET/SIREN */}
          <div className="space-y-3">
            <Label htmlFor="siret-siren" className="text-base md:text-lg font-semibold text-foreground">
              SIRET / SIREN (optionnel)
            </Label>
            <Input
              id="siret-siren"
              placeholder="123 456 789 00010"
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
              {...register("siret_siren")}
            />
          </div>

          {/* Nom dirigeant */}
          <div className="space-y-3">
            <Label htmlFor="representative" className="text-base md:text-lg font-semibold text-foreground">
              Nom complet du dirigeant / représentant légal
            </Label>
            <Input
              id="representative"
              placeholder="Prénom Nom"
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
              {...register("legal_representative")}
            />
          </div>
        </div>

        {/* Adresse */}
        <div className="space-y-3">
          <Label htmlFor="address" className="text-base md:text-lg font-semibold text-foreground">
            Adresse complète du siège social (optionnel)
          </Label>
          <Input
            id="address"
            placeholder="Numéro, rue, ville, code postal"
            className="bg-background/50 h-11 md:h-12"
            disabled={!isEditing}
            {...register("address")}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* E-mail */}
          <div className="space-y-3">
            <Label htmlFor="email" className="text-base md:text-lg font-semibold text-foreground">
              E-mail de contact de l'entreprise
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@entreprise.fr"
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
              {...register("email")}
            />
          </div>

          {/* Téléphone */}
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-base md:text-lg font-semibold text-foreground">
              Téléphone de contact de l'entreprise (optionnel)
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 1 23 45 67 89"
              className="bg-background/50 h-11 md:h-12"
              disabled={!isEditing}
              {...register("phone")}
            />
          </div>
        </div>

        {/* Commentaire */}
        <div className="space-y-3">
          <Label htmlFor="notes" className="text-base md:text-lg font-semibold text-foreground">
            Commentaire
          </Label>
          <Textarea
            id="notes"
            placeholder="Notes internes sur ce client..."
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
                if (client) {
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
        className="m-4 mr-4 h-[calc(100vh-2rem)] w-full max-w-[1200px] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50 overflow-y-auto p-0"
      >
        {content}
      </SheetContent>
    </Sheet>
  );
};
