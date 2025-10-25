import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ClientSelect } from "@/components/dashboard/ClientSelect";
import { ReceiptsTable } from "@/components/receipts/ReceiptsTable";
import { UploadReceiptDialog } from "@/components/UploadReceiptDialog";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });

  // === Charger les reçus ===
  async function loadReceipts() {
    setLoading(true);

    const { data, error } = await supabase.rpc("recus_feed_list", {
      p_from: dateRange.from,
      p_to: dateRange.to,
      p_clients: clientId ? [clientId] : null,
      p_status: status ? [status] : null,
      p_search: search || null,
      p_limit: 20,
      p_offset: 0,
    });

    if (error) console.error("Erreur chargement reçus:", error);
    else setReceipts(data || []);

    setLoading(false);
  }

  // === Realtime ===
  useEffect(() => {
    loadReceipts();

    const channel = supabase
      .channel("realtime:recus")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, loadReceipts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [search, clientId, status, dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <ClientSelect value={clientId} onChange={setClientId} />
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Input
            placeholder="Rechercher un reçu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px]"
          />
          <Button variant="outline" onClick={() => loadReceipts()}>
            Rafraîchir
          </Button>
        </div>

        <UploadReceiptDialog />
      </div>

      <ReceiptsTable receipts={receipts} loading={loading} />
    </div>
  );
}
