import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Clock, MapPin, Package, Star, AlertCircle, LogOut, User as UserIcon, Plus, Bike, Pencil, Trash2, Menu, Trophy, CheckCircle, Bell, CalendarDays, X, ChevronRight, Filter, Check, Shield, Navigation } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { ES_CITIES } from "@/lib/cities";
import { RestaurantRatingsModal } from "@/components/RestaurantRatingsModal";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { formatPayment } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import { useGamification } from "@/hooks/useGamification";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { MotoboyAssistant } from "@/components/MotoboyAssistant";
import { HomeStatsCard } from "@/components/home/HomeStatsCard";
import { EmptyFeedState } from "@/components/home/EmptyFeedState";
import { OfferSkeleton } from "@/components/home/OfferSkeleton";
import PeakHourBanner from "@/components/home/PeakHourBanner";
interface Offer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  city?: string | null;
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
  const geolocation = useGeolocation();
  const [user, setUser] = useState<User | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profileData, setProfileData] = useState<{ name: string; avatar_url: string } | null>(null);
  const [hasActiveOffer, setHasActiveOffer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationPromptShown, setNotificationPromptShown] = useState(false);
  const [ratingsModalOpen, setRatingsModalOpen] = useState(false);
  const [selectedRestaurantForRatings, setSelectedRestaurantForRatings] = useState<{ id: string; name: string } | null>(null);
  const [cityPreferences, setCityPreferences] = useState<string[]>([]);
  const [showCityFilter, setShowCityFilter] = useState(false);
  const [tempCityFilter, setTempCityFilter] = useState<string[]>([]);
  const [cityOfferCounts, setCityOfferCounts] = useState<Map<string, number>>(new Map());
  const [isAdmin, setIsAdmin] = useState(false);
  const [myExtrasCount, setMyExtrasCount] = useState(0);
  const [activeAcceptedCount, setActiveAcceptedCount] = useState(0);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);

  // Gamification data
  const { stats: gamificationStats, levelUpInfo, dismissLevelUp } = useGamification(user?.id);

  // Handle location permission request
  const handleRequestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          toast({
            title: "Localização ativada",
            description: "Sua localização foi obtida com sucesso!",
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            toast({
              title: "Permissão necessária",
              description: "Acesse as configurações do navegador para permitir a localização.",
              variant: "destructive",
            });
          }
        },
        { enableHighAccuracy: true }
      );
    }
  };


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
        navigate("/login/motoboy");
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

      // Fetch city preferences
      const { data: cityPrefs } = await supabase
        .from("motoboy_city_preferences")
        .select("city")
        .eq("user_id", user.id);

      if (cityPrefs && cityPrefs.length > 0) {
        setCityPreferences(cityPrefs.map(p => p.city));
      }

      // Check if user is admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!adminRole);

      // Count user's offered extras
      const { count: extrasCount } = await supabase
        .from("offers")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .eq("is_accepted", false);

      setMyExtrasCount(extrasCount || 0);

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
        navigate("/login/motoboy");
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
    if (user) {
      fetchOffers();
    }

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
  }, [user, cityPreferences]);

  const fetchOffers = async () => {
    setIsLoadingOffers(true);
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_accepted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch active accepted offers for current user to filter out conflicting offers
      const { data: acceptedData } = await supabase
        .from("accepted_offers")
        .select(`
          id,
          offer_id,
          offers!inner (
            offer_date,
            time_start,
            time_end
          )
        `)
        .eq("user_id", user?.id)
        .in("status", ["pending", "arrived", "in_progress"]);

      // Track active accepted offers count for banner
      setActiveAcceptedCount(acceptedData?.length || 0);

      if (data && data.length > 0) {
        // Filter out expired offers (past start time - extras disappear when start time passes)
        const now = new Date();
        let validOffers = data.filter(offer => {
          const offerDate = offer.offer_date ? parseISO(offer.offer_date) : new Date();
          const [startHours, startMinutes] = offer.time_start.split(':').map(Number);
          const offerStartTime = new Date(offerDate);
          offerStartTime.setHours(startHours, startMinutes, 0, 0);
          
          // Keep only offers whose start time hasn't passed yet
          return offerStartTime > now;
        });

        // Excluir extras criados pelo próprio usuário (motoboy não vê seus próprios extras)
        validOffers = validOffers.filter(offer => offer.created_by !== user?.id);

        // Filter out offers that conflict with accepted offers (same date and overlapping time)
        if (acceptedData && acceptedData.length > 0) {
          validOffers = validOffers.filter(offer => {
            return !acceptedData.some((accepted: any) => {
              const acceptedOffer = accepted.offers;
              if (!acceptedOffer) return false;

              // Only check same day
              if (acceptedOffer.offer_date !== offer.offer_date) return false;

              // Check if time ranges overlap
              // Overlap occurs if: newStart < existingEnd AND newEnd > existingStart
              return offer.time_start < acceptedOffer.time_end && 
                     offer.time_end > acceptedOffer.time_start;
            });
          });
        }

        // Count offers per city (before filtering by preferences)
        const cityCounts = new Map<string, number>();
        validOffers.forEach(offer => {
          if (offer.city) {
            cityCounts.set(offer.city, (cityCounts.get(offer.city) || 0) + 1);
          }
        });
        setCityOfferCounts(cityCounts);

        // Filter by city preferences if user has any
        if (cityPreferences.length > 0) {
          validOffers = validOffers.filter(offer => 
            offer.city && cityPreferences.includes(offer.city)
          );
        }

        // Fetch restaurant ratings from motoboys
        const creatorIds = [...new Set(validOffers.filter(o => o.created_by).map(o => o.created_by))];
        
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

        const enrichedOffers = validOffers.map(offer => {
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
    } finally {
      setIsLoadingOffers(false);
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
    navigate("/login/motoboy");
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
      navigate("/login/motoboy");
      return;
    }

    try {
      // Check for time conflicts with existing accepted offers
      const { data: existingOffers, error: conflictError } = await supabase
        .from("accepted_offers")
        .select(`
          id,
          offer_id,
          status,
          offers!inner (
            offer_date,
            time_start,
            time_end
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["pending", "arrived", "in_progress"]);

      if (conflictError) throw conflictError;

      // Check for time overlap
      if (existingOffers && existingOffers.length > 0) {
        const newOfferDate = offer.offer_date;
        const newStart = offer.time_start;
        const newEnd = offer.time_end;

        const hasConflict = existingOffers.some((existing: any) => {
          const existingOffer = existing.offers;
          if (!existingOffer) return false;

          // Only check same day
          if (existingOffer.offer_date !== newOfferDate) return false;

          const existingStart = existingOffer.time_start;
          const existingEnd = existingOffer.time_end;

          // Check if time ranges overlap
          // Overlap occurs if: newStart < existingEnd AND newEnd > existingStart
          return newStart < existingEnd && newEnd > existingStart;
        });

        if (hasConflict) {
          toast({
            title: "Conflito de horário",
            description: "Você já tem um extra aceito que coincide com este horário. Finalize ou cancele antes de aceitar outro no mesmo período.",
            variant: "destructive",
          });
          return;
        }
      }

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

      // Vibrate for haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const firstName = profileData?.name?.split(" ")[0] || "Motoboy";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Top-right blob */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/10 via-amber-400/8 to-transparent rounded-full blur-3xl" />
        {/* Bottom-left blob */}
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/8 via-primary/5 to-transparent rounded-full blur-3xl" />
        {/* Center-right subtle accent */}
        <div className="absolute top-1/2 -right-20 w-72 h-72 bg-gradient-to-l from-primary/5 to-transparent rounded-full blur-2xl" />
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Header with Glassmorphism */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="sticky top-0 z-10 bg-white/80 dark:bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-primary/5"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Logo + Greeting */}
            <div className="flex items-center gap-3 min-w-0">
              <motion.img 
                src={logo} 
                alt="MotoExtra" 
                className="h-10 w-auto flex-shrink-0"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{getGreeting()},</p>
                <p className="text-sm font-semibold text-foreground truncate">{firstName}!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Level Badge */}
              <motion.div
                className="flex items-center"
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate("/meu-progresso")}
                title={`Nível ${gamificationStats?.current_level || 1}`}
              >
                <LevelBadge 
                  level={gamificationStats?.current_level || 1} 
                  size="sm" 
                />
              </motion.div>

              {/* Score Card */}
              <motion.div 
                className="flex items-center gap-1.5 bg-gradient-to-r from-primary/15 to-primary/5 px-3 py-1.5 rounded-full border border-primary/20 cursor-pointer"
                whileHover={{ scale: 1.03 }}
                onClick={() => navigate("/meu-progresso")}
                title="Sua pontuação"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Star className="w-4 h-4 fill-primary text-primary" />
                </motion.div>
                <span className="text-sm font-bold text-primary">{gamificationStats?.total_xp || 0}</span>
              </motion.div>
              
              {/* Avatar that opens menu */}
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-background cursor-pointer">
                      <AvatarImage src={profileData?.avatar_url} alt={profileData?.name} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-semibold">
                        {profileData?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || <UserIcon className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </motion.button>
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
                    
                    <button
                      onClick={() => { setMenuOpen(false); navigate("/meus-extras"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center relative">
                        <Bike className="w-5 h-5 text-blue-600" />
                        {myExtrasCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {myExtrasCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">Extras Ofertados</p>
                        <p className="text-xs text-muted-foreground">Extras que você ofertou</p>
                      </div>
                    </button>

                    <button
                      onClick={() => { setMenuOpen(false); navigate("/troca-lanche"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-lg">
                        🍔
                      </div>
                      <div>
                        <p className="font-medium">Troca de Lanche</p>
                        <p className="text-xs text-muted-foreground">Troque lanches com motoboys</p>
                      </div>
                    </button>
                    
                    {isAdmin && (
                      <button
                        onClick={() => { setMenuOpen(false); navigate("/admin"); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Painel Admin</p>
                          <p className="text-xs text-muted-foreground">Gerenciar plataforma</p>
                        </div>
                      </button>
                    )}
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
      </motion.header>


      {/* Location Status Indicator - Elegant with Glow */}
      <div className="px-4 pt-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          geolocation.error 
            ? 'bg-destructive/10 text-destructive border border-destructive/20' 
            : geolocation.loading
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            geolocation.error 
              ? 'bg-destructive' 
              : geolocation.loading
                ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                : 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.9)]'
          }`} />
          <Navigation className="w-3.5 h-3.5" />
          <span>
            {geolocation.error 
              ? 'GPS inativo' 
              : geolocation.loading 
                ? 'Localizando...' 
                : `GPS ativo • ${Math.round(geolocation.accuracy || 0)}m`}
          </span>
          {geolocation.error && (
            <button 
              onClick={handleRequestLocation}
              className="ml-1 underline hover:no-underline"
            >
              Ativar
            </button>
          )}
        </div>
      </div>

      {/* Stats Card */}
      <HomeStatsCard userId={user?.id} />

      {/* Offer Extra Button */}
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={() => navigate("/ofertar-extra")}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold">Ofertar Extra para Motoboys</span>
          </Button>
        </motion.div>
      </div>


      {/* City Filter Section */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => {
              setTempCityFilter(cityPreferences);
              setShowCityFilter(!showCityFilter);
            }}
            className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filtrar por cidade</span>
            {cityPreferences.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary border-0">
                {cityPreferences.length}
              </Badge>
            )}
          </button>
          {cityPreferences.length > 0 && !showCityFilter && (
            <button
              onClick={() => {
                setCityPreferences([]);
                fetchOffers();
              }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Limpar filtro
            </button>
          )}
        </div>

        {showCityFilter && (
          <div className="bg-card border rounded-xl p-4 shadow-lg animate-fade-in">
            <div className="flex flex-wrap gap-2 mb-4">
              {ES_CITIES
                .map(city => ({ city, count: cityOfferCounts.get(city) || 0 }))
                .sort((a, b) => b.count - a.count)
                .map(({ city, count }) => {
                  const isSelected = tempCityFilter.includes(city);
                  const hasOffers = count > 0;
                  const isPopular = count >= 3;
                  return (
                    <button
                      key={city}
                      onClick={() => {
                        setTempCityFilter(prev => 
                          isSelected 
                            ? prev.filter(c => c !== city)
                            : [...prev, city]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : hasOffers
                            ? isPopular
                              ? "bg-green-500/20 hover:bg-green-500/30 text-green-700 border border-green-500/30"
                              : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {city}
                      {hasOffers && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          isSelected
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : isPopular
                              ? "bg-green-500 text-white"
                              : "bg-blue-500/80 text-white"
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Popular (3+)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Disponível</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setShowCityFilter(false);
                  setTempCityFilter(cityPreferences);
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => {
                  setCityPreferences(tempCityFilter);
                  setShowCityFilter(false);
                }}
              >
                Aplicar ({tempCityFilter.length || "Todas"})
              </Button>
            </div>
          </div>
        )}

        {/* Active filters display */}
        {cityPreferences.length > 0 && !showCityFilter && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {cityPreferences.slice(0, 4).map((city) => (
              <Badge
                key={city}
                variant="secondary"
                className="bg-primary/10 text-primary border-0 text-xs"
              >
                📍 {city}
              </Badge>
            ))}
            {cityPreferences.length > 4 && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-xs">
                +{cityPreferences.length - 4} mais
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Offers List */}
      <div className="p-4 space-y-4 pb-28">
        {/* Peak Hour Banner */}
        <PeakHourBanner city={cityPreferences.length > 0 ? cityPreferences[0] : null} />
        
        {/* Banner: Extras ocultos devido a conflitos */}
        {activeAcceptedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4"
          >
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Você tem {activeAcceptedCount} extra{activeAcceptedCount > 1 ? 's' : ''} aceito{activeAcceptedCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                Extras com horário conflitante estão ocultos
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              onClick={() => navigate("/extras-aceitos")}
            >
              Ver
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {isLoadingOffers ? (
          <OfferSkeleton />
        ) : offers.length === 0 ? (
          <EmptyFeedState />
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
                        {offer.city && (
                          <Badge 
                            variant="outline"
                            className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium"
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            {offer.city}
                          </Badge>
                        )}
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

                    {offer.delivery_range && (
                      <div className="flex items-center text-sm text-foreground/80">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2.5">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <span>Raio: {offer.delivery_range}</span>
                      </div>
                    )}

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
                    
                    {isOwnOffer && (
                      <div className="flex gap-2">
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
                      </div>
                    )}
                  </div>

                  {!isOwnOffer && (
                    <Button 
                      onClick={() => handleAccept(offer)}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all text-lg font-semibold"
                    >
                      Aceitar Extra
                    </Button>
                  )}

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

      {/* Level Up Modal */}
      <LevelUpModal 
        open={levelUpInfo.show} 
        onClose={dismissLevelUp} 
        newLevel={levelUpInfo.newLevel} 
      />

      {/* Motoboy Assistant Chatbot */}
      <MotoboyAssistant />
    </div>
  );
};

export default Home;
