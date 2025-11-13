import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { DateRangePicker } from "@/components/Dashboard/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DateRange } from "react-day-picker";
import { useGlobalFilters } from "@/stores/useGlobalFilters";
import { useUserRole } from "@/hooks/useUserRole";
import { TvaChart } from "@/components/Dashboard/TvaChart"; // <-- Nouveau composant premium
import { StatCard } from "@/components/Dashboard/StatCard"; // <-- Version premium

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

  /* ----------------------------- ENTREPRISE LOGIC ----------------------------- */
  const [enterpriseClientId, setEnterpriseClientId] = useState<string | null>(null);
  useEffect(() => {
    const resolve = async () => {
      if (role !== "enterprise") return;
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;
      const { data: ent } = await (supabase as any)
        .from("entreprises")
        .select("name")
        .eq("user_id", userId)
        .maybeSingle();
      const companyName = ent?.name?.trim();
      if (!companyName) {
        setEnterpriseClientId("__none__");
        return;
      }
      const { data: cli } = await supabase
        .from("clients")
        .select("id, name")
        .ilike("name", companyName)
        .limit(1)
        .maybeSingle();
      setEnterpriseClientId(cli?.id ?? "__none__");
    };
    if (!roleLoading) resolve();
  }, [role, roleLoading]);

  /* ----------------------------- DATE LOGIC ----------------------------- */
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (storedDateRange.from && storedDateRange.to) {
      return { from: new Date(storedDateRange.from), to: new Date(storedDateRange.to) };
    }
    return { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) };
  }, [storedDateRange]);

  useEffect(() => {
    if (!storedDateRange.from || !storedDateRange.to) {
      const from = startOfDay(subDays(new Date(), 6));
      const to = endOfDay(new Date());
      setStoredDateRange(from.toISOString(), to.toISOString());
    }
  }, []);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setStoredDateRange(startOfDay(range.from).toISOString(), endOfDay(range.to).toISOString());
    }
  };

  /* ----------------------------- CLIENTS ----------------------------- */
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !roleLoading && role !== "enterprise",
  });

  /* ----------------------------- TEAM MEMBERS ----------------------------- */
  const { data: members = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("org_members")
        .select("user_id, first_name, last_name, email")
        .order("first_name");
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.user_id,
        name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email || "Membre sans nom",
      }));
    },
    enabled: !roleLoading && role !== "enterprise",
  });

  /* ----------------------------- RECEIPTS ----------------------------- */
  const {
    data: receipts = [],
    isLoading: isLoadingReceipts,
    refetch: refetchReceipts,
  } = useQuery({
    queryKey: [
      "receipts-dashboard",
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
      storedClientId,
      storedMemberId,
      role,
      enterpriseClientId,
    ],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      let query = (supabase as any)
        .from("recus")
        .select("*")
        .gte("date_traitement", dateRange.from.toISOString())
        .lte("date_traitement", dateRange.to.toISOString());

      if (role === "enterprise") {
        if (!enterpriseClientId || enterpriseClientId === "__none__") return [];
        query = query.eq("client_id", enterpriseClientId);
      } else {
        if (storedClientId && storedClientId !== "all") query = query.eq("client_id", storedClientId);
        if (storedMemberId && storedMemberId !== "all") query = query.eq("processed_by", storedMemberId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled:
      !!dateRange?.from && !!dateRange?.to && !roleLoading && (role !== "enterprise" || enterpriseClientId !== null),
  });

  useEffect(() => {
    refetchReceipts();
  }, [dateRange?.from, dateRange?.to, refetchReceipts]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-receipts")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => refetchReceipts())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchReceipts]);

  /* ----------------------------- KPI ----------------------------- */
  const kpis = useMemo(() => {
    const tva = receipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0);
    const ht = receipts.reduce((sum, r) => sum + ((Number(r.montant_ttc) || 0) - (Number(r.tva) || 0)), 0);
    const ttc = receipts.reduce((sum, r) => sum + (Number(r.montant_ttc) || 0), 0);
    return { count: receipts.length, tva, ht, ttc };
  }, [receipts]);

  /* ----------------------------- DAILY GRAPH DATA ----------------------------- */
  const tvaEvolutionGraphData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayReceipts = receipts.filter((r) => {
        const d = format(new Date(r.date_traitement || r.created_at), "yyyy-MM-dd");
        return d === dayStr;
      });
      const dayTva = dayReceipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0);
      return {
        date: format(day, "dd/MM"),
        fullDate: day,
        tva: dayTva,
        count: dayReceipts.length,
      };
    });
  }, [receipts, dateRange]);

  const daysCount = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 0;

  /* ----------------------------- TOP CATEGORIES ----------------------------- */
  const topCategories = useMemo(() => {
    const map = new Map();
    receipts.forEach((r) => {
      const cat = r.categorie || "Sans catégorie";
      const tva = Number(r.tva) || 0;
      const ttc = Number(r.montant_ttc) || 0;
      if (!map.has(cat)) map.set(cat, { cat, count: 0, ttc: 0, tva: 0 });
      const entry = map.get(cat);
      entry.count += 1;
      entry.ttc += ttc;
      entry.tva += tva;
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [receipts]);

  const teamPerformance = useMemo(() => {
    return members
      .map((m) => {
        const userReceipts = receipts.filter((r) => r.processed_by === m.id);
        const tva = userReceipts.reduce((s, r) => s + (Number(r.tva) || 0), 0);
        return { ...m, tva, count: userReceipts.length };
      })
      .sort((a, b) => b.count - a.count);
  }, [members, receipts]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

  /* ----------------------------- UI PREMIUM ----------------------------- */
  return (
    <MainLayout>
      <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
        {/* 🔷 FILTRES PREMIUM */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

          {role !== "enterprise" && !roleLoading && (
            <>
              <Select value={storedClientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full lg:w-56 bg-card/60 backdrop-blur border-border">
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
                <SelectTrigger className="w-full lg:w-56 bg-card/60 backdrop-blur border-border">
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
            </>
          )}
        </div>

        {/* 🔷 KPI PRINCIPAL */}
        <Card className="bg-gradient-to-r from-blue-600/90 to-blue-700 shadow-2xl rounded-xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100/90">TVA récupérée totale</p>
                <p className="text-4xl font-bold text-white mt-1">{formatCurrency(kpis.tva)}</p>
              </div>
              <div className="flex items-center gap-2 text-blue-100">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold text-sm">+18 %</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🔷 STAT CARDS (3 colonnes) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Reçus traités" value={`${kpis.count}`} icon={Receipt} />
          <StatCard title="Montant HT total" value={formatCurrency(kpis.ht)} icon={FileText} />
          <StatCard title="Montant TTC total" value={formatCurrency(kpis.ttc)} icon={ShoppingCart} />
        </div>

        {/* 🔷 GRAPHIQUE PREMIUM */}
        <Card className="bg-card/60 backdrop-blur border border-border rounded-xl shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Évolution TVA récupérée (par jour)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingReceipts ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <TvaChart data={tvaEvolutionGraphData} daysCount={daysCount} dateRange={dateRange} />
            )}
          </CardContent>
        </Card>

        {/* 🔷 TOP 5 CATÉGORIES */}
        {role !== "enterprise" && topCategories.length > 0 && (
          <Card className="bg-card/60 backdrop-blur border border-border rounded-xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top 5 catégories (TVA récupérée)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Reçus</TableHead>
                    <TableHead className="text-right">TTC</TableHead>
                    <TableHead className="text-right">TVA récup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCategories.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.cat}</TableCell>
                      <TableCell className="text-right">{c.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.ttc)}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-500">{formatCurrency(c.tva)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* 🔷 PERFORMANCE ÉQUIPE */}
        {role !== "enterprise" && teamPerformance.length > 0 && (
          <Card className="bg-card/60 backdrop-blur border border-border rounded-xl shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" />
                Performance équipe (TVA récupérée)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead className="text-right">Reçus</TableHead>
                    <TableHead className="text-right">TVA récup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPerformance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell className="text-right">{m.count}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-500">{formatCurrency(m.tva)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
