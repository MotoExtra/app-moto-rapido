import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import InsightCards from "@/components/restaurant/InsightCards";
import SmartSuggestions from "@/components/restaurant/SmartSuggestions";

interface InsightsData {
  restaurant_id: string;
  total_extras_created: number;
  total_accepted: number;
  unique_motoboys: number;
  avg_acceptance_time_minutes: number | null;
  extras_today: number;
  extras_this_week: number;
  extras_this_month: number;
  avg_rating_received: number | null;
  total_ratings_received: number;
  acceptance_rate: number | null;
}

const RestaurantInsights = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInsights = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login/restaurante");
        return;
      }

      // Try to get from materialized view first
      const { data, error } = await supabase
        .from("restaurant_insights" as any)
        .select("*")
        .eq("restaurant_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // If not found in materialized view, calculate on the fly
        const { data: offers } = await supabase
          .from("offers")
          .select("id, is_accepted, created_at")
          .eq("created_by", user.id);

        const { data: acceptedOffers } = await supabase
          .from("accepted_offers")
          .select("user_id, accepted_at, offer_id")
          .in("offer_id", offers?.map(o => o.id) || []);

        const { data: ratings } = await supabase
          .from("ratings")
          .select("rating")
          .eq("restaurant_id", user.id)
          .eq("rating_type", "motoboy_to_restaurant");

        const totalCreated = offers?.length || 0;
        const totalAccepted = offers?.filter(o => o.is_accepted).length || 0;
        const uniqueMotoboys = new Set(acceptedOffers?.map(ao => ao.user_id)).size;
        const avgRating = ratings?.length 
          ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length 
          : null;

        setInsights({
          restaurant_id: user.id,
          total_extras_created: totalCreated,
          total_accepted: totalAccepted,
          unique_motoboys: uniqueMotoboys,
          avg_acceptance_time_minutes: null,
          extras_today: 0,
          extras_this_week: 0,
          extras_this_month: totalCreated,
          avg_rating_received: avgRating ? Math.round(avgRating * 10) / 10 : null,
          total_ratings_received: ratings?.length || 0,
          acceptance_rate: totalCreated > 0 
            ? Math.round((totalAccepted / totalCreated) * 1000) / 10 
            : null,
        });
      } else if (data) {
        setInsights(data as unknown as InsightsData);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os insights.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await supabase.rpc("refresh_restaurant_insights" as any);
      await fetchInsights();
      toast({
        title: "Dados atualizados!",
        description: "Os insights foram recalculados com sucesso.",
      });
    } catch (error) {
      console.error("Error refreshing insights:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b"
      >
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/restaurante/home")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">Insights</h1>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Seu Desempenho
                </h2>
                <p className="text-sm text-muted-foreground">
                  Métricas e insights do seu restaurante
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Insight Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-semibold text-foreground mb-3">Métricas Principais</h3>
          <InsightCards data={insights} loading={loading} />
        </motion.section>

        {/* Smart Suggestions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SmartSuggestions data={insights} />
        </motion.section>

        {/* Footer info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-muted-foreground text-center py-4"
        >
          Os dados são atualizados periodicamente. Clique em "Atualizar" para dados em tempo real.
        </motion.p>
      </main>
    </div>
  );
};

export default RestaurantInsights;
