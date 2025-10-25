import { useEffect, useState } from "react";
import MainLayout from "@/components/Layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Receipt = {
  id: number;
  created_at: string;
  numero_recu: string;
  enseigne: string;
  adresse: string;
  montant: number;
};

export default function Recus() {
  const [rows, setRows] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Récupère les reçus depuis Supabase
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("recus") // ou .rpc("recus_feed_list") si tu veux utiliser la fonction SQL
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setRows(data || []);
    setLoading(false);
  };

  // 🔹 Chargement initial
  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("recus-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reçus</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              Exporter
            </Button>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un reçu
            </Button>
          </div>
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
          <Input placeholder="Rechercher par enseigne ou numéro de reçu" className="pl-9" />
        </div>

        {/* TABLEAU DES REÇUS */}
        <Card className="border border-border/40 bg-background/40">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-muted-foreground">Chargement…</div>
            ) : error ? (
              <div className="p-6 text-red-500">{error}</div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-muted-foreground">Aucun reçu trouvé</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/20">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Numéro</th>
                    <th className="text-left p-3">Enseigne</th>
                    <th className="text-left p-3">Adresse</th>
                    <th className="text-right p-3">Montant (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/10 hover:bg-accent/10 cursor-pointer transition">
                      <td className="p-3">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3">{r.numero_recu}</td>
                      <td className="p-3">{r.enseigne}</td>
                      <td className="p-3">{r.adresse}</td>
                      <td className="p-3 text-right">{r.montant?.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
