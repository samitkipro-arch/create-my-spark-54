import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReceiptDetailDrawer } from "@/components/Recus/ReceiptDetailDrawer";
import { Plus, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

type Receipt = {
  id: number;
  org_id: string;
  enseigne: string | null;
  numero_recu: string | null;
  montant: number | null;
  montant_ttc: number | null;
  montant_ht: number | null;
  tva: number | null;
  ville: string | null;
  adresse: string | null;
  moyen_paiement: string | null;
  categorie: string | null;
  date_traitement: string | null;
  created_at: string;
  status: string | null;
  client_id: string | null;
  processed_by: string | null;
  _clientName?: string;
  _processedByName?: string;
};

type Client = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  name: string;
};

const Recus = () => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Fetch receipts
  const { data: receipts = [], isLoading, refetch } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("recus")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const receiptsData = (data || []) as Receipt[];

      // Fetch clients
      const clientIds = [...new Set(receiptsData.map((r) => r.client_id).filter(Boolean))];
      let clientsMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clientsData } = await (supabase as any)
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        if (clientsData) {
          clientsMap = Object.fromEntries(clientsData.map((c: any) => [c.id, c.name]));
        }
      }

      // Fetch members
      const memberIds = [...new Set(receiptsData.map((r) => r.processed_by).filter(Boolean))];
      let membersMap: Record<string, string> = {};
      if (memberIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from("profiles")
          .select("user_id, first_name, last_name")
          .in("user_id", memberIds);
        if (profilesData) {
          membersMap = Object.fromEntries(
            profilesData.map((p: any) => [
              p.user_id,
              `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Membre sans nom",
            ]),
          );
        }
      }

      // Enrich receipts
      return receiptsData.map((r) => ({
        ...r,
        _clientName: r.client_id ? clientsMap[r.client_id] : undefined,
        _processedByName: r.processed_by ? membersMap[r.processed_by] : undefined,
      }));
    },
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("id, name").order("name");
      if (error) throw error;
      return (data || []) as Client[];
    },
  });

  // Fetch members for dropdown
  const { data: members = [] } = useQuery({
    queryKey: ["members-with-profiles"],
    queryFn: async () => {
      // Get current user's org_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) return [];

      // Use RPC to get org members
      const { data, error } = await (supabase as any).rpc("get_org_members", { p_org_id: profile.org_id });
      if (error) throw error;

      return ((data as any[]) || []).map((r: any) => ({
        id: r.user_id as string,
        name: r.name as string,
      }));
    },
  });

  const handleReceiptClick = async (receipt: Receipt) => {
    setDrawerLoading(true);
    setDrawerError(null);
    setSelectedReceipt(receipt);
    setDrawerOpen(true);
    setDrawerLoading(false);
  };

  const handleValidated = (id: number) => {
    refetch();
  };

  const filteredReceipts = receipts.filter(
    (r) =>
      r.enseigne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.numero_recu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ville?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: string | null) => {
    if (status === "traite") {
      return <Badge variant="default">Traité</Badge>;
    }
    return <Badge variant="secondary">En attente</Badge>;
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold">Reçus</h1>
          <Button size={isMobile ? "default" : "default"}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un reçu
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Rechercher un reçu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile View - Cards */}
        {isMobile ? (
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Chargement...</p>
            ) : filteredReceipts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun reçu trouvé</p>
            ) : (
              filteredReceipts.map((receipt) => (
                <Card key={receipt.id} className="cursor-pointer" onClick={() => handleReceiptClick(receipt)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold">{receipt.enseigne || "—"}</p>
                        <p className="text-sm text-muted-foreground">Reçu n° {receipt.numero_recu || "—"}</p>
                      </div>
                      {getStatusBadge(receipt.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-lg">{formatCurrency(receipt.montant_ttc || receipt.montant || 0)}</p>
                      <p className="text-muted-foreground">{formatDateTime(receipt.date_traitement || receipt.created_at)}</p>
                      {receipt._clientName && <p className="text-muted-foreground">Client: {receipt._clientName}</p>}
                      {receipt._processedByName && (
                        <p className="text-muted-foreground">Traité par: {receipt._processedByName}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Desktop View - Table */
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enseigne</TableHead>
                    <TableHead>N° Reçu</TableHead>
                    <TableHead>Montant TTC</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Traité par</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  ) : filteredReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun reçu trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className="cursor-pointer" onClick={() => handleReceiptClick(receipt)}>
                        <TableCell className="font-medium">{receipt.enseigne || "—"}</TableCell>
                        <TableCell>{receipt.numero_recu || "—"}</TableCell>
                        <TableCell>{formatCurrency(receipt.montant_ttc || receipt.montant || 0)}</TableCell>
                        <TableCell>{receipt.ville || "—"}</TableCell>
                        <TableCell>{formatDateTime(receipt.date_traitement || receipt.created_at)}</TableCell>
                        <TableCell>{receipt._clientName || "—"}</TableCell>
                        <TableCell>{receipt._processedByName || "—"}</TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Detail Drawer */}
      <ReceiptDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        detail={selectedReceipt}
        loading={drawerLoading}
        error={drawerError}
        clients={clients}
        members={members}
        onValidated={handleValidated}
      />
    </MainLayout>
  );
};

export default Recus;
