import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Zap, 
  Star, 
  Package, 
  Ban, 
  Clock, 
  Trophy,
  TrendingUp,
  TrendingDown,
  Flame,
  Award,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface XPHistoryRecord {
  id: string;
  user_id: string;
  xp_amount: number;
  event_type: string;
  description: string;
  offer_id: string | null;
  metadata: {
    restaurant_name?: string;
    rating?: number;
    is_peak?: boolean;
    multiplier?: number;
    delay_minutes?: number;
    minutes_until_start?: number;
    hours_until_start?: number;
    milestone_days?: number;
    current_streak?: number;
  };
  created_at: string;
}

interface XPHistoryTimelineProps {
  userId: string;
}

const PAGE_SIZE = 5;

const getEventIcon = (eventType: string, xpAmount: number) => {
  switch (eventType) {
    case "completion":
    case "peak_completion":
      return <Package className="w-4 h-4" />;
    case "rating_5":
    case "rating_4":
      return <Star className="w-4 h-4 fill-current" />;
    case "rating_bad":
      return <Star className="w-4 h-4" />;
    case "cancellation":
      return <Ban className="w-4 h-4" />;
    case "delay":
      return <Clock className="w-4 h-4" />;
    case "streak":
    case "streak_bonus":
      return <Flame className="w-4 h-4 fill-current" />;
    case "achievement":
      return <Award className="w-4 h-4" />;
    default:
      return xpAmount > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  }
};

const getEventStyles = (xpAmount: number) => {
  if (xpAmount > 0) {
    return {
      cardClass: "bg-green-500/5 border-green-500/20",
      iconBgClass: "bg-green-500/20",
      iconColorClass: "text-green-600",
      badgeClass: "bg-green-500/20 text-green-700 border-green-500/30",
    };
  } else {
    return {
      cardClass: "bg-destructive/5 border-destructive/20",
      iconBgClass: "bg-destructive/20",
      iconColorClass: "text-destructive",
      badgeClass: "bg-destructive/20 text-destructive border-destructive/30",
    };
  }
};

export function XPHistoryTimeline({ userId }: XPHistoryTimelineProps) {
  const [history, setHistory] = useState<XPHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<"all" | "gains" | "losses">("all");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const historyResult = await supabase
            .from("xp_history")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(PAGE_SIZE);

        if (historyResult.error) throw historyResult.error;
        const data = (historyResult.data as XPHistoryRecord[]) || [];
        setHistory(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch (error) {
        console.error("Erro ao carregar histórico de XP:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`xp-history-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "xp_history",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const newRecord = payload.new as XPHistoryRecord;
            setHistory((prev) => [newRecord, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || history.length === 0) return;
    setIsLoadingMore(true);
    try {
      const lastItem = history[history.length - 1];
      const { data, error } = await supabase
        .from("xp_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .lt("created_at", lastItem.created_at)
        .limit(PAGE_SIZE);

      if (error) throw error;
      const newRecords = (data as XPHistoryRecord[]) || [];
      setHistory((prev) => [...prev, ...newRecords]);
      setHasMore(newRecords.length === PAGE_SIZE);
    } catch (error) {
      console.error("Erro ao carregar mais histórico:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, history, isLoadingMore, hasMore]);

  const filteredHistory =
    filter === "all"
      ? history
      : filter === "gains"
      ? history.filter((h) => h.xp_amount > 0)
      : history.filter((h) => h.xp_amount < 0);


  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
            >
              <Trophy className="w-8 h-8 text-primary" />
            </motion.div>
            <div>
              <h3 className="font-bold text-primary">Comece sua jornada!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Complete extras para ganhar XP e subir de nível.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Histórico de XP
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="flex-1"
          >
            Todos
          </Button>
          <Button
            variant={filter === "gains" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("gains")}
            className="flex-1 text-green-700 hover:text-green-800"
          >
            Ganhos
          </Button>
          <Button
            variant={filter === "losses" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("losses")}
            className="flex-1 text-destructive hover:text-destructive"
          >
            Perdas
          </Button>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-3">
            <AnimatePresence>
              {filteredHistory.map((record, index) => {
                const styles = getEventStyles(record.xp_amount);
                const Icon = () => getEventIcon(record.event_type, record.xp_amount);

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: Math.min(index, 5) * 0.05 }}
                    className="relative pl-10"
                  >
                    <div
                      className={`absolute left-0 w-10 h-10 rounded-full ${styles.iconBgClass} flex items-center justify-center ${styles.iconColorClass} z-10`}
                    >
                      <Icon />
                    </div>

                    <div
                      className={`p-3 rounded-lg border ${styles.cardClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {record.description}
                          </p>
                          {record.metadata?.restaurant_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {record.metadata.restaurant_name}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(record.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`font-mono shrink-0 ${styles.badgeClass}`}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          {record.xp_amount > 0 ? "+" : ""}
                          {record.xp_amount}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Load More Button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Carregando...
              </>
            ) : (
              "Carregar mais antigos"
            )}
          </Button>
        )}

        {!hasMore && history.length > PAGE_SIZE && (
          <p className="text-xs text-center text-muted-foreground">
            Todos os {history.length} eventos carregados
          </p>
        )}
      </CardContent>
    </Card>
  );
}
