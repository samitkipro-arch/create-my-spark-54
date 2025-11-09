import { useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiptDetailDrawer } from "@/components/Recus/ReceiptDetailDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

type Receipt = {
  id: number;
  enseigne: string | null;
  montant_ttc: number | null;
  status: string;
  created_at: string;
  org_id: string;
  client_id: string | null;
  processed_by: string | null;
};

const Recus = () => {
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [receiptDetail, setReceiptDetail] = useState<any>(null);

  const { data: receipts = [], isLoading, refetch } = useQuery({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("recus")
        .select("id, enseigne, montant_ttc, status, created_at, org_id, client_id, processed_by")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Receipt[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return (data || []).map((c: any) => ({ id: c.id, name: c.name }));
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-with-profiles"],
    queryFn: async () => {
      // Get current user's org_id first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.org_id) return [];

      // Use RPC to get org members
      const { data, error } = await (supabase as any)
        .rpc("get_org_members", { p_org_id: profile.org_id });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.user_id,
        name: r.name,
      }));
    },
  });

  const handleReceiptClick = async (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const { data, error } = await (supabase as any)
        .from("recus")
        .select("*")
        .eq("id", receipt.id)
        .single();

      if (error) throw error;
      setReceiptDetail(data);
    } catch (err: any) {
      console.error("Error loading receipt details:", err);
      setDetailError(err.message || "Erreur lors du chargement");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleValidated = (id: number) => {
    refetch();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      "nouveau": "default",
      "en_cours": "secondary",
      "traite": "outline",
    };
    const labels: Record<string, string> = {
      "nouveau": "Nouveau",
      "en_cours": "En cours",
      "traite": "Traité",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <Button className="gap-2 w-full md:w-auto">
            <Upload className="w-4 h-4" />
            Téléverser des reçus
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher" className="pl-10" />
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-2.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Chargement…</div>
          ) : receipts.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Aucun reçu
            </div>
          ) : (
            receipts.map((receipt) => (
              <Card
                key={receipt.id}
                className="bg-card/50 border-border hover:shadow-lg cursor-pointer"
                onClick={() => handleReceiptClick(receipt)}
              >
                <CardContent className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{receipt.enseigne || "—"}</div>
                    {getStatusBadge(receipt.status)}
                  </div>
                  <div className="text-sm font-medium text-primary">
                    {formatCurrency(receipt.montant_ttc || 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDateTime(receipt.created_at)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop: Table */}
        <Card className="hidden md:block bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enseigne</TableHead>
                  <TableHead>Montant TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Chargement…
                    </TableCell>
                  </TableRow>
                ) : receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Aucun reçu
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt) => (
                    <TableRow
                      key={receipt.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleReceiptClick(receipt)}
                    >
                      <TableCell className="font-medium">{receipt.enseigne || "—"}</TableCell>
                      <TableCell>{formatCurrency(receipt.montant_ttc || 0)}</TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(receipt.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ReceiptDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        detail={receiptDetail}
        loading={detailLoading}
        error={detailError}
        clients={clients}
        members={members}
        onValidated={handleValidated}
      />
    </MainLayout>
  );
};

export default Recus;
