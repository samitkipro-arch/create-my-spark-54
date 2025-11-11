import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/Dashboard/DateRangePicker";
import type { DateRange } from "react-day-picker";
import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Receipt, Globe, FileText, ShoppingCart, AlertCircle } from "lucide-react";

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
};

export const ClientDetailDrawer = ({ open, onOpenChange, client }: ClientDetailDrawerProps) => {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // ----- Date range pour KPI -----
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  });
  const handleDateRangeChange = (range?: DateRange) => {
    if (range?.from && range?.to) setDateRange({ from: startOfDay(range.from), to: endOfDay(range.to) });
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ClientFormData>({
    defaultValues: {
      name: client?.name || "",
      siret_siren: client?.siret_siren || "",
      legal_representative: client?.legal_representative || "",
      address: client?.address || "",
      email: client?.email || "",
      phone: client?.phone || "",
      notes: client?.notes || "",
    },
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        const { error } = await (supabase as any).from("clients").insert({
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
      toast.error(error.message || "Une erreur est survenue");
    }
  };

  /** ---------- Data KPI pour CE client ---------- */
  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ["client-receipts", client?.id, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!client?.id || !dateRange?.from || !dateRange?.to) return [];
      const { data, error } = await (supabase as any)
        .from("recus")
        .select("*")
        .eq("client_id", client.id)
        .gte("date_traitement", dateRange.from.toISOString())
        .lte("date_traitement", dateRange.to.toISOString());
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!client?.id && !!dateRange?.from && !!dateRange?.to && open,
  });

  const kpis = useMemo(() => {
    const ht = receipts.reduce(
      (sum, r) => sum + (Number(r.montant_ht) || (Number(r.montant_ttc) || 0) - (Number(r.tva) || 0)),
      0,
    );
    const ttc = receipts.reduce((s, r) => s + (Number(r.montant_ttc) || 0), 0);
    const tva = receipts.reduce((s, r) => s + (Number(r.tva) || 0), 0);
    return {
      count: receipts.length,
      ht,
      tva,
      ttc,
    };
  }, [receipts]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

  const buildSparkData = () => {
    if (!dateRange?.from || !dateRange?.to || receipts.length === 0) return [];
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    const groupByDay = daysDiff <= 31;

    if (groupByDay) {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      return days.map((day) => {
        const rows = receipts.filter(
          (r) => format(new Date(r.date_traitement || r.created_at), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
        );
        return {
          x: format(day, "dd/MM", { locale: fr }),
          y: rows.reduce((s, r) => s + (Number(r.montant_ttc) || 0), 0),
        };
      });
    } else {
      const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
      return months.map((m) => {
        const mStart = startOfMonth(m);
        const mEnd = endOfMonth(m);
        const rows = receipts.filter((r) => {
          const d = new Date(r.date_traitement || r.created_at);
          return d >= mStart && d <= mEnd;
        });
        return {
          x: format(m, "MMM yy", { locale: fr }),
          y: rows.reduce((s, r) => s + (Number(r.montant_ttc) || 0), 0),
        };
      });
    }
  };

  /** ---------- UI Helpers ---------- */

  const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-border/60 bg-background/50">
      <div className="flex items-start justify-between p-4 md:p-5 border-b border-border/60">
        <div>
          <h3 className="text-sm md:text-base font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs md:text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
        </div>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );

  const ReadonlyValue = ({ value }: { value?: string }) => (
    <div className="min-h-[44px] flex items-center rounded-md border border-border/60 bg-muted/20 px-3 text-sm break-all whitespace-normal">
      {value && value.trim().length > 0 ? value : "—"}
    </div>
  );

  const Field = ({
    id,
    label,
    type = "text",
    placeholder,
    registerKey,
    readOnlyValue,
  }: {
    id: string;
    label: string;
    type?: string;
    placeholder?: string;
    registerKey: keyof ClientFormData;
    readOnlyValue?: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px] md:text-sm">
        {label}
      </Label>
      {isEditing ? (
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          className="h-11 md:h-12 bg-background"
          {...register(registerKey)}
        />
      ) : (
        <ReadonlyValue value={readOnlyValue} />
      )}
    </div>
  );

  const onRelance = () => {
    if (!client?.email) {
      toast.info("Ajoutez un e-mail de contact pour relancer ce client.");
      return;
    }
    toast.success("Relance envoyée (démo) — branche n8n à connecter.");
  };

  // ----- KPI Card inline -----
  const KpiCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3.5 py-3">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );

  const content = (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Header sticky (sans actions) */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border px-6 py-4 md:px-8 md:py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-5">
            <Avatar className="h-12 w-12 md:h-14 md:w-14 ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-lg md:text-2xl font-bold tracking-tight">
                {client?.name || "Nouveau client"}
              </SheetTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                {client?.email || "Renseignez les informations ci-dessous"}
              </p>
            </div>
          </div>
          {/* Plus de boutons ici (desktop & mobile) */}
          <div className="hidden" />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        {/* KPI + DateRangePicker */}
        <div className="rounded-2xl border border-border/60 bg-background/50 p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4">
            <div className="text-sm font-semibold">KPI (période)</div>
            <div className="flex-1" />
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          </div>

          {/* MOBILE -> 1 par ligne | DESKTOP -> 4 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KpiCard icon={Receipt} label="Reçus traités" value={loadingReceipts ? "…" : String(kpis.count)} />
            <KpiCard icon={Globe} label="Montant HT" value={loadingReceipts ? "…" : formatCurrency(kpis.ht)} />
            <KpiCard icon={FileText} label="TVA récupérable" value={loadingReceipts ? "…" : formatCurrency(kpis.tva)} />
            <KpiCard icon={ShoppingCart} label="Montant TTC" value={loadingReceipts ? "…" : formatCurrency(kpis.ttc)} />
          </div>

          {buildSparkData().length > 0 ? (
            <div className="mt-3 text-[11px] md:text-xs text-muted-foreground">
              Période :{" "}
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                : "—"}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-[11px] md:text-xs text-muted-foreground">
              <AlertCircle size={14} /> Aucune donnée sur la période sélectionnée.
            </div>
          )}
        </div>

        {/* Identité */}
        <Section title="Identité légale" subtitle="Raison sociale et informations juridiques.">
          <div className="grid grid-cols-1 gap-4 md:gap-5">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-[13px] md:text-sm">
                Raison sociale / Nom légal de l'entreprise
              </Label>
              {isEditing ? (
                <Input
                  id="company-name"
                  placeholder="Nom de l'entreprise"
                  className="h-11 md:h-12 bg-background"
                  {...register("name")}
                />
              ) : (
                <ReadonlyValue value={client?.name} />
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-5">
              <Field
                id="siret-siren"
                label="SIRET / SIREN (optionnel)"
                placeholder="123 456 789 00010"
                registerKey="siret_siren"
                readOnlyValue={client?.siret_siren}
              />
              <Field
                id="representative"
                label="Nom complet du dirigeant / représentant légal"
                placeholder="Prénom Nom"
                registerKey="legal_representative"
                readOnlyValue={client?.legal_representative}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-[13px] md:text-sm">
                Adresse complète du siège social (optionnel)
              </Label>
              {isEditing ? (
                <Input
                  id="address"
                  placeholder="Numéro, rue, ville, code postal"
                  className="h-11 md:h-12 bg-background"
                  {...register("address")}
                />
              ) : (
                <ReadonlyValue value={client?.address} />
              )}
            </div>
          </div>
        </Section>

        {/* Contact & relances (sans boutons d'action pour éviter doublon) */}
        <Section title="Contact & relances" subtitle="Coordonnées principales de l’entreprise.">
          <div className="grid md:grid-cols-2 gap-4 md:gap-5">
            <Field
              id="email"
              label="E-mail de contact de l'entreprise"
              type="email"
              placeholder="contact@entreprise.fr"
              registerKey="email"
              readOnlyValue={client?.email}
            />
            <Field
              id="phone"
              label="Téléphone de contact de l'entreprise (optionnel)"
              type="tel"
              placeholder="+33 1 23 45 67 89"
              registerKey="phone"
              readOnlyValue={client?.phone}
            />
          </div>
        </Section>

        {/* Règles TVA (visuel) */}
        <Section
          title="Règles TVA (bientôt)"
          subtitle="Configurez les règles d’éligibilité pour la récupération de TVA. (Visuel uniquement, pas encore connecté)"
        >
          <div className="grid md:grid-cols-2 gap-4 md:gap-5 opacity-80">
            <div className="space-y-2">
              <Label className="text-[13px] md:text-sm">Régime TVA</Label>
              <Input disabled placeholder="Réal normal / Simplifié / Franchise (à venir)" />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] md:text-sm">Prorata TVA (%)</Label>
              <Input disabled placeholder="100 (à venir)" />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] md:text-sm">Véhicules</Label>
              <Input disabled placeholder="VP / VU (à venir)" />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] md:text-sm">Repas déductibles (%)</Label>
              <Input disabled placeholder="100 (à venir)" />
            </div>
          </div>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-3">
            Astuce : ces règles s’appliqueront automatiquement à l’analyse des reçus pour calculer la TVA récupérable.
          </p>
        </Section>

        {/* Notes */}
        <Section title="Notes internes" subtitle="Informations utiles pour votre équipe (non visibles par le client).">
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[13px] md:text-sm">
              Commentaire
            </Label>
            {isEditing ? (
              <Textarea
                id="notes"
                placeholder="Notes internes sur ce client..."
                rows={5}
                className="resize-none bg-background"
                {...register("notes")}
              />
            ) : (
              <ReadonlyValue value={client?.notes} />
            )}
          </div>
        </Section>

        <div className="h-2" />
      </div>

      {/* Footer sticky (actions uniques, pas de doublon) */}
      <div className="sticky bottom-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t border-border px-6 py-4 md:px-8 md:py-5">
        {isEditing ? (
          <div className="flex gap-3 md:gap-4">
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
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button className="flex-1" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 md:gap-4 justify-end">
            {client ? (
              <>
                <Button type="button" variant="outline" onClick={onRelance}>
                  Relancer ce client
                </Button>
                <Button type="button" onClick={() => setIsEditing(true)}>
                  Modifier
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="mx-4 mb-4 h-[85vh] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-border/50 overflow-x-hidden">
          <div className="overflow-y-auto overflow-x-hidden h-full">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="m-4 h-[calc(100vh-2rem)] w-full max-w-[1200px] rounded-2xl bg-card/95 backdrop-blur-lg shadow-[0_10px_40px_rgba(0,0,0,0.40)] border border-border/60 p-0 overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Détail client</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-y-auto">{content}</div>
      </SheetContent>
    </Sheet>
  );
};
