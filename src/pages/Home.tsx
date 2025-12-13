import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Clock, MapPin, Package, Star, AlertCircle, LogOut, User as UserIcon, Plus, Bike, Pencil, Trash2, Menu, Trophy, CheckCircle, Bell, CalendarDays, Download, X, ChevronRight } from "lucide-react";
import { RestaurantRatingsModal } from "@/components/RestaurantRatingsModal";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { formatPayment } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface Offer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  offer_date?: string;
  time_start: string;
  time_end: string;
  radius: number;
  needs_bag: boolean;
  can_become_permanent?: boolean;
  includes_meal?: boolean;
  delivery_range: string;
  delivery_quantity?: string | null;
  experience: string | null;
  observations: string | null;
  payment?: string | null;
  rating: number;
  review_count: number;
  is_accepted: boolean;
  offer_type?: string;
  created_by?: string;
  restaurant_rating?: number;
  restaurant_review_count?: number;
}

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const { playSuccess, playNewOffer, playError } = useNotificationSound();
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profileData, setProfileData] = useState<{ name: string; avatar_url: string } | null>(null);
  const [hasActiveOffer, setHasActiveOffer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationPromptShown, setNotificationPromptShown] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [ratingsModalOpen, setRatingsModalOpen] = useState(false);
  const [selectedRestaurantForRatings, setSelectedRestaurantForRatings] = useState<{ id: string; name: string } | null>(null);

  // Check if app is installed as PWA
  useEffect(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInstalled);
    
    // Show install banner if not installed and not dismissed recently
    const dismissed = localStorage.getItem('installBannerDismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    if (!isInstalled && (!dismissed || dismissedTime < oneDayAgo)) {
      setShowInstallBanner(true);
    }
  }, []);

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

  // Solicita permissão de notificações após login
  useEffect(() => {
    if (user && isSupported && !isSubscribed && permission === "default" && !notificationPromptShown) {
      setNotificationPromptShown(true);
      // Pequeno delay para não atrapalhar o carregamento
      const timer = setTimeout(() => {
        subscribe();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isSupported, isSubscribed, permission, subscribe, notificationPromptShown]);

  useEffect(() => {
    fetchOffers();

    // Setup realtime subscription
    const channel = supabase
      .channel('offers-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'offers',
        },
        (payload) => {
          console.log('New offer inserted:', payload);
          // Play sound for new offer
          playNewOffer();
          // Refresh offers list
          fetchOffers();
        }
      )
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

      if (data && data.length > 0) {
        // Fetch restaurant ratings from motoboys
        const creatorIds = [...new Set(data.filter(o => o.created_by).map(o => o.created_by))];
        
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("restaurant_id, rating")
          .eq("rating_type", "motoboy_to_restaurant")
          .in("restaurant_id", creatorIds);

        // Calculate average ratings per restaurant
        const ratingsByRestaurant = new Map<string, { total: number; count: number }>();
        ratingsData?.forEach(r => {
          const existing = ratingsByRestaurant.get(r.restaurant_id) || { total: 0, count: 0 };
          ratingsByRestaurant.set(r.restaurant_id, {
            total: existing.total + r.rating,
            count: existing.count + 1
          });
        });

        const enrichedOffers = data.map(offer => {
          const restaurantRating = offer.created_by ? ratingsByRestaurant.get(offer.created_by) : null;
          return {
            ...offer,
            restaurant_rating: restaurantRating ? Math.round((restaurantRating.total / restaurantRating.count) * 10) / 10 : undefined,
            restaurant_review_count: restaurantRating?.count || 0
          };
        });

        setOffers(enrichedOffers);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error("Erro ao buscar ofertas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as ofertas.",
        variant: "destructive",
      });
    }
  };

  const getTimeUntilStart = (timeStart: string, offerDate?: string) => {
    const now = new Date();
    const [hours, minutes] = timeStart.split(':').map(Number);
    
    let startTime: Date;
    if (offerDate) {
      startTime = parseISO(offerDate);
      startTime.setHours(hours, minutes, 0, 0);
    } else {
      startTime = new Date();
      startTime.setHours(hours, minutes, 0, 0);
      if (startTime < now) {
        startTime.setDate(startTime.getDate() + 1);
      }
    }

    const diffMs = startTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return {
      hours: Math.floor(diffHours),
      minutes: Math.floor((diffHours % 1) * 60),
      isUrgent: diffHours < 2
    };
  };

  const formatOfferDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM (EEEE)", { locale: ptBR });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/login");
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este extra?")) return;

    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;

      setOffers((current) => current.filter((o) => o.id !== offerId));

      toast({
        title: "Extra excluído",
        description: "O extra foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao excluir extra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o extra.",
        variant: "destructive",
      });
    }
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

      // Play success sound
      playSuccess();

      toast({
        title: "Extra aceito!",
        description: `Você aceitou trabalhar em ${offer.restaurant_name} das ${offer.time_start} às ${offer.time_end}.`,
      });

      // Notify the offer creator via push notification (don't wait for it)
      if (offer.created_by && offer.created_by !== user.id) {
        supabase.functions.invoke("notify-offer-accepted", {
          body: {
            offer_id: offer.id,
            acceptor_name: profileData?.name || "Um motoboy",
          },
        }).then((result) => {
          console.log("Notification sent to creator:", result);
        }).catch((err) => {
          console.error("Error sending notification to creator:", err);
        });
      }

      navigate("/extras-aceitos");
    } catch (error) {
      console.error("Erro ao aceitar extra:", error);
      playError();
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
            
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              {isSupported && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={subscribe}
                  className={`rounded-xl shadow-sm hover:shadow-md transition-shadow ${isSubscribed ? 'bg-primary/10 border-primary/30' : ''}`}
                  title={isSubscribed ? "Notificações ativadas" : "Ativar notificações"}
                >
                  <Bell className={`w-5 h-5 ${isSubscribed ? 'text-primary fill-primary/20' : ''}`} />
                </Button>
              )}
              
              {/* Avatar + Score */}
              <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full border shadow-sm">
                <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                <span className="text-sm font-bold text-primary">100</span>
              </div>
              
              {/* Menu Drawer */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader className="text-left pb-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-14 h-14 border-2 border-primary/30">
                        <AvatarImage src={profileData?.avatar_url} alt={profileData?.name} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {profileData?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || <UserIcon className="w-6 h-6" />}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle className="text-lg">{profileData?.name || "Motoboy"}</SheetTitle>
                        <p className="text-sm text-muted-foreground">Bem-vindo de volta!</p>
                      </div>
                    </div>
                  </SheetHeader>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/perfil"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Meu Perfil</p>
                        <p className="text-xs text-muted-foreground">Editar dados pessoais</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/extras-aceitos"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Extras Aceitos</p>
                        <p className="text-xs text-muted-foreground">Ver seus turnos confirmados</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/ranking"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">Ranking</p>
                        <p className="text-xs text-muted-foreground">Veja sua posição</p>
                      </div>
                    </button>
                  </div>
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <Button
                      variant="outline"
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair da conta
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* PWA Install Banner */}
      {showInstallBanner && !isStandalone && (
        <div className="mx-4 mt-4 relative">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20 overflow-hidden">
            <button
              onClick={() => {
                setShowInstallBanner(false);
                localStorage.setItem('installBannerDismissed', Date.now().toString());
              }}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">Instale o MotoPay</p>
                <p className="text-xs text-muted-foreground">Acesso rápido e notificações de novos extras!</p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/install")}
                className="flex-shrink-0 rounded-xl"
              >
                Instalar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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
            const timeInfo = getTimeUntilStart(offer.time_start, offer.offer_date);
            const offerDateLabel = formatOfferDate(offer.offer_date);
            const isMotoboyOffer = offer.offer_type === "motoboy";
            const isOwnOffer = offer.created_by === user?.id;
            return (
              <Card 
                key={offer.id} 
                className={`overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card via-card to-muted/20 ${isOwnOffer ? 'ring-2 ring-blue-500/30' : ''}`}
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

                    {offerDateLabel && (
                      <div className="flex items-center text-sm text-foreground/80">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                          <CalendarDays className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{offerDateLabel}</span>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-foreground/80">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                        <Clock className="w-4 h-4 text-primary" />
                      </div>
                      <span>{offer.time_start} até {offer.time_end}</span>
                    </div>

                    <div className="flex items-center text-sm text-foreground/80">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <span>Raio: {offer.delivery_range}</span>
                    </div>

                    {offer.delivery_quantity && (
                      <div className="flex items-center text-sm text-foreground/80">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <span>Entregas: {offer.delivery_quantity}</span>
                      </div>
                    )}
                  </div>

                  {/* Pagamento */}
                  {offer.payment && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <span className="text-green-600 font-medium text-sm">💰 {formatPayment(offer.payment)}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-xs ${offer.needs_bag ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-green-500/10 text-green-600 border-green-500/30'}`}>
                      {offer.needs_bag ? '🎒 Precisa de bag' : '✓ Não precisa de bag'}
                    </Badge>
                    {offer.can_become_permanent && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                        💼 Possibilidade de fixo
                      </Badge>
                    )}
                    {offer.includes_meal && (
                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                        🍔 Direito a lanche
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    {offer.restaurant_rating !== undefined && offer.restaurant_review_count && offer.restaurant_review_count > 0 ? (
                      <button
                        onClick={() => {
                          if (offer.created_by) {
                            setSelectedRestaurantForRatings({ id: offer.created_by, name: offer.restaurant_name });
                            setRatingsModalOpen(true);
                          }
                        }}
                        className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                        title="Ver todas as avaliações"
                      >
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span className="font-bold text-amber-600">{offer.restaurant_rating}</span>
                        <span className="text-muted-foreground text-sm">({offer.restaurant_review_count})</span>
                        <ChevronRight className="w-3.5 h-3.5 text-amber-500/60 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50">
                        <Star className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground text-sm">Sem avaliações</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {isOwnOffer && (
                        <>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => navigate(`/editar-extra/${offer.id}`)}
                            className="rounded-xl hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDeleteOffer(offer.id)}
                            className="rounded-xl hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {!isOwnOffer && (
                        <Button 
                          size="sm"
                          onClick={() => handleAccept(offer)}
                          className="rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all"
                        >
                          Aceitar
                        </Button>
                      )}
                    </div>
                  </div>

                  {offer.observations && (
                    <p className="text-xs text-muted-foreground italic bg-muted/30 px-3 py-2 rounded-lg">
                      💡 Obs.: {offer.observations}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      {/* Ratings Modal */}
      {selectedRestaurantForRatings && (
        <RestaurantRatingsModal
          open={ratingsModalOpen}
          onOpenChange={setRatingsModalOpen}
          restaurantId={selectedRestaurantForRatings.id}
          restaurantName={selectedRestaurantForRatings.name}
        />
      )}

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
