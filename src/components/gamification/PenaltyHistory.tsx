import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Clock, 
  Ban, 
  ChevronDown, 
  ChevronUp,
  Trophy,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Helper to get untyped client for new tables not yet in types
const getUntypedSupabase = () => supabase as any;

interface PenaltyRecord {
  id: string;
  penalty_type: 'cancellation' | 'delay';
  xp_amount: number;
  reason: string;
  details: {
    minutes_until_start?: number;
    hours_until_start?: number;
    delay_minutes?: number;
  };
  created_at: string;
  offer_id: string | null;
}

interface PenaltyHistoryProps {
  userId: string;
  limit?: number;
}

export function PenaltyHistory({ userId, limit = 20 }: PenaltyHistoryProps) {
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'cancellation' | 'delay'>('all');

  useEffect(() => {
    const fetchPenalties = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getUntypedSupabase()
          .from("penalty_history")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        setPenalties(data || []);
      } catch (error) {
        console.error("Erro ao carregar histórico de penalidades:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPenalties();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`penalties-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'penalty_history',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setPenalties(prev => [payload.new as PenaltyRecord, ...prev].slice(0, limit));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, limit]);

  const filteredPenalties = filter === 'all' 
    ? penalties 
    : penalties.filter(p => p.penalty_type === filter);

  const totalXpLost = penalties.reduce((acc, p) => acc + Math.abs(p.xp_amount), 0);
  const cancellationCount = penalties.filter(p => p.penalty_type === 'cancellation').length;
  const delayCount = penalties.filter(p => p.penalty_type === 'delay').length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // No penalties - show exemplary behavior badge
  if (penalties.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <Trophy className="w-8 h-8 text-green-600" />
            </motion.div>
            <div>
              <h3 className="font-bold text-green-600">Comportamento Exemplar!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Você não possui nenhuma penalidade. Continue assim!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Penalidades
          </CardTitle>
          <Badge variant="destructive" className="font-mono">
            -{totalXpLost} XP
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Ban className="w-4 h-4 text-destructive" />
            <span className="text-sm">
              <span className="font-semibold">{cancellationCount}</span> cancelamento{cancellationCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm">
              <span className="font-semibold">{delayCount}</span> atraso{delayCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
          >
            Todos
          </Button>
          <Button
            variant={filter === 'cancellation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cancellation')}
            className="flex-1"
          >
            Cancelamentos
          </Button>
          <Button
            variant={filter === 'delay' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('delay')}
            className="flex-1"
          >
            Atrasos
          </Button>
        </div>

        {/* Penalty List */}
        <div className="space-y-2">
          <AnimatePresence>
            {(isExpanded ? filteredPenalties : filteredPenalties.slice(0, 3)).map((penalty, index) => (
              <motion.div
                key={penalty.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-lg border ${
                  penalty.penalty_type === 'cancellation'
                    ? 'bg-destructive/5 border-destructive/20'
                    : 'bg-orange-500/5 border-orange-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {penalty.penalty_type === 'cancellation' ? (
                      <Ban className="w-4 h-4 text-destructive mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-orange-500 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{penalty.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(penalty.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {penalty.details?.delay_minutes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Atraso: {penalty.details.delay_minutes} minutos
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`font-mono shrink-0 ${
                      penalty.penalty_type === 'cancellation'
                        ? 'text-destructive border-destructive/50'
                        : 'text-orange-600 border-orange-500/50'
                    }`}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    -{Math.abs(penalty.xp_amount)}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Expand/Collapse Button */}
        {filteredPenalties.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Ver mais ({filteredPenalties.length - 3} restantes)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
