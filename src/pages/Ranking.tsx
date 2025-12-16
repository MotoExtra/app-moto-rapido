import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star, Package, Clock, ChevronLeft, Gift } from "lucide-react";

// Mock data - depois vem do backend
const mockRanking = [
  {
    id: 1,
    position: 1,
    name: "Carlos Silva",
    score: 485,
    deliveries: 142,
    rating: 4.9,
    prize: "R$ 500 + Voucher Combustível"
  },
  {
    id: 2,
    position: 2,
    name: "Ana Santos",
    score: 467,
    deliveries: 138,
    rating: 4.8,
    prize: "R$ 300 + Kit Equipamentos"
  },
  {
    id: 3,
    position: 3,
    name: "João Oliveira",
    score: 445,
    deliveries: 129,
    rating: 4.7,
    prize: "R$ 200 + Bag Térmica Premium"
  },
  {
    id: 4,
    position: 4,
    name: "Maria Costa",
    score: 423,
    deliveries: 118,
    rating: 4.6,
  },
  {
    id: 5,
    position: 5,
    name: "Pedro Alves",
    score: 412,
    deliveries: 115,
    rating: 4.6,
  },
  {
    id: 6,
    position: 6,
    name: "Juliana Lima",
    score: 398,
    deliveries: 109,
    rating: 4.5,
  },
  {
    id: 7,
    position: 7,
    name: "Ricardo Souza",
    score: 387,
    deliveries: 105,
    rating: 4.5,
  },
  {
    id: 8,
    position: 8,
    name: "Fernanda Rocha",
    score: 375,
    deliveries: 101,
    rating: 4.4,
  },
];

const Ranking = () => {
  const navigate = useNavigate();

  const getPodiumIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-500" />;
      case 2:
        return <Medal className="w-7 h-7 text-gray-400 fill-gray-400" />;
      case 3:
        return <Award className="w-7 h-7 text-orange-600 fill-orange-600" />;
      default:
        return null;
    }
  };

  const getPodiumBg = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case 2:
        return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20 border-gray-200 dark:border-gray-800";
      case 3:
        return "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800";
      default:
        return "";
    }
  };

  const topThree = mockRanking.slice(0, 3);
  const others = mockRanking.slice(3);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b shadow-sm">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ranking</h1>
              <p className="text-sm text-muted-foreground">Melhores da semana</p>
            </div>
          </div>
        </div>
      </header>

      {/* Top 3 Podium */}
      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Top 3 - Ganhe Prêmios!</h2>
          </div>
          
          <div className="space-y-3">
            {topThree.map((motoboy) => (
              <Card key={motoboy.id} className={`overflow-hidden border-2 ${getPodiumBg(motoboy.position)}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {getPodiumIcon(motoboy.position)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-foreground truncate">
                          {motoboy.name}
                        </h3>
                        <Badge variant="secondary" className="shrink-0">
                          #{motoboy.position}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="font-bold text-primary">{motoboy.score}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{motoboy.deliveries} entregas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span>{motoboy.rating}</span>
                        </div>
                      </div>
                      
                      <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 border">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs font-medium text-foreground">
                            {motoboy.prize}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Other Positions */}
        <div>
          <h2 className="font-bold text-foreground mb-3 px-1">Demais Posições</h2>
          <div className="space-y-2">
            {others.map((motoboy) => (
              <Card key={motoboy.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="font-bold text-muted-foreground">
                        #{motoboy.position}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate mb-1">
                        {motoboy.name}
                      </h3>
                      
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span className="font-medium">{motoboy.score}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>{motoboy.deliveries}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                          <span>{motoboy.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex items-center justify-around p-2">
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/home")}
          >
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Ofertas</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/extras-aceitos")}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs">Meus Turnos</span>
          </Button>
          <Button variant="default" className="flex-col h-auto py-2">
            <Star className="w-5 h-5 mb-1 fill-current" />
            <span className="text-xs">Ranking</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Ranking;
