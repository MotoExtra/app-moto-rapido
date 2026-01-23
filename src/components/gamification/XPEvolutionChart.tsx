import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface XPEvolutionChartProps {
  userId: string;
}

interface DailyXPData {
  date: string;
  dateLabel: string;
  gains: number;
  losses: number;
  net: number;
  cumulative: number;
}

export function XPEvolutionChart({ userId }: XPEvolutionChartProps) {
  const [history, setHistory] = useState<{ xp_amount: number; created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch XP history for the last 7 days
        const sevenDaysAgo = subDays(new Date(), 6);
        const { data: historyData, error: historyError } = await supabase
          .from("xp_history")
          .select("xp_amount, created_at")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: true });

        if (historyError) throw historyError;

        // Fetch current total XP
        const { data: statsData, error: statsError } = await supabase
          .from("motoboy_stats")
          .select("total_xp")
          .eq("user_id", userId)
          .single();

        if (statsError && statsError.code !== "PGRST116") throw statsError;

        setHistory(historyData || []);
        setTotalXP(statsData?.total_xp || 0);
      } catch (error) {
        console.error("Erro ao carregar dados de evolução:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const chartData = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    
    // Generate all days in the interval
    const days = eachDayOfInterval({ start: sevenDaysAgo, end: today });
    
    // Calculate cumulative XP before the period started
    const totalRecentXP = history.reduce((sum, h) => sum + h.xp_amount, 0);
    let runningCumulative = totalXP - totalRecentXP;
    
    const data: DailyXPData[] = days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      // Filter history for this day
      const dayHistory = history.filter((h) => {
        const recordDate = new Date(h.created_at);
        return recordDate >= dayStart && recordDate < dayEnd;
      });
      
      const gains = dayHistory
        .filter((h) => h.xp_amount > 0)
        .reduce((sum, h) => sum + h.xp_amount, 0);
      const losses = Math.abs(
        dayHistory
          .filter((h) => h.xp_amount < 0)
          .reduce((sum, h) => sum + h.xp_amount, 0)
      );
      const net = gains - losses;
      
      runningCumulative += net;
      
      return {
        date: format(day, "yyyy-MM-dd"),
        dateLabel: format(day, "EEE", { locale: ptBR }).substring(0, 3),
        gains,
        losses,
        net,
        cumulative: runningCumulative,
      };
    });
    
    return data;
  }, [history, totalXP]);

  const weeklyGains = chartData.reduce((sum, d) => sum + d.gains, 0);
  const weeklyLosses = chartData.reduce((sum, d) => sum + d.losses, 0);
  const weeklyNet = weeklyGains - weeklyLosses;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Evolução Semanal
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            <Calendar className="w-3 h-3" />
            7 dias
          </Badge>
        </div>
        <div className="flex gap-3 mt-2">
          <span className="text-xs text-muted-foreground">
            <span className="text-green-600 font-semibold">+{weeklyGains}</span> ganhos
          </span>
          <span className="text-xs text-muted-foreground">
            <span className="text-destructive font-semibold">-{weeklyLosses}</span> perdas
          </span>
          <span className="text-xs text-muted-foreground">
            <span className={`font-semibold ${weeklyNet >= 0 ? "text-primary" : "text-orange-600"}`}>
              {weeklyNet >= 0 ? "+" : ""}{weeklyNet}
            </span> saldo
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGains" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0]?.payload as DailyXPData;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium mb-2 capitalize">
                        {format(new Date(data.date), "EEEE, dd MMM", { locale: ptBR })}
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">XP Total:</span>
                          <span className="font-bold text-primary">{data.cumulative}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Ganhos:</span>
                          <span className="text-green-600">+{data.gains}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Perdas:</span>
                          <span className="text-destructive">-{data.losses}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t">
                          <span className="text-muted-foreground">Saldo:</span>
                          <span className={data.net >= 0 ? "text-primary font-semibold" : "text-orange-600 font-semibold"}>
                            {data.net >= 0 ? "+" : ""}{data.net}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorCumulative)"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
