import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { DateRangePicker } from "@/components/Dashboard/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileText, ShoppingCart, TrendingUp, TrendingDown, Download, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format, startOfDay, endOfDay, eachDayOfInterval, subMonths } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import type { DateRange } from "react-day-picker";
import { useGlobalFilters } from "@/stores/useGlobalFilters";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// === TOOLTIP COMPACT & PRO ===
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload[0]) {
    const data = payload[0].payload;
    const fullDate = format(new Date(data.fullDate), "dd/MM/yyyy");
    const tvaFormatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(data.tva);

    return (
      <div className="bg-gray-900 text-white p-2.5 rounded-md shadow-lg border border-gray-700 text-xs">
        <p className="font-medium text-blue-400">{fullDate}</p>
        <p className="mt-0.5">{data.count} reçus traités</p>
        <p className="font-semibold text-white mt-0.5">TVA récupérée : {tvaFormatted}</p>
      </div>
    );
  }
  return null;
};

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

  // --- Résolution client entreprise ---
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

  // --- Période ---
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

  // --- Filtres ---
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !roleLoading && role !== "enterprise",
  });

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

  // --- Reçus actuels ---
  const {
    data: receipts = [],
    isLoading: isLoadingReceipts,
    refetch: refetchReceipts,
  } = useQuery({
    queryKey: ["receipts-dashboard", dateRange, storedClientId, storedMemberId, role, enterpriseClientId],
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

  // --- Reçus mois précédent (pour comparaison) ---
  const previousMonthRange = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const prevFrom = subMonths(dateRange.from, 1);
    const prevTo = subMonths(dateRange.to, 1);
    return { from: startOfDay(prevFrom), to: endOfDay(prevTo) };
  }, [dateRange]);

  const { data: previousReceipts = [] } = useQuery({
    queryKey: ["receipts-previous", previousMonthRange, storedClientId, storedMemberId, role, enterpriseClientId],
    queryFn: async () => {
      if (!previousMonthRange?.from || !previousMonthRange?.to) return [];
      let query = (supabase as any)
        .from("recus")
        .select("*")
        .gte("date_traitement", previousMonthRange.from.toISOString())
        .lte("date_traitement", previousMonthRange.to.toISOString());
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
    enabled: !!previousMonthRange?.from && !!previousMonthRange?.to && !roleLoading,
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-receipts")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => refetchReceipts())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refetchReceipts]);

  // --- Calculs KPI ---
  const kpis = useMemo(() => {
    const tva = receipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0);
    const ht = receipts.reduce((sum, r) => sum + ((Number(r.montant_ttc) || 0) - (Number(r.tva) || 0)), 0);
    const ttc = receipts.reduce((sum, r) => sum + (Number(r.montant_ttc) || 0), 0);
    return { count: receipts.length, tva, ht, ttc };
  }, [receipts]);

  const previousKpis = useMemo(() => {
    const tva = previousReceipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0);
    return { tva };
  }, [previousReceipts]);

  const tvaGrowth = previousKpis.tva > 0 ? ((kpis.tva - previousKpis.tva) / previousKpis.tva) * 100 : 0;
  const receiptGoal = 48;
  const receiptProgress = Math.round((kpis.count / receiptGoal) * 100);

  // --- Évolution TVA ---
  const tvaEvolutionData = useMemo(() => {
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

  // --- Top 5 catégories ---
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
      .sort((a, b) => b.tva - a.tva)
      .slice(0, 5);
  }, [receipts]);

  // --- Performance équipe (avec comparaison M-1) ---
  const teamPerformance = useMemo(() => {
    return members
      .map((m) => {
        const userReceipts = receipts.filter((r) => r.processed_by === m.id);
        const tva = userReceipts.reduce((s, r) => s + (Number(r.tva) || 0), 0);
        const prevReceipts = previousReceipts.filter((r) => r.processed_by === m.id);
        const prevTva = prevReceipts.reduce((s, r) => s + (Number(r.tva) || 0), 0);
        return { ...m, tva, count: userReceipts.length, prevTva, diff: tva - prevTva };
      })
      .sort((a, b) => b.tva - a.tva);
  }, [members, receipts, previousReceipts]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Filtres + Export */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          {role !== "enterprise" && !roleLoading && (
            <>
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
            </>
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>

        {/* KPI Principal + Croissance */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">TVA récupérée totale</p>
                <p className="text-3xl font-bold">{formatCurrency(kpis.tva)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-75">vs mois précédent</p>
                <p className="text-lg font-bold flex items-center gap-1 justify-end">
                  {tvaGrowth > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {tvaGrowth > 0 ? "+" : ""}
                  {tvaGrowth.toFixed(1)} %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs secondaires */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Reçus traités</p>
                  <p className="text-xl font-semibold">
                    {kpis.count} / {receiptGoal}
                  </p>
                  <Progress value={receiptProgress} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{receiptProgress}% de l'objectif</p>
                </div>
                <Receipt className="w-8 h-8 text-blue-600 opacity-70 ml-4" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Montant HT total</p>
                  <p className="text-xl font-semibold">{formatCurrency(kpis.ht)}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Montant TTC total</p>
                  <p className="text-xl font-semibold">{formatCurrency(kpis.ttc)}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Évolution TVA récupérée (par jour)</CardTitle>
            <Button variant="ghost" size="sm">
              Voir le détail <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingReceipts ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={tvaEvolutionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="tva"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top 5 catégories */}
        {role !== "enterprise" && topCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 5 catégories (TVA récupérée)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer">
                      Catégorie <ChevronDown className="inline w-3 h-3 ml-1" />
                    </TableHead>
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
                      <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(c.tva)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Performance équipe */}
        {role !== "enterprise" && teamPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance équipe (TVA récupérée)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead className="text-right">Reçus</TableHead>
                    <TableHead className="text-right">TVA récup</TableHead>
                    <TableHead className="text-right text-xs text-muted-foreground">vs M-1</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPerformance.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell className="text-right">{m.count}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{formatCurrency(m.tva)}</TableCell>
                      <TableCell className="text-right text-xs">
                        {m.diff > 0 ? (
                          <span className="text-green-400">+{formatCurrency(m.diff)}</span>
                        ) : m.diff < 0 ? (
                          <span className="text-red-400">{formatCurrency(m.diff)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
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
