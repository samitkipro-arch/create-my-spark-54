import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ReceiptsTableProps {
  receipts: any[];
  loading: boolean;
}

export function ReceiptsTable({ receipts, loading }: ReceiptsTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun reçu trouvé
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Montant</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((receipt: any) => (
            <TableRow key={receipt.id}>
              <TableCell>{new Date(receipt.created_at).toLocaleDateString('fr-FR')}</TableCell>
              <TableCell>{receipt.client_name || '-'}</TableCell>
              <TableCell>{receipt.amount ? `${receipt.amount} €` : '-'}</TableCell>
              <TableCell>{receipt.category || '-'}</TableCell>
              <TableCell>
                <Badge variant={receipt.status === 'approved' ? 'default' : 'secondary'}>
                  {receipt.status || 'En attente'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
