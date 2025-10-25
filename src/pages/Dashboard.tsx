import { useEffect, useMemo } from "react";
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
import { subDays, format, startOfDay, endOfDay, differenceInDays, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DateRange } from "react-day-picker";
import { useGlobalFilters } from "@/stores/useGlobalFilters";

const Dashboard = () => {
  // Global filters store
  const { dateRange: storedDateRange, clientId: storedClientId, memberId: storedMemberId, setDateRange: setStoredDateRange, setClientId, setMemberId } = useGlobalFilters();

  // Convert stored date range to DateRange format
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (storedDateRange.from && storedDateRange.to) {
      return {
        from: new Date(storedDateRange.from),
        to: new Date(storedDateRange.to),
      };
    }
    // Default: last 30 days
    return {
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    };
  }, [storedDateRange]);

  // Initialize default date range on mount if not set
  useEffect(() => {
    if (!storedDateRange.from || !storedDateRange.to) {
      const from = startOfDay(subDays(new Date(), 29));
      const to = endOfDay(new Date());
      setStoredDateRange(from.toISOString(), to.toISOString());
    }
  }, []);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setStoredDateRange(
        startOfDay(range.from).toISOString(),
        endOfDay(range.to).toISOString()
      );
    }
  };

  // Load clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Load members from org_members + profiles for filter
  const { data: members = [] } = useQuery({
    queryKey: ["org-members-with-profiles"],
    queryFn: async () => {
      const { data: orgMembers, error: omError } = await (supabase as any)
        .from("org_members")
        .select("user_id")
        .eq("is_active", true);
      
      if (omError) throw omError;
      if (!orgMembers || orgMembers.length === 0) return [];
      
      const userIds = orgMembers.map((om: any) => om.user_id);
      
      const { data: profiles, error: pError } = await (supabase as any)
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds)
        .order("first_name");
      
      if (pError) throw pError;
      
      return (profiles || []).map((p: any) => ({
        id: p.user_id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Membre sans nom',
      })) as any[];
    },
  });

  // Load receipts data with filters
  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["receipts-dashboard", dateRange, storedClientId, storedMemberId],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      
      let query = (supabase as any)
        .from("recus")
        .select("*")
        .gte("date_traitement", dateRange.from.toISOString())
        .lte("date_traitement", dateRange.to.toISOString());

      if (storedClientId && storedClientId !== "all") {
        query = query.eq("client_id", storedClientId);
      }

      if (storedMemberId && storedMemberId !== "all") {
        query = query.eq("processed_by", storedMemberId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  // Load categories for Top categories section
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("id, label")
        .order("label");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Calculate KPIs
  const kpis = {
    count: receipts.length,
    ht: receipts.reduce((sum, r) => sum + (Number(r.montant_ht) || (Number(r.montant_ttc) || 0) - (Number(r.tva) || 0)), 0),
    tva: receipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0),
    ttc: receipts.reduce((sum, r) => sum + (Number(r.montant_ttc) || 0), 0),
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const stats = [
    { title: "Reçus traités", value: isLoadingReceipts ? "..." : kpis.count.toString(), icon: Receipt },
    { title: "Montant HT total", value: isLoadingReceipts ? "..." : formatCurrency(kpis.ht), icon: Globe },
    { title: "TVA récupérable", value: isLoadingReceipts ? "..." : formatCurrency(kpis.tva), icon: FileText },
    { title: "Montant TTC total", value: isLoadingReceipts ? "..." : formatCurrency(kpis.ttc), icon: ShoppingCart },
  ];

  // Prepare chart data - group by day or month depending on date range
  const chartData = () => {
    if (!dateRange?.from || !dateRange?.to || receipts.length === 0) return [];

    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    const groupByDay = daysDiff <= 31;

    if (groupByDay) {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      return days.map(day => {
        const dayReceipts = receipts.filter(r => {
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
      return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthReceipts = receipts.filter(r => {
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

  // Prepare Top categories data
  const topCategories = () => {
    const categoryMap = new Map<string, { 
      label: string; 
      count: number; 
      ttc: number; 
      ht: number; 
      tva: number; 
    }>();

    receipts.forEach(r => {
      if (!r.category_id) return;
      
      const category = categories.find(c => c.id === r.category_id);
      const categoryLabel = category?.label || r.category_label || "Sans catégorie";
      
      const existing = categoryMap.get(r.category_id) || {
        label: categoryLabel,
        count: 0,
        ttc: 0,
        ht: 0,
        tva: 0,
      };

      existing.count += 1;
      existing.ttc += Number(r.montant_ttc) || 0;
      existing.ht += Number(r.montant_ht) || (Number(r.montant_ttc) || 0) - (Number(r.tva) || 0);
      existing.tva += Number(r.tva) || 0;

      categoryMap.set(r.category_id, existing);
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.ttc - a.ttc)
      .slice(0, 10);
  };

  // Calculate team member stats from filtered receipts
  const teamMemberStats = members.map(member => {
    const memberReceipts = receipts.filter(r => r.processed_by === member.id);
    const tvaAmount = memberReceipts.reduce((sum, r) => sum + (Number(r.tva) || 0), 0);
    return {
      name: member.name,
      role: "Membre",
      receiptsCount: memberReceipts.length,
      tvaAmount: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(tvaAmount),
      initials: member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
    };
  });

  const chart = chartData();
  const topCats = topCategories();

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

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

          <Select value={storedMemberId} onValueChange={setMemberId}>
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
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>
              Suivi du nombre de reçus traités et montants sur la période sélectionnée
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {dateRange?.from && dateRange?.to ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}` : "Aucune période sélectionnée"} · Axe X = Période · Axe Y = Montant TTC (€)
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    ticks={chart.length > 0 ? [chart[0].date, chart[chart.length - 1].date] : []}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background/95 backdrop-blur border border-border p-3 rounded-lg shadow-lg">
                            <p className="text-sm font-semibold mb-1">{payload[0].payload.date}</p>
                            <p className="text-sm text-muted-foreground">
                              {payload[0].payload.count} reçus traités
                            </p>
                            <p className="text-sm font-semibold text-primary">
                              {formatCurrency(payload[0].payload.montant_ttc_total)} montant TTC
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="montant_ttc_total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Top catégories</CardTitle>
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
                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {topCats.map((cat, idx) => (
                    <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
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
                
                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold">Catégorie</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Nb reçus</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Montant TTC</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">Montant HT</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold">TVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCats.map((cat, idx) => (
                      <tr key={idx} className="border-b border-border/50">
                        <td className="py-3 px-4 text-sm">{cat.label}</td>
                        <td className="py-3 px-4 text-sm text-right">{cat.count}</td>
                        <td className="py-3 px-4 text-sm text-right font-semibold">{formatCurrency(cat.ttc)}</td>
                        <td className="py-3 px-4 text-sm text-right">{formatCurrency(cat.ht)}</td>
                        <td className="py-3 px-4 text-sm text-right">{formatCurrency(cat.tva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Suivi de l'activité et la part des reçus traités par chaque membre de votre équipe
          </h2>
          {teamMemberStats.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Aucun membre trouvé
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamMemberStats.map((member) => (
                <TeamMemberCard key={member.name} {...member} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
