import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Zap, Package, TrendingUp, Trophy, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/hooks/useGamification";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { XPProgressBar } from "@/components/gamification/XPProgressBar";
import { StreakIndicator } from "@/components/gamification/StreakIndicator";
import { AchievementCard } from "@/components/gamification/AchievementCard";
import { getLevelInfo } from "@/lib/gamification";
import { Skeleton } from "@/components/ui/skeleton";

const Gamification = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login/motoboy");
        return;
      }
      setUserId(user.id);
    };
    checkAuth();
  }, [navigate]);

  const { stats, achievements, unlockedAchievements, isLoading } = useGamification(userId || undefined);

  const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievement_id));

  const filteredAchievements = selectedCategory === "all"
    ? achievements
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedCount = unlockedAchievements.length;
  const totalCount = achievements.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b shadow-sm">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
        </header>
        <div className="p-4 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const levelInfo = getLevelInfo(stats?.current_level || 1);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gamificação</h1>
              <p className="text-sm text-muted-foreground">Seu progresso e conquistas</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats Overview */}
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <LevelBadge level={stats?.current_level || 1} size="lg" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{levelInfo.name}</h2>
                <p className="text-sm text-muted-foreground">Nível {stats?.current_level || 1}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary">
                  <Zap className="w-5 h-5 fill-primary" />
                  <span className="text-2xl font-bold">{stats?.total_xp || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">XP Total</p>
              </div>
            </div>

            <XPProgressBar
              totalXp={stats?.total_xp || 0}
              currentLevel={stats?.current_level || 1}
              size="lg"
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <StreakIndicator streak={stats?.current_streak || 0} size="lg" showLabel={false} />
              <p className="text-xs text-muted-foreground mt-1">Streak</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-foreground">
                <Package className="w-5 h-5" />
                <span className="text-xl font-bold">{stats?.completed_extras || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Extras</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-foreground">
                <TrendingUp className="w-5 h-5" />
                <span className="text-xl font-bold">{stats?.best_streak || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Melhor Streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Conquistas
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {unlockedCount}/{totalCount}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
                <TabsTrigger value="quality" className="flex-1">Qualidade</TabsTrigger>
                <TabsTrigger value="consistency" className="flex-1">Consistência</TabsTrigger>
                <TabsTrigger value="special" className="flex-1">Especial</TabsTrigger>
              </TabsList>

              <div className="space-y-3">
                {filteredAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.id}
                    code={achievement.code}
                    name={achievement.name}
                    description={achievement.description}
                    icon={achievement.icon}
                    category={achievement.category}
                    xpReward={achievement.xp_reward}
                    isUnlocked={unlockedIds.has(achievement.id)}
                    unlockedAt={unlockedAchievements.find(ua => ua.achievement_id === achievement.id)?.unlocked_at}
                  />
                ))}
              </div>
            </Tabs>
          </CardContent>
        </Card>
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
            <span className="text-xs">Gamificação</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Gamification;
