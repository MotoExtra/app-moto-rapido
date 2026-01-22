import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Clock, 
  Users, 
  Star, 
  Package, 
  CheckCircle,
  Calendar 
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface InsightsData {
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

interface InsightCardsProps {
  data: InsightsData | null;
  loading?: boolean;
}

const InsightCards = ({ data, loading }: InsightCardsProps) => {
  const cards = [
    {
      title: "Taxa de Aceitação",
      value: data?.acceptance_rate ? `${data.acceptance_rate}%` : "0%",
      subtitle: "dos extras são aceitos",
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Tempo Médio de Aceite",
      value: data?.avg_acceptance_time_minutes 
        ? `${Math.round(data.avg_acceptance_time_minutes)} min` 
        : "—",
      subtitle: "para encontrar motoboy",
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Motoboys Parceiros",
      value: data?.unique_motoboys?.toString() || "0",
      subtitle: "já trabalharam com você",
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Avaliação Média",
      value: data?.avg_rating_received 
        ? `${data.avg_rating_received} ★` 
        : "—",
      subtitle: `${data?.total_ratings_received || 0} avaliações`,
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Extras Este Mês",
      value: data?.extras_this_month?.toString() || "0",
      subtitle: "extras criados",
      icon: Calendar,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total de Extras",
      value: data?.total_extras_created?.toString() || "0",
      subtitle: `${data?.total_accepted || 0} aceitos`,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-10 w-10 rounded-xl bg-muted mb-3" />
            <div className="h-6 w-16 bg-muted rounded mb-1" />
            <div className="h-4 w-24 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.subtitle}
              </p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default InsightCards;
