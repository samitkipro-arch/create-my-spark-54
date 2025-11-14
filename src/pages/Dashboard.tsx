import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { DateRangePicker } from "@/components/Dashboard/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText, ShoppingCart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { DateRange } from "react-day-picker";
import { useGlobalFilters } from "@/stores/useGlobalFilters";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Dashboard = () => {
  const { role, loading: roleLoading } = useUserRole();
  const {
    dateRange: storedDateRange,
    clientId: storedClientId,
    memberId: storedMemberId,
    setDateRange: setStoredDateRange,
    setClientId,
    setMemberId,
  } = useGlobalFilters();

  /** ------------------------------------------------------------------------------------------
   *  VIEW CLIENT : RÉSOLVE DIRECTEMENT LE client_id (user_id ⇒ client.id)
   * ------------------------------------------------------------------------------------------ */
  const [clientSelfId, setClientSelfId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (role !== "client") return;

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const { data: cli } = await supabase.from("clients").select("id").eq("user_id", userId).maybeSingle();

      setClientSelfId(cli?.id ?? "__none__");
    };

    if (!roleLoading) load();
  }, [role, roleLoading]);

  /** ------------------------------------------------------------------------------------------
   *  PÉRIODE
   * ------------------------------------------------------------------------------------------ */
  const dateRange = useMemo(() => {
    if (storedDateRange.from && storedDateRange.to) {
      return {
        from: new Date(storedDateRange.from),
        to: new Date(storedDateRange.to),
      };
    }

    // Par défaut : 7 derniers jours
    return {
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    };
  }, [storedDateRange]);

  useEffect(() => {
    if (!storedDateRange.from || !storedDateRange.to) {
      const from = startOfDay(subDays(new Date(), 6));
      const to = endOfDay(new Date());
      setStoredDateRange(from.toISOString(), to.toISOString());
    }
  }, []);

  /** ------------------------------------------------------------------------------------------
   *  FILTRES — uniquement pour CABINET
   * ------------------------------------------------------------------------------------------ */
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name");
      return data || [];
    },
    enabled: role === "cabinet" && !roleLoading,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, first_name, last_name, email");
      return (data || []).map((m: any) => ({
        id: m.user_id,
        name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email,
      }));
    },
    enabled: role === "cabinet" && !roleLoading,
  });

  /** ------------------------------------------------------------------------------------------
   *  REÇUS — MODE CLIENT = filtré sur son propre client_id
   * ------------------------------------------------------------------------------------------ */
  const {
    data: receipts = [],
    isLoading: isLoadingReceipts,
    refetch: refetchReceipts,
  } = useQuery({
    queryKey: ["receipts-dashboard", role, storedClientId, storedMemberId, clientSelfId, dateRange],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];

      let query = supabase
        .from("recus")
        .select("*")
        .gte("date_traitement", dateRange.from.toISOString())
        .lte("date_traitement", dateRange.to.toISOString());

      // MODE CLIENT → seulement ses propres reçus
      if (role === "client") {
        if (!clientSelfId || clientSelfId === "__none__") return [];
        query = query.eq("client_id", clientSelfId);
      }

      // MODE CABINET → applique les filtres
      if (role === "cabinet") {
        if (storedClientId && storedClientId !== "all") query = query.eq("client_id", storedClientId);
        if (storedMemberId && storedMemberId !== "all") query = query.eq("processed_by", storedMemberId);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !roleLoading && !!dateRange && (role !== "client" || clientSelfId !== null),
  });

  useEffect(() => {
    const ch = supabase
      .channel("dashboard-receipts")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => refetchReceipts())
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [refetchReceipts]);

  /** ------------------------------------------------------------------------------------------
   *  KPIs
   * ------------------------------------------------------------------------------------------ */
  const kpis = useMemo(() => {
    const tva = receipts.reduce((s, r) => s + (Number(r.tva) || 0), 0);
    const ht = receipts.reduce((s, r) => s + ((Number(r.montant_ttc) || 0) - (Number(r.tva) || 0)), 0);
    const ttc = receipts.reduce((s, r) => s + (Number(r.montant_ttc) || 0), 0);
    return { count: receipts.length, tva, ht, ttc };
  }, [receipts]);

  /** ------------------------------------------------------------------------------------------
   *  Graphique TVA journalière
   * ------------------------------------------------------------------------------------------ */
  const graphData = useMemo(() => {
    if (!dateRange) return [];
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

    return days.map((day) => {
      const d = format(day, "yyyy-MM-dd");
      const dayReceipts = receipts.filter(
        (r) => format(new Date(r.date_traitement || r.created_at), "yyyy-MM-dd") === d,
      );
      const totalTva = dayReceipts.reduce((s, r) => s + (Number(r.tva) || 0), 0);

      return {
        date: format(day, "dd/MM"),
        fullDate: day,
        tva: totalTva,
        count: dayReceipts.length,
      };
    });
  }, [receipts, dateRange]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

  /** ------------------------------------------------------------------------------------------
   *  RENDER
   * ------------------------------------------------------------------------------------------ */
  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* FILTRES = uniquement CABINET */}
        {role === "cabinet" && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <DateRangePicker value={dateRange} onChange={setStoredDateRange} />

            <Select value={storedClientId} onValueChange={setClientId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tous les clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={storedMemberId ?? "all"} onValueChange={setMemberId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Toute l'équipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute l'équipe</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* KPI principal */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardContent className="p-6">
            <p className="text-sm opacity-90">TVA récupérée totale</p>
            <p className="text-3xl font-bold">{formatCurrency(kpis.tva)}</p>
          </CardContent>
        </Card>

        {/* KPI secondaires */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Reçus traités</p>
              <p className="text-xl font-semibold">{kpis.count}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Montant HT total</p>
              <p className="text-xl font-semibold">{formatCurrency(kpis.ht)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Montant TTC total</p>
              <p className="text-xl font-semibold">{formatCurrency(kpis.ttc)}</p>
            </CardContent>
          </Card>
        </div>

        {/* GRAPHIQUE TVA */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Évolution TVA (par jour)</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingReceipts ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={graphData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="tva" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* CABINET ONLY — TOP CATÉGORIE */}
        {role === "cabinet" && (
          <>
            {/* Top catégories */}
            {/** ... ton ancien bloc Top catégories ... */}

            {/* Performance équipe */}
            {/** ... ton ancien bloc Performance ... */}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
