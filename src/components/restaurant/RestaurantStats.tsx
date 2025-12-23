import { Card, CardContent } from "@/components/ui/card";
import { Clock, Bike, CheckCircle, TrendingUp, Users } from "lucide-react";

interface RestaurantStatsProps {
  availableCount: number;
  inProgressCount: number;
  historyCount: number;
  uniqueMotoboys?: number;
}

export const RestaurantStats = ({ 
  availableCount, 
  inProgressCount, 
  historyCount,
  uniqueMotoboys = 0
}: RestaurantStatsProps) => {
  const totalAccepted = inProgressCount + historyCount;
  const totalCreated = availableCount + totalAccepted;
  const acceptanceRate = totalCreated > 0 ? Math.round((totalAccepted / totalCreated) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Main Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{availableCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Disponíveis</p>
          </div>
          
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bike className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{inProgressCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Em Andamento</p>
          </div>
          
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{historyCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Finalizados</p>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="flex items-center justify-around mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{acceptanceRate}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa aceite</p>
            </div>
          </div>
          
          <div className="w-px h-8 bg-border" />
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{uniqueMotoboys}</p>
              <p className="text-[10px] text-muted-foreground">Motoboys</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
