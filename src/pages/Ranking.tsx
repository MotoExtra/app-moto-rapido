import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Star, Package, Clock, ChevronLeft, Gift, Zap } from "lucide-react";
import { useRanking } from "@/hooks/useRanking";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { Skeleton } from "@/components/ui/skeleton";

const Ranking = () => {
  const navigate = useNavigate();
  const { ranking, rewards, isLoading, currentUserPosition } = useRanking();

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

  const getRewardForPosition = (position: number) => {
    return rewards.find(r => r.rank_position === position)?.reward_description;
  };

  const topThree = ranking.slice(0, 3);
  const others = ranking.slice(3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b shadow-sm">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </header>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

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
          
          {currentUserPosition && (
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="text-sm font-medium text-foreground">
                  Sua posição: <span className="text-primary font-bold">#{currentUserPosition}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {ranking.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">Nenhum ranking ainda</h3>
              <p className="text-sm text-muted-foreground">
                Complete extras para aparecer no ranking!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-foreground">Top 3 - Ganhe Prêmios!</h2>
                </div>
                
                <div className="space-y-3">
                  {topThree.map((motoboy) => (
                    <Card key={motoboy.user_id} className={`overflow-hidden border-2 ${getPodiumBg(motoboy.rank_position)}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {getPodiumIcon(motoboy.rank_position)}
                          </div>
                          
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={motoboy.avatar_url || undefined} />
                            <AvatarFallback>{motoboy.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-foreground truncate">
                                {motoboy.name}
                              </h3>
                              <Badge variant="secondary" className="shrink-0">
                                #{motoboy.rank_position}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                              <div className="flex items-center gap-1">
                                <Zap className="w-4 h-4 fill-primary text-primary" />
                                <span className="font-bold text-primary">{Math.round(motoboy.score)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                <span>{motoboy.completed_extras} extras</span>
                              </div>
                              <LevelBadge level={motoboy.current_level} size="sm" />
                            </div>
                            
                            {getRewardForPosition(motoboy.rank_position) && (
                              <div className="bg-background/50 backdrop-blur-sm rounded-lg p-2 border">
                                <div className="flex items-center gap-2">
                                  <Gift className="w-4 h-4 text-primary shrink-0" />
                                  <span className="text-xs font-medium text-foreground">
                                    {getRewardForPosition(motoboy.rank_position)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Other Positions */}
            {others.length > 0 && (
              <div>
                <h2 className="font-bold text-foreground mb-3 px-1">Demais Posições</h2>
                <div className="space-y-2">
                  {others.map((motoboy) => (
                    <Card key={motoboy.user_id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="font-bold text-muted-foreground">
                              #{motoboy.rank_position}
                            </span>
                          </div>
                          
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={motoboy.avatar_url || undefined} />
                            <AvatarFallback>{motoboy.name?.charAt(0) || "?"}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate mb-1">
                              {motoboy.name}
                            </h3>
                            
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-primary text-primary" />
                                <span className="font-medium">{Math.round(motoboy.score)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>{motoboy.completed_extras}</span>
                              </div>
                              <LevelBadge level={motoboy.current_level} size="sm" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
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
            <Trophy className="w-5 h-5 mb-1 fill-current" />
            <span className="text-xs">Ranking</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Ranking;
