import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { StatCard } from "@/components/Dashboard/StatCard";
import { TeamMemberCard } from "@/components/Dashboard/TeamMemberCard";
import { DateRangePicker } from "@/components/Dashboard/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Globe, FileText, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  subDays,
  format,
  startOfDay,
  endOfDay,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DateRange } from "react-day-picker";
import { useGlobalFilters } from "@/stores/useGlobalFilters";
import { useUserRole } from "@/hooks/useUserRole";

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

  // -------- Résolution client pour la vue Entreprise --------
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

  // -------- Période --------
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (storedDateRange.from && storedDateRange.to) {
      return { from: new Date(storedDateRange.from), to: new Date(storedDateRange.to) };
    }
    return { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) };
  }, [storedDateRange]);

  useEffect(() => {
    if (!storedDateRange.from || !storedDateRange.to) {
      const from = startOfDay(subDays(new Date(), 29));
      const to = endOfDay(new Date());
      setStoredDateRange(from.toISOString(), to.toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setStoredDateRange(startOfDay(range.from).toISOString(), endOfDay(range.to).toISOString());
    }
  };

  // -------- Filtres (chargés uniquement pour les comptables) --------
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("id, name").order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !roleLoading && role !== "enterprise",
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team-members-for-filter"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("org_members")
        .select("user_id, first_name, last_name, email")
        .order("first_name", { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.user_id as string,
        name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email || "Membre sans nom",
      })) as Array<{ id: string; name: string }>;
    },
    enabled: !roleLoading && role !== "enterprise",
  });

  // -------- Reçus (filtrés correctement en Entreprise) --------
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
      return (data || []) as any[];
    },
    enabled:
      !!dateRange?.from &&
      !!dateRange?.to &&
      !roleLoading &&
      (role !== "enterprise" || (enterpriseClientId !== null && enterpriseClientId !== "")),
  });

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-receipts-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "recus" }, () => {
        refetchReceipts();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchReceipts]);

  // -------- KPIs & dérivés --------
  const kpis = {
    count: receipts.length,
    ht: receipts.reduce(
      (sum, r) => sum + (Number(r.montant_ht) || (Number(r.montant_ttc) || 0) - (Number(r.tva) || 0)),
      0,
    ),
    tva: receipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0),
    ttc: receipts.reduce((sum, r) => sum + (Number(r.montant_ttc) || 0), 0),
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

  const stats = [
    { title: "Reçus traités", value: isLoadingReceipts ? "..." : kpis.count.toString(), icon: Receipt },
    { title: "Montant HT total", value: isLoadingReceipts ? "..." : formatCurrency(kpis.ht), icon: Globe },
    { title: "TVA récupérable", value: isLoadingReceipts ? "..." : formatCurrency(kpis.tva), icon: FileText },
    { title: "Montant TTC total", value: isLoadingReceipts ? "..." : formatCurrency(kpis.ttc), icon: ShoppingCart },
  ];

  const chartData = () => {
    if (!dateRange?.from || !dateRange?.to || receipts.length === 0) return [];
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    const groupByDay = daysDiff <= 31;

    if (groupByDay) {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      return days.map((day) => {
        const dayReceipts = receipts.filter((r) => {
          const receiptDate = new Date(r.date_traitement || r.created_at);
          return format(receiptDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
        });
        return {
          date: format(day, "dd/MM/yyyy", { locale: fr }),
          count: dayReceipts.length,
          montant_ttc_total: dayReceipts.reduce((sum, r) => sum + (Number(r.montant_ttc) || 0), 0),
        };
      });
    } else {
      const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
      return months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthReceipts = receipts.filter((r) => {
          const receiptDate = new Date(r.date_traitement || r.created_at);
          return receiptDate >= monthStart && receiptDate <= monthEnd;
        });
        return {
          date: format(month, "MMM yyyy", { locale: fr }),
          count: monthReceipts.length,
          montant_ttc_total: monthReceipts.reduce((sum, r) => sum + (Number(r.montant_ttc) || 0), 0),
        };
      });
    }
  };

  const topCategories = () => {
    const categoryMap = new Map<string, { label: string; count: number; ttc: number; ht: number; tva: number }>();
    receipts.forEach((r) => {
      const categoryLabel = r.categorie || "Sans catégorie";
      const existing = categoryMap.get(categoryLabel) || { label: categoryLabel, count: 0, ttc: 0, ht: 0, tva: 0 };
      existing.count += 1;
      existing.ttc += Number(r.montant_ttc) || 0;
      existing.ht += Number(r.montant_ht) || (Number(r.montant_ttc) || 0) - (Number(r.tva) || 0);
      existing.tva += Number(r.tva) || 0;
      categoryMap.set(categoryLabel, existing);
    });
    return Array.from(categoryMap.values())
      .sort((a, b) => b.ttc - a.ttc)
      .slice(0, 10);
  };

  const teamMemberStats = members.map((member) => {
    const memberReceipts = receipts.filter((r) => r.processed_by === member.id);
    const tvaAmount = memberReceipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0);
    return {
      name: member.name,
      role: "Membre",
      receiptsCount: memberReceipts.length,
      tvaAmount: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(tvaAmount),
      initials: member.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    };
  });

  const chart = chartData();
  const topCats = topCategories();

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 transition-all duration-300">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

          {/* Filtres visibles seulement côté Comptable */}
          {!roleLoading && role !== "enterprise" && (
            <>
              <Select value={storedClientId} onValueChange={setClientId}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Tous les clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={storedMemberId ?? "all"} onValueChange={setMemberId}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Tous les membres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les membres</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {stats.map((stat, index) => (
            <div key={stat.title} className="animate-fade-in-scale" style={{ animationDelay: `${index * 0.1}s` }}>
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        <Card
          className="bg-card border-border shadow-[var(--shadow-soft)] animate-fade-in-scale"
          style={{ animationDelay: "0.2s" }}
        >
          <CardHeader>
            <CardTitle className="md:text-lg text-left font-medium text-sm">
              Suivi du nombre de reçus traités et montants TTC sur la période sélectionnée
            </CardTitle>
            <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
              {dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                : "Aucune période sélectionnée"}{" "}
              · Axe X = Période · Axe Y = Montant TTC (€)
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingReceipts ? (
              <Skeleton className="h-64 w-full" />
            ) : chart.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={window.innerWidth < 768 ? 240 : 300}>
                <LineChart
                  data={chart}
                  margin={{ left: window.innerWidth < 768 ? -10 : 0, right: window.innerWidth < 768 ? 10 : 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                    opacity={window.innerWidth < 768 ? 0.15 : 0.3}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: window.innerWidth < 768 ? 8 : 12 }}
                    ticks={chart.length > 0 ? [chart[0].date, chart[chart.length - 1].date] : []}
                    height={window.innerWidth < 768 ? 28 : 40}
                    padding={{ left: window.innerWidth < 768 ? 15 : 0, right: window.innerWidth < 768 ? 15 : 0 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: window.innerWidth < 768 ? 8 : 12 }}
                    domain={[0, "auto"]}
                    width={window.innerWidth < 768 ? 40 : 55}
                  />
                  <Tooltip
                    cursor={{
                      stroke: window.innerWidth < 768 ? "hsl(210 100% 70%)" : "hsl(var(--border))",
                      strokeWidth: 1,
                      strokeDasharray: "3 3",
                    }}
                    animationDuration={window.innerWidth < 768 ? 150 : 300}
                    animationEasing="ease-out"
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card/95 backdrop-blur border border-border p-2.5 md:p-3 rounded-lg shadow-[var(--shadow-soft)] transition-all duration-150">
                            <p className="text-xs md:text-sm font-semibold mb-1.5">{payload[0].payload.date}</p>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              {payload[0].payload.count} reçus traités
                            </p>
                            <p className="text-xs md:text-sm font-semibold text-primary mt-0.5">
                              {formatCurrency(payload[0].payload.montant_ttc_total)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type={window.innerWidth < 768 ? "basis" : "monotone"}
                    dataKey="montant_ttc_total"
                    stroke={window.innerWidth < 768 ? "hsl(210 100% 70%)" : "hsl(217 91% 60%)"}
                    strokeWidth={2.5}
                    dot={{
                      fill: window.innerWidth < 768 ? "hsl(210 100% 70%)" : "hsl(217 91% 60%)",
                      r: window.innerWidth < 768 ? 1.5 : 2,
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: window.innerWidth < 768 ? 5 : 4,
                      fill: window.innerWidth < 768 ? "hsl(210 100% 70%)" : "hsl(217 91% 60%)",
                      stroke: "hsl(var(--card))",
                      strokeWidth: window.innerWidth < 768 ? 2.5 : 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top catégories & activité membres : visibles seulement côté Comptable */}
        {!roleLoading && role !== "enterprise" && (
          <Card
            className="bg-card border-border shadow-[var(--shadow-soft)] animate-fade-in-scale"
            style={{ animationDelay: "0.3s" }}
          >
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Top catégories</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReceipts ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : topCats.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Aucune catégorie trouvée
                </div>
              ) : (
                <div className="space-y-3 md:space-y-0">
                  <div className="md:hidden space-y-3">
                    {topCats.map((cat, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-2 transition-all duration-200 hover:brightness-[1.05] animate-fade-in-up"
                        style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                      >
                        <div className="font-semibold text-sm">{cat.label}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Reçus: </span>
                            <span className="font-medium">{cat.count}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">TTC: </span>
                            <span className="font-semibold">{formatCurrency(cat.ttc)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">HT: </span>
                            <span>{formatCurrency(cat.ht)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground">TVA: </span>
                            <span>{formatCurrency(cat.tva)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3.5 text-sm font-semibold">Catégorie</th>
                          <th className="text-right py-3 px-3.5 text-sm font-semibold">Nb reçus</th>
                          <th className="text-right py-3 px-3.5 text-sm font-semibold">Montant TTC</th>
                          <th className="text-right py-3 px-3.5 text-sm font-semibold">Montant HT</th>
                          <th className="text-right py-3 px-3.5 text-sm font-semibold">TVA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCats.map((cat, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border/50 transition-all duration-200 hover:brightness-[1.05] animate-fade-in-up"
                            style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                          >
                            <td className="py-3 px-3.5 text-sm">{cat.label}</td>
                            <td className="py-3 px-3.5 text-sm text-right">{cat.count}</td>
                            <td className="py-3 px-3.5 text-sm text-right font-semibold">{formatCurrency(cat.ttc)}</td>
                            <td className="py-3 px-3.5 text-sm text-right">{formatCurrency(cat.ht)}</td>
                            <td className="py-3 px-3.5 text-sm text-right">{formatCurrency(cat.tva)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!roleLoading && role !== "enterprise" && (
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="text-base md:text-lg font-semibold">Suivi de l'activité et part des reçus par membre</h2>
            {members.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">Aucun membre trouvé</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {teamMemberStats.map((member, index) => (
                  <div
                    key={member.name}
                    className="animate-fade-in-scale"
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                  >
                    <TeamMemberCard {...member} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
