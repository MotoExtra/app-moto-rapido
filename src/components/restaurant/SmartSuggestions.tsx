import { motion } from "framer-motion";
import { Lightbulb, TrendingUp, Clock, Utensils, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

interface InsightsData {
  total_extras_created: number;
  total_accepted: number;
  unique_motoboys: number;
  avg_acceptance_time_minutes: number | null;
  acceptance_rate: number | null;
  avg_rating_received: number | null;
}

interface SmartSuggestionsProps {
  data: InsightsData | null;
}

interface Suggestion {
  icon: React.ElementType;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

const SmartSuggestions = ({ data }: SmartSuggestionsProps) => {
  const generateSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    if (!data) return suggestions;

    // Low acceptance rate suggestion
    if (data.acceptance_rate !== null && data.acceptance_rate < 50) {
      suggestions.push({
        icon: TrendingUp,
        title: "Melhore sua taxa de aceitação",
        description: "Tente oferecer valores mais competitivos ou incluir refeição para atrair mais motoboys.",
        priority: "high",
      });
    }

    // Slow acceptance time
    if (data.avg_acceptance_time_minutes !== null && data.avg_acceptance_time_minutes > 30) {
      suggestions.push({
        icon: Clock,
        title: "Crie extras com antecedência",
        description: "Extras criados com mais antecedência têm 40% mais chance de serem aceitos.",
        priority: "medium",
      });
    }

    // Low rating
    if (data.avg_rating_received !== null && data.avg_rating_received < 4) {
      suggestions.push({
        icon: Lightbulb,
        title: "Melhore sua avaliação",
        description: "Tenha os pedidos prontos no horário e ofereça um bom tratamento aos motoboys.",
        priority: "high",
      });
    }

    // Few motoboys
    if (data.unique_motoboys < 5) {
      suggestions.push({
        icon: Zap,
        title: "Atraia mais motoboys",
        description: "Ative extras recorrentes para criar uma base fiel de entregadores.",
        priority: "medium",
      });
    }

    // Include meal suggestion (general)
    if (data.total_extras_created > 0) {
      suggestions.push({
        icon: Utensils,
        title: "Ofereça refeição inclusa",
        description: "Extras com refeição inclusa têm 60% mais aceitação, especialmente no almoço.",
        priority: "low",
      });
    }

    // Peak hours suggestion
    suggestions.push({
      icon: TrendingUp,
      title: "Aproveite os horários de pico",
      description: "11h-14h e 18h-21h são os melhores horários para encontrar motoboys disponíveis.",
      priority: "low",
    });

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) {
    return null;
  }

  const priorityColors = {
    high: "border-l-red-500 bg-red-50/50 dark:bg-red-900/10",
    medium: "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10",
    low: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">Sugestões Inteligentes</h3>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <motion.div
              key={suggestion.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`p-4 border-l-4 ${priorityColors[suggestion.priority]}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-foreground">
                      {suggestion.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SmartSuggestions;
