import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, MapPin, Package, Star, AlertCircle, LogOut, User as UserIcon } from "lucide-react";
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
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profileData, setProfileData] = useState<{ name: string; avatar_url: string } | null>(null);

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

      toast({
        title: "Extra aceito!",
        description: `Você aceitou trabalhar em ${offer.restaurant_name} das ${offer.time_start} às ${offer.time_end}.`,
      });
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
              {/* Score + Avatar Container */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl border shadow-md">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  <span className="text-xl font-bold text-primary">100</span>
                </div>
                
                <button
                  onClick={() => navigate("/perfil")}
                  className="relative group"
                  title="Meu Perfil"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-primary/30 rounded-full blur opacity-60 group-hover:opacity-100 transition-opacity" />
                  <Avatar className="relative w-14 h-14 border-3 border-background ring-2 ring-primary/40 hover:ring-primary transition-all shadow-lg">
                    <AvatarImage src={profileData?.avatar_url} alt={profileData?.name} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                      {profileData?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || <UserIcon className="w-6 h-6" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </div>
              
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

      {/* Offers List */}
      <div className="p-4 space-y-4 pb-20">
        {offers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Nenhum extra disponível no momento.</p>
            </CardContent>
          </Card>
        ) : (
          offers.map((offer) => {
            const timeInfo = getTimeUntilStart(offer.time_start);
            return (
              <Card key={offer.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{offer.restaurant_name}</CardTitle>
                        <Badge className={timeInfo.isUrgent ? "bg-destructive text-destructive-foreground" : "bg-green-600 text-white"}>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          EXTRA
                        </Badge>
                      </div>
                      <CardDescription className="font-medium">
                        {offer.description}
                      </CardDescription>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span className={timeInfo.isUrgent ? "text-destructive font-semibold" : ""}>
                          Começa em {timeInfo.hours}h {timeInfo.minutes}min
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{offer.address}</span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{offer.time_start} até {offer.time_end} • Raio de {offer.radius} km</span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Faz {offer.delivery_range}</span>
                  </div>

                  {offer.needs_bag && (
                    <Badge variant="outline" className="text-xs">
                      Precisa de bag
                    </Badge>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center text-sm">
                      <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{offer.rating}</span>
                      <span className="text-muted-foreground ml-1">({offer.review_count})</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/oferta/${offer.id}`)}
                      >
                        Ver detalhes
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleAccept(offer)}
                      >
                        Aceitar
                      </Button>
                    </div>
                  </div>

                  {offer.experience && (
                    <p className="text-xs text-muted-foreground italic">
                      Obs.: {offer.experience}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex items-center justify-around p-2">
          <Button variant="default" className="flex-col h-auto py-2">
            <Package className="w-5 h-5 mb-1 fill-current" />
            <span className="text-xs">Ofertas</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col h-auto py-2"
            onClick={() => navigate("/extras-aceitos")}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs">Extras Aceitos</span>
          </Button>
          <Button
            variant="ghost"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/ranking")}
          >
            <Star className="w-5 h-5 mb-1" />
            <span className="text-xs">Ranking</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Home;
