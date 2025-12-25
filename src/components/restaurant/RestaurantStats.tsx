import { Card, CardContent } from "@/components/ui/card";
import { Clock, Bike, CheckCircle, Users } from "lucide-react";

interface RestaurantStatsProps {
  availableCount: number;
  inProgressCount: number;
  historyCount: number;
  uniqueMotoboys?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const RestaurantStats = ({ 
  availableCount, 
  inProgressCount, 
  historyCount,
  uniqueMotoboys = 0,
  activeTab,
  onTabChange
}: RestaurantStatsProps) => {
  const handleTabClick = (tab: string) => {
    onTabChange?.(tab);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Main Stats - Clickable Buttons */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <button
            onClick={() => handleTabClick("available")}
            className={`p-3 rounded-xl transition-all ${
              activeTab === "available"
                ? "bg-amber-500/20 border-2 border-amber-500 shadow-md"
                : "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15"
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{availableCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Disponíveis</p>
          </button>
          
          <button
            onClick={() => handleTabClick("in_progress")}
            className={`p-3 rounded-xl transition-all ${
              activeTab === "in_progress"
                ? "bg-emerald-500/20 border-2 border-emerald-500 shadow-md"
                : "bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15"
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Bike className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{inProgressCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Em Andamento</p>
          </button>
          
          <button
            onClick={() => handleTabClick("history")}
            className={`p-3 rounded-xl transition-all ${
              activeTab === "history"
                ? "bg-muted border-2 border-muted-foreground/30 shadow-md"
                : "bg-muted/50 border border-border hover:bg-muted/70"
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{historyCount}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Finalizados</p>
          </button>
        </div>

        {/* Secondary Stats - Only Motoboys count */}
        <div className="flex items-center justify-center mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{uniqueMotoboys}</p>
              <p className="text-[10px] text-muted-foreground">Motoboys trabalharam com você</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
