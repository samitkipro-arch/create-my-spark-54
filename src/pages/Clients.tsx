import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, Users, Bell, Activity, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClientDetailDrawer } from "@/components/Clients/ClientDetailDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Client = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  siret_siren?: string | null;
  legal_representative?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type ClientKpis = {
  total_clients: number;
  active_30d: number;
  to_remind_7d: number;
};

type Profile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  org_id: string | null;
};

const WEBHOOK_URL = "https://samilzr.app.n8n.cloud/webhook-test/relance-client";

const Clients = () => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string>("new");
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sélection bulk (liste & table)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = (allIds: string[]) => setSelectedIds((prev) => (prev.length === allIds.length ? [] : allIds));

  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const queryClient = useQueryClient();

  // ---- Clients (liste)
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name, email, created_at, siret_siren, legal_representative, address, phone, notes")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Client[];
    },
  });

  // ---- KPI (RPC)
  const { data: kpis, isLoading: isLoadingKpis } = useQuery<ClientKpis>({
    queryKey: ["client-kpis"],
    queryFn: async (): Promise<ClientKpis> => {
      const { data, error } = await (supabase as any).rpc("client_kpis");
      if (error) throw error;
      const row = (data?.[0] ?? { total_clients: 0, active_30d: 0, to_remind_7d: 0 }) as ClientKpis;
      return row;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const totalClients = kpis?.total_clients ?? 0;
  const activeClients = kpis?.active_30d ?? 0;
  const toRemindClients = kpis?.to_remind_7d ?? 0;

  const anyLoading = isLoadingClients || isLoadingKpis;

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setDrawerKey(client.id);
    setDrawerOpen(true);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setDrawerKey(`new-${Date.now()}`);
    setDrawerOpen(true);
  };

  /* -------------------------
   * Widget "Relancer un client"
   * ------------------------*/
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [relanceSelectedIds, setRelanceSelectedIds] = useState<string[]>([]);
  const [sendCopyToMe, setSendCopyToMe] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [relanceLoading, setRelanceLoading] = useState(false);
  const [selectPopoverOpen, setSelectPopoverOpen] = useState(false);

  // Ouvre le widget
  const openRelance = () => {
    setRelanceOpen(true);
    // pré-sélection : s'il y a déjà une sélection dans la liste, on la réutilise
    setRelanceSelectedIds((prev) => (selectedIds.length ? selectedIds : prev));
  };

  // Récup infos comptable (profil + email session)
  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const sessionEmail = auth?.user?.email || null;
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("first_name,last_name,email,phone,org_id")
        .eq("user_id", auth?.user?.id)
        .maybeSingle();
      if (error) {
        console.error(error);
      }
      const p: Profile = {
        first_name: data?.first_name ?? null,
        last_name: data?.last_name ?? null,
        email: data?.email ?? sessionEmail,
        phone: data?.phone ?? null,
        org_id: data?.org_id ?? null,
      };
      setProfile(p);
    };
    load();
  }, []);

  const selectedClientsForRelance = clients.filter((c) => relanceSelectedIds.includes(c.id));

  const handleRelance = () => {
    // Bouton d’ouverture uniquement
    openRelance();
  };

  const toggleRelanceOne = (id: string) =>
    setRelanceSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleRelanceAll = () =>
    setRelanceSelectedIds((prev) => (prev.length === clients.length ? [] : clients.map((c) => c.id)));

  const sendRelanceNow = async () => {
    if (selectedClientsForRelance.length === 0) {
      toast({
        title: "Aucun client sélectionné",
        description: "Sélectionnez au moins un client.",
        variant: "destructive",
      });
      return;
    }
    setRelanceLoading(true);
    try {
      // Prépare payload
      const payload = {
        selected_clients: selectedClientsForRelance.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email || null,
        })),
        accountant: {
          first_name: profile?.first_name ?? null,
          last_name: profile?.last_name ?? null,
          email: profile?.email ?? null,
          phone: profile?.phone ?? null,
        },
        send_copy_to_me: sendCopyToMe,
      };

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let info: any = null;
        try {
          info = await res.json();
        } catch {}
        throw new Error(info?.error || `Webhook HTTP ${res.status}`);
      }

      toast({
        title: "Relance envoyée",
        description:
          `${selectedClientsForRelance.length} client(s) notifié(s).` +
          (sendCopyToMe ? " Copie envoyée au comptable." : ""),
      });

      setRelanceOpen(false);
      setRelanceSelectedIds([]);
      setSendCopyToMe(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erreur",
        description: e?.message || "Échec lors de l’envoi de la relance.",
        variant: "destructive",
      });
    } finally {
      setRelanceLoading(false);
    }
  };

  // Suppression simple (dialog par ligne)
  const handleDeleteClient = async () => {
    if (!toDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const { data, error } = await (supabase as any).from("clients").delete().eq("id", toDelete.id).select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Suppression bloquée par les règles d'accès (RLS). Vérifiez que votre policy autorise DELETE pour ce client.",
        );
      }

      toast({
        title: "Client supprimé",
        description: `« ${toDelete.name} » a été supprimé.`,
      });

      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-kpis"] });

      if (selectedClient?.id === toDelete.id) {
        setDrawerOpen(false);
        setSelectedClient(null);
      }

      setSelectedIds((prev) => prev.filter((id) => id !== toDelete.id));
    } catch (err: any) {
      toast({
        title: "Impossible de supprimer",
        description: err?.message ?? "Action interdite par la sécurité (RLS) ou autre erreur.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Suppression bulk
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const { data, error } = await (supabase as any).from("clients").delete().in("id", selectedIds).select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Suppression bloquée par les règles d'accès (RLS) pour ces clients sélectionnés.");
      }

      toast({
        title: "Suppression effectuée",
        description: `${data.length} client(s) supprimé(s).`,
      });

      if (selectedClient && data.some((d: any) => d.id === selectedClient.id)) {
        setDrawerOpen(false);
        setSelectedClient(null);
      }

      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-kpis"] });
    } catch (err: any) {
      toast({
        title: "Impossible de supprimer",
        description: err?.message ?? "Action interdite par la sécurité (RLS) ou autre erreur.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 transition-all duration-200">
        {/* Header actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-200">
          <div className="flex gap-3 w-full md:w-auto">
            <Button className="gap-2 w-full md:w-auto transition-all duration-200" onClick={handleNewClient}>
              <Plus className="w-4 h-4" />
              Ajouter un client
            </Button>

            {/* Relancer un client (ouvre le widget) */}
            <Button className="gap-2 w-full md:w-auto transition-all duration-200" onClick={handleRelance}>
              <Bell className="w-4 h-4" />
              Relancer un client
            </Button>

            {/* Supprimer (n'apparaît que s'il y a une sélection) */}
            {selectedIds.length > 0 && (
              <Button
                className="w-full md:w-auto transition-all duration-200 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? "Suppression…" : "Supprimer"}
              </Button>
            )}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {/* Total clients */}
          <Card className="bg-card/60 border-border">
            <CardContent className="flex items-center justify-between p-5 md:p-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Clients</div>
                <div className="text-3xl font-semibold tracking-tight">{anyLoading ? "—" : totalClients}</div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Actifs (30j) */}
          <Card className="bg-card/60 border-border">
            <CardContent className="flex items-center justify-between p-5 md:p-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Clients actifs (30j)</div>
                <div className="text-3xl font-semibold tracking-tight">
                  {anyLoading ? "—" : `${activeClients} / ${totalClients}`}
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Activity className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* À relancer (>7j) */}
          <Card className="bg-card/60 border-border">
            <CardContent className="flex items-center justify-between p-5 md:p-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Clients à relancer (&gt; 7 j)</div>
                <div className="text-3xl font-semibold tracking-tight">
                  {anyLoading ? "—" : `${toRemindClients} / ${totalClients}`}
                </div>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Bell className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recherche */}
        <div className="relative transition-all duration-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher" className="pl-10" />
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-2.5 transition-all duration-200">
          {isLoadingClients ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement…</div>
          ) : clients.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Aucun client n&apos;a encore été ajouté
            </div>
          ) : (
            clients.map((client) => {
              const checked = selectedIds.includes(client.id);
              return (
                <Card key={client.id} className="bg-card/50 border-border transition-all duration-200 hover:shadow-lg">
                  <CardContent className="p-3.5 space-y-2 transition-all duration-150">
                    {/* Ligne d’en-tête : Checkbox à gauche, actions à droite */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleOne(client.id)}
                          aria-label="Sélectionner le client"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                        <button
                          className="font-semibold text-sm text-left truncate"
                          onClick={() => handleClientClick(client)}
                        >
                          {client.name}
                        </button>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions client">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleClientClick(client)}>Modifier</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToDelete(client)}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div
                      className="text-xs text-primary cursor-pointer truncate"
                      onClick={() => handleClientClick(client)}
                    >
                      {client.email || "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Créé le {new Date(client.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop: Table */}
        <Card className="hidden md:block bg-card border-border transition-all duration-200">
          <CardContent className="p-0 transition-all duration-150">
            {isLoadingClients ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement…</div>
            ) : clients.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                Aucun client n&apos;a encore été ajouté
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={clients.length > 0 && selectedIds.length === clients.length}
                        onCheckedChange={() => toggleAll(clients.map((c) => c.id))}
                        aria-label="Tout sélectionner"
                      />
                    </TableHead>
                    <TableHead>Nom du client</TableHead>
                    <TableHead>Email de contact</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50">
                      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(client.id)}
                          onCheckedChange={() => toggleOne(client.id)}
                        />
                      </TableCell>

                      <TableCell className="font-medium cursor-pointer" onClick={() => handleClientClick(client)}>
                        {client.name}
                      </TableCell>
                      <TableCell className="text-primary cursor-pointer" onClick={() => handleClientClick(client)}>
                        {client.email || "—"}
                      </TableCell>
                      <TableCell className="cursor-pointer" onClick={() => handleClientClick(client)}>
                        {new Date(client.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Actions client">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleClientClick(client)}>Modifier</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setToDelete(client)}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ClientDetailDrawer
          key={drawerKey}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          client={
            selectedClient
              ? {
                  id: selectedClient.id,
                  name: selectedClient.name,
                  email: selectedClient.email || "",
                  siret_siren: selectedClient.siret_siren || undefined,
                  legal_representative: selectedClient.legal_representative || undefined,
                  address: selectedClient.address || undefined,
                  phone: selectedClient.phone || undefined,
                  notes: selectedClient.notes || undefined,
                }
              : null
          }
        />
      </div>

      {/* Confirm suppression (par ligne) */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client <span className="font-medium">{toDelete?.name}</span> sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
              onClick={handleDeleteClient}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --------- Widget Relancer un client --------- */}
      <Dialog open={relanceOpen} onOpenChange={setRelanceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Relancer un client</DialogTitle>
            <DialogDescription>
              Un mail automatique sera envoyé à votre client pour lui rappeler de déposer ou compléter ses reçus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* CC comptable */}
            <div className="flex items-center space-x-2">
              <Checkbox id="sendCopy" checked={sendCopyToMe} onCheckedChange={(v) => setSendCopyToMe(!!v)} />
              <Label htmlFor="sendCopy" className="cursor-pointer">
                Envoyer le mail à moi également.
              </Label>
            </div>

            {/* Sélecteur multi (menu déroulant avec cases) */}
            <Popover open={selectPopoverOpen} onOpenChange={setSelectPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {relanceSelectedIds.length === 0
                      ? "Sélectionner un client"
                      : `${relanceSelectedIds.length} client(s) sélectionné(s)`}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0">
                <div className="p-2 border-b flex items-center justify-between">
                  <div className="text-sm font-medium">Clients</div>
                  <Button variant="ghost" size="sm" onClick={toggleRelanceAll} className="h-7 px-2 text-xs">
                    {relanceSelectedIds.length === clients.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                </div>

                <div className="max-h-64 overflow-auto">
                  {clients.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Aucun client.</div>
                  ) : (
                    clients.map((c) => {
                      const checked = relanceSelectedIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/60",
                            checked && "bg-muted/50",
                          )}
                          onClick={() => toggleRelanceOne(c.id)}
                        >
                          <div
                            className={cn(
                              "grid place-items-center h-4 w-4 rounded border",
                              checked ? "bg-primary text-primary-foreground" : "bg-background",
                            )}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm truncate">{c.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{c.email || "—"}</div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Récap rapide (optionnel, non intrusif) */}
            {relanceSelectedIds.length > 0 && (
              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                {relanceSelectedIds.length} client(s) prêt(s) à être relancé(s).
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRelanceOpen(false)} disabled={relanceLoading}>
              Annuler
            </Button>
            <Button onClick={sendRelanceNow} disabled={relanceLoading || relanceSelectedIds.length === 0}>
              {relanceLoading ? "Envoi..." : "Relancer maintenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* --------- /Widget --------- */}
    </MainLayout>
  );
};

export default Clients;
