import { useState, useEffect } from "react";
import { MainLayout } from "@/components/Layout/MainLayout";
import { StatCard } from "@/components/Dashboard/StatCard";
import { TeamMemberCard } from "@/components/Dashboard/TeamMemberCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronDown, Receipt, Globe, FileText, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format, startOfDay, endOfDay, differenceInDays, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { DateRange } from "react-day-picker";

const Dashboard = () => {
  // Date filter - default last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  });
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Client filter - null means all clients
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

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

  // Load receipts data with filters
  const { data: receipts = [], isLoading: isLoadingReceipts } = useQuery({
    queryKey: ["receipts-feed", dateRange, selectedClientId],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return [];
      
      let query = (supabase as any)
        .from("recus_feed")
        .select("*")
        .gte("date_traitement", dateRange.from.toISOString())
        .lte("date_traitement", dateRange.to.toISOString());

      if (selectedClientId) {
        query = query.eq("client_id", selectedClientId);
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

  const teamMembers = [
    { name: "Natalie Craig", role: "Owner", receiptsCount: 0, tvaAmount: "0,00 €", initials: "NC" },
    { name: "Mehdi Charmou", role: "Admin", receiptsCount: 0, tvaAmount: "0,00 €", initials: "MC" },
    { name: "Silvy Berger", role: "Viewer", receiptsCount: 0, tvaAmount: "0,00 €", initials: "SB" },
    { name: "Jean-Marc Lubriol", role: "Admin", receiptsCount: 0, tvaAmount: "0,00 €", initials: "JL" },
  ];

  const handleApplyDateRange = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      setDateRange({
        from: startOfDay(tempDateRange.from),
        to: endOfDay(tempDateRange.to),
      });
      setIsDatePickerOpen(false);
    }
  };

  const handleCancelDateRange = () => {
    setTempDateRange(dateRange);
    setIsDatePickerOpen(false);
  };

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) return "Sélectionner une période";
    return `${format(range.from, "dd/MM/yyyy")} - ${format(range.to, "dd/MM/yyyy")}`;
  };

  const chart = chartData();
  const topCats = topCategories();

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {formatDateRange(dateRange)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
                locale={fr}
              />
              <div className="flex items-center justify-between p-3 border-t">
                <Button variant="outline" size="sm" onClick={handleCancelDateRange}>
                  Annuler
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleApplyDateRange}
                  disabled={!tempDateRange?.from || !tempDateRange?.to}
                >
                  Appliquer
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={selectedClientId || "all"} onValueChange={(v) => setSelectedClientId(v === "all" ? null : v)}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Sélectionner un client" />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              {formatDateRange(dateRange)} · Axe X = Période · Axe Y = Montant TTC (€)
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
              <div className="overflow-x-auto">
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
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Suivi de l'activité et la part des reçus traités par chaque membre de votre équipe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <TeamMemberCard key={member.name} {...member} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
