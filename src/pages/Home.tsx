import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, MapPin, Package, Star, AlertCircle, LogOut, User as UserIcon, Plus, Bike } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Offer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  radius: number;
  needs_bag: boolean;
  delivery_range: string;
  experience: string | null;
  rating: number;
  review_count: number;
  is_accepted: boolean;
  offer_type?: string;
  created_by?: string;
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profileData, setProfileData] = useState<{ name: string; avatar_url: string } | null>(null);
  const [hasActiveOffer, setHasActiveOffer] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualiza a cada minuto

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para ver as ofertas.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setUser(user);

      // Fetch profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setProfileData(profile);
      }

      // Check if user already has an active offer
      const { data: activeOffers } = await supabase
        .from("accepted_offers")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending");

      setHasActiveOffer((activeOffers?.length ?? 0) > 0);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/login");
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [toast, navigate]);

  useEffect(() => {
    fetchOffers();

    // Setup realtime subscription
    const channel = supabase
      .channel('offers-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers',
        },
        (payload) => {
          console.log('Offer updated:', payload);
          // Remove offer from list if it was accepted
          if (payload.new.is_accepted) {
            setOffers((current) => current.filter((o) => o.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_accepted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOffers(data || []);
    } catch (error) {
      console.error("Erro ao buscar ofertas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as ofertas.",
        variant: "destructive",
      });
    }
  };

  const getTimeUntilStart = (timeStart: string) => {
    const now = new Date();
    const [hours, minutes] = timeStart.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);

    // Se o horário já passou hoje, considera para amanhã
    if (startTime < now) {
      startTime.setDate(startTime.getDate() + 1);
    }

    const diffMs = startTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return {
      hours: Math.floor(diffHours),
      minutes: Math.floor((diffHours % 1) * 60),
      isUrgent: diffHours < 2
    };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/login");
  };

  const handleAccept = async (offer: Offer) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para aceitar ofertas.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (hasActiveOffer) {
      toast({
        title: "Limite atingido",
        description: "Você já possui um extra aceito. Finalize ou cancele antes de aceitar outro.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update offer as accepted
      const { error: updateError } = await supabase
        .from("offers")
        .update({ is_accepted: true, accepted_by: user.id })
        .eq("id", offer.id);

      if (updateError) throw updateError;

      // Create accepted_offers record
      const { error: insertError } = await supabase
        .from("accepted_offers")
        .insert({
          user_id: user.id,
          offer_id: offer.id,
          status: "pending",
        });

      if (insertError) throw insertError;

      // Remove from local state immediately
      setOffers((current) => current.filter((o) => o.id !== offer.id));
      setHasActiveOffer(true);

      toast({
        title: "Extra aceito!",
        description: `Você aceitou trabalhar em ${offer.restaurant_name} das ${offer.time_start} às ${offer.time_end}.`,
      });

      navigate("/extras-aceitos");
    } catch (error) {
      console.error("Erro ao aceitar extra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar o extra. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-b from-primary/15 via-primary/5 to-background border-b shadow-lg">
        <div className="px-4 py-5">
          <div className="flex items-center justify-between">
            <img src={logo} alt="MotoPay" className="h-16 w-auto drop-shadow-md" />
            
            <div className="flex items-center gap-4">
              {/* Avatar + Score Container */}
              <button
                onClick={() => navigate("/perfil")}
                className="relative group flex flex-col items-center gap-1.5"
                title="Meu Perfil"
              >
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/30 rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="relative w-14 h-14 border-3 border-background ring-2 ring-primary/40 group-hover:ring-primary transition-all shadow-lg">
                    <AvatarImage src={profileData?.avatar_url} alt={profileData?.name} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                      {profileData?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || <UserIcon className="w-6 h-6" />}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full border shadow-sm">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  <span className="text-sm font-bold text-primary">100</span>
                </div>
              </button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                title="Sair"
                className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Offer Extra Button */}
      <div className="px-4 pt-4">
        <Button
          onClick={() => navigate("/ofertar-extra")}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent text-accent-foreground shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 transition-all flex items-center justify-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-lg font-semibold">Ofertar Extra para Motoboys</span>
        </Button>
      </div>

      {/* Offers List */}
      <div className="p-4 space-y-4 pb-20">
        {offers.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="pt-8 pb-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">Nenhum extra disponível no momento.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Novos extras aparecerão aqui</p>
            </CardContent>
          </Card>
        ) : (
          offers.map((offer) => {
            const timeInfo = getTimeUntilStart(offer.time_start);
            const isMotoboyOffer = offer.offer_type === "motoboy";
            return (
              <Card 
                key={offer.id} 
                className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card via-card to-muted/20"
              >
                {/* Top accent bar */}
                <div className={`h-1.5 ${timeInfo.isUrgent ? 'bg-gradient-to-r from-destructive via-destructive/80 to-destructive' : 'bg-gradient-to-r from-primary via-primary/80 to-green-500'}`} />
                
                <CardHeader className="pb-3 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <CardTitle className="text-lg font-bold">{offer.restaurant_name}</CardTitle>
                        {isMotoboyOffer && (
                          <Badge 
                            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-600/30 font-semibold"
                          >
                            <Bike className="w-3 h-3 mr-1" />
                            MOTOBOY
                          </Badge>
                        )}
                        <Badge 
                          className={`${timeInfo.isUrgent 
                            ? "bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-sm shadow-destructive/30" 
                            : "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-sm shadow-green-600/30"
                          } font-semibold`}
                        >
                          <AlertCircle className="w-3 h-3 mr-1" />
                          EXTRA
                        </Badge>
                      </div>
                      <CardDescription className="font-medium text-foreground/70">
                        {offer.description}
                      </CardDescription>
                      <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${
                        timeInfo.isUrgent 
                          ? "bg-destructive/10 text-destructive" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Começa em {timeInfo.hours}h {timeInfo.minutes}min</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              
                <CardContent className="space-y-3 pb-4">
                  <div className="space-y-2.5 p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center text-sm text-foreground/80">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <span>{offer.address}</span>
                    </div>

                    <div className="flex items-center text-sm text-foreground/80">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <span>{offer.time_start} até {offer.time_end} • Raio de {offer.radius} km</span>
                    </div>

                    <div className="flex items-center text-sm text-foreground/80">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <span>Faz {offer.delivery_range}</span>
                    </div>
                  </div>

                  {offer.needs_bag && (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                      🎒 Precisa de bag
                    </Badge>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span className="font-bold text-amber-600">{offer.rating}</span>
                      <span className="text-muted-foreground text-sm">({offer.review_count})</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/oferta/${offer.id}`)}
                        className="rounded-xl hover:bg-muted/50"
                      >
                        Ver detalhes
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleAccept(offer)}
                        className="rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all"
                      >
                        Aceitar
                      </Button>
                    </div>
                  </div>

                  {offer.experience && (
                    <p className="text-xs text-muted-foreground italic bg-muted/30 px-3 py-2 rounded-lg">
                      💡 Obs.: {offer.experience}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-4 py-3 max-w-md mx-auto">
          {/* Ofertas - Active */}
          <button className="relative flex flex-col items-center gap-1 px-4 py-1 group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary">Ofertas</span>
          </button>
          
          {/* Extras Aceitos */}
          <button 
            onClick={() => navigate("/extras-aceitos")}
            className="relative flex flex-col items-center gap-1 px-4 py-1 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
              <Clock className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Aceitos</span>
          </button>
          
          {/* Ranking */}
          <button
            onClick={() => navigate("/ranking")}
            className="relative flex flex-col items-center gap-1 px-4 py-1 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
              <Star className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Ranking</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Home;
