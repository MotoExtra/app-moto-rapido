import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  LogOut, 
  Store, 
  Package, 
  Clock, 
  MapPin,
  User,
  Settings,
  Loader2,
  CheckCircle2,
  Star,
  Navigation,
  Pencil,
  Trash2,
  MoreVertical,
  MessageCircle,
  Phone,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import RatingModal from "@/components/RatingModal";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { ChatModal } from "@/components/ChatModal";
import { useUnreadCounts } from "@/hooks/useChatMessages";
import { AcceptedOfferDetailsModal } from "@/components/AcceptedOfferDetailsModal";

interface Restaurant {
  id: string;
  fantasy_name: string;
  address: string;
  city: string;
  phone: string;
  logo_url: string | null;
}

interface Offer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  offer_date?: string | null;
  is_accepted: boolean;
  accepted_by: string | null;
  created_at: string;
  has_rating?: boolean;
  motoboy_name?: string;
  motoboy_phone?: string;
  motoboy_avatar_url?: string | null;
  motoboy_rating?: number;
  motoboy_review_count?: number;
  motoboy_status?: string;
  payment?: string | null;
  delivery_range?: string | null;
  delivery_quantity?: string | null;
  needs_bag?: boolean | null;
  can_become_permanent?: boolean | null;
  includes_meal?: boolean | null;
  radius?: number | null;
}

const RestaurantHome = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playAlert, playSuccess, playMotoboyArrived, playNewMessage } = useNotificationSound();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailsModalOffer, setDetailsModalOffer] = useState<Offer | null>(null);
  const [chatOffer, setChatOffer] = useState<Offer | null>(null);

  // Get unread counts for all accepted offers
  const acceptedOfferIds = useMemo(() => 
    offers.filter(o => o.is_accepted).map(o => o.id), 
    [offers]
  );
  const unreadCounts = useUnreadCounts(acceptedOfferIds, restaurant?.id || null, playNewMessage);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login/restaurante");
        return;
      }

      // Fetch restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (restaurantError || !restaurantData) {
        await supabase.auth.signOut();
        navigate("/login/restaurante");
        return;
      }

      setRestaurant(restaurantData);

      // Fetch offers created by this restaurant with all details
      const { data: offersData } = await supabase
        .from("offers")
        .select("id, restaurant_name, description, address, time_start, time_end, offer_date, is_accepted, accepted_by, created_at, payment, delivery_range, delivery_quantity, needs_bag, can_become_permanent, includes_meal, radius")
        .eq("created_by", session.user.id)
        .order("created_at", { ascending: false });

      if (offersData) {
        // Check which offers already have ratings from this restaurant
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("offer_id")
          .eq("restaurant_id", session.user.id)
          .eq("rating_type", "restaurant_to_motoboy");

        const ratedOfferIds = new Set(ratingsData?.map(r => r.offer_id) || []);

        // Fetch motoboy profiles for accepted offers
        const acceptedMotoboyIds = offersData.filter(o => o.is_accepted && o.accepted_by).map(o => o.accepted_by);
        const { data: motoboyProfiles } = await supabase
          .from("profiles")
          .select("id, name, phone, avatar_url")
          .in("id", acceptedMotoboyIds);

        const motoboyProfileMap = new Map(motoboyProfiles?.map(p => [p.id, p]) || []);

        // Fetch motoboy ratings from other restaurants
        const { data: motoboyRatingsData } = await supabase
          .from("ratings")
          .select("motoboy_id, rating")
          .eq("rating_type", "restaurant_to_motoboy")
          .in("motoboy_id", acceptedMotoboyIds);

        // Fetch accepted_offers status for each offer
        const acceptedOfferIds = offersData.filter(o => o.is_accepted).map(o => o.id);
        const { data: acceptedOffersData } = await supabase
          .from("accepted_offers")
          .select("offer_id, status")
          .in("offer_id", acceptedOfferIds);

        const statusByOfferId = new Map(acceptedOffersData?.map(ao => [ao.offer_id, ao.status]) || []);

        // Calculate average ratings per motoboy
        const ratingsByMotoboy = new Map<string, { total: number; count: number }>();
        motoboyRatingsData?.forEach(r => {
          if (r.motoboy_id) {
            const existing = ratingsByMotoboy.get(r.motoboy_id) || { total: 0, count: 0 };
            ratingsByMotoboy.set(r.motoboy_id, {
              total: existing.total + r.rating,
              count: existing.count + 1
            });
          }
        });

        const enrichedOffers = offersData.map(offer => {
          const motoboyRating = offer.accepted_by ? ratingsByMotoboy.get(offer.accepted_by) : null;
          const motoboyProfile = offer.accepted_by ? motoboyProfileMap.get(offer.accepted_by) : null;
          return {
            ...offer,
            has_rating: ratedOfferIds.has(offer.id),
            motoboy_name: motoboyProfile?.name || "Motoboy",
            motoboy_phone: motoboyProfile?.phone || undefined,
            motoboy_avatar_url: motoboyProfile?.avatar_url || null,
            motoboy_rating: motoboyRating ? Math.round((motoboyRating.total / motoboyRating.count) * 10) / 10 : undefined,
            motoboy_review_count: motoboyRating?.count || 0,
            motoboy_status: statusByOfferId.get(offer.id) || "pending"
          };
        });

        setOffers(enrichedOffers);
      }

      setLoading(false);
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        navigate("/login/restaurante");
      }
    });

    // Set up realtime listener for offer updates (when motoboy accepts)
    const offersChannel = supabase
      .channel('restaurant-offers-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'offers'
        },
        async (payload) => {
          const updatedOffer = payload.new as any;
          
          // Check if this offer belongs to this restaurant and was just accepted
          if (updatedOffer.is_accepted && payload.old && !(payload.old as any).is_accepted) {
            // Check if this offer belongs to the current restaurant
            const { data: { session } } = await supabase.auth.getSession();
            if (session && updatedOffer.created_by === session.user.id) {
              playAlert();
              
              // Fetch motoboy name
              const { data: motoboyProfile } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", updatedOffer.accepted_by)
                .single();
              
              toast({
                title: "🎉 Extra aceito!",
                description: `${motoboyProfile?.name || "Um motoboy"} aceitou seu extra!`,
              });
              
              // Update offers list
              setOffers(current =>
                current.map(o =>
                  o.id === updatedOffer.id 
                    ? { 
                        ...o, 
                        is_accepted: true, 
                        accepted_by: updatedOffer.accepted_by,
                        motoboy_name: motoboyProfile?.name || "Motoboy"
                      } 
                    : o
                )
              );
            }
          }
        }
      )
      .subscribe();

    // Set up realtime listener for accepted_offers status changes (when motoboy arrives)
    const arrivalChannel = supabase
      .channel('restaurant-motoboy-arrival')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'accepted_offers'
        },
        async (payload) => {
          const updatedAcceptedOffer = payload.new as any;
          const oldAcceptedOffer = payload.old as any;
          
          // Check if status changed to "in_progress" (motoboy arrived)
          if (updatedAcceptedOffer.status === "in_progress" && oldAcceptedOffer.status !== "in_progress") {
            // Fetch offer details to check if it belongs to this restaurant
            const { data: offerData } = await supabase
              .from("offers")
              .select("created_by, restaurant_name")
              .eq("id", updatedAcceptedOffer.offer_id)
              .single();
            
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session && offerData && offerData.created_by === session.user.id) {
              // Play loud arrival sound
              playMotoboyArrived();
              
              // Fetch motoboy name
              const { data: motoboyProfile } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", updatedAcceptedOffer.user_id)
                .single();
              
              // Update offer status in local state
              setOffers(current =>
                current.map(o =>
                  o.id === updatedAcceptedOffer.offer_id
                    ? { ...o, motoboy_status: "in_progress" }
                    : o
                )
              );
              
              toast({
                title: "🏍️ MOTOBOY CHEGOU!",
                description: `${motoboyProfile?.name || "O motoboy"} chegou e está pronto para trabalhar!`,
                duration: 10000, // 10 seconds - longer duration
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(offersChannel);
      supabase.removeChannel(arrivalChannel);
    };
  }, [navigate, playAlert, playMotoboyArrived, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/onboarding");
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;
    
    setIsDeleting(true);
    try {
      // First delete any accepted_offers for this offer
      await supabase
        .from("accepted_offers")
        .delete()
        .eq("offer_id", offerToDelete.id);
      
      // Then delete the offer itself
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerToDelete.id);
      
      if (error) throw error;
      
      setOffers(current => current.filter(o => o.id !== offerToDelete.id));
      
      toast({
        title: "Extra apagado",
        description: "O extra foi removido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao apagar extra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível apagar o extra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setOfferToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableOffers = offers.filter(o => !o.is_accepted);
  const acceptedOffers = offers.filter(o => o.is_accepted);

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!offerToDelete} onOpenChange={(open) => !open && setOfferToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Extra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar o extra "{offerToDelete?.description}"?
              <br /><br />
              {offerToDelete?.is_accepted ? (
                <span className="text-amber-600 font-medium">
                  ⚠️ Este extra já foi aceito por um motoboy. Apagá-lo também cancelará a aceitação.
                </span>
              ) : (
                <span>Esta ação não pode ser desfeita.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOffer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Apagando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Apagar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <img src={logo} alt="MotoExtra" className="h-10" />
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/restaurante/perfil")}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{restaurant?.fantasy_name}</h1>
            <p className="text-sm text-primary-foreground/80 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {restaurant?.city}
            </p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="px-4 -mt-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{availableOffers.length}</p>
                <p className="text-xs text-muted-foreground">Extras Disponíveis</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{acceptedOffers.length}</p>
                <p className="text-xs text-muted-foreground">Extras Aceitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Meus Extras</h2>
          <Button onClick={() => navigate("/restaurante/criar-extra")} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Criar Extra
          </Button>
        </div>

        {offers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhum extra criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro extra para encontrar motoboys disponíveis
              </p>
              <Button onClick={() => navigate("/restaurante/criar-extra")}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Extra
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <Card key={offer.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold">{offer.description}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{offer.address}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={offer.is_accepted ? "default" : "secondary"}>
                        {offer.is_accepted ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Aceito</>
                        ) : (
                          <><Clock className="w-3 h-3 mr-1" /> Disponível</>
                        )}
                      </Badge>
                      
                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => navigate(`/restaurante/editar-extra/${offer.id}`)}
                            className="cursor-pointer"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setOfferToDelete(offer)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Apagar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(offer.time_start)} - {formatTime(offer.time_end)}
                    </span>
                  </div>

                  {offer.is_accepted && (
                    <div 
                      className="mt-3 pt-3 border-t cursor-pointer group"
                      onClick={() => setDetailsModalOffer(offer)}
                    >
                      {/* Motoboy Card - Clickable */}
                      <div className={`p-3 rounded-xl border transition-all group-hover:shadow-md ${
                        offer.motoboy_status === "in_progress" 
                          ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/30 group-hover:border-emerald-500/50" 
                          : "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20 group-hover:border-blue-500/40"
                      }`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-background">
                            <AvatarImage src={offer.motoboy_avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {offer.motoboy_name?.charAt(0).toUpperCase() || "M"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">{offer.motoboy_name}</p>
                              {offer.motoboy_status === "in_progress" && (
                                <Badge variant="default" className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                                  Chegou
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {offer.motoboy_rating !== undefined && offer.motoboy_review_count && offer.motoboy_review_count > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                  {offer.motoboy_rating} ({offer.motoboy_review_count})
                                </span>
                              )}
                              {unreadCounts[offer.id] > 0 && (
                                <Badge 
                                  variant="destructive" 
                                  className="h-5 px-1.5 flex items-center justify-center text-[10px] animate-pulse"
                                >
                                  <MessageCircle className="w-3 h-3 mr-0.5" />
                                  {unreadCounts[offer.id]} nova{unreadCounts[offer.id] > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        
                        {/* Quick hint */}
                        <p className="text-xs text-muted-foreground mt-2 text-center group-hover:text-foreground transition-colors">
                          Toque para ver detalhes completos
                        </p>
                      </div>
                      
                      {/* Status Indicator */}
                      {offer.motoboy_status !== "in_progress" && (
                        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mt-2">
                          <Clock className="w-3 h-3" />
                          <span>Aguardando chegada do motoboy</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around px-4 py-3 max-w-md mx-auto">
          <button className="relative flex flex-col items-center gap-1 px-4 py-1 group">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-primary">Extras</span>
          </button>
          
          <button 
            onClick={() => navigate("/restaurante/motoboy-ao-vivo")}
            className="relative flex flex-col items-center gap-1 px-4 py-1 group"
          >
            {/* Badge for active motoboys */}
            {offers.some(o => o.is_accepted && o.motoboy_status === 'in_progress') && (
              <div className="absolute -top-1 right-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white animate-pulse shadow-lg shadow-red-500/50">
                {offers.filter(o => o.is_accepted && o.motoboy_status === 'in_progress').length}
              </div>
            )}
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              offers.some(o => o.is_accepted && o.motoboy_status === 'in_progress')
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 animate-pulse'
                : 'bg-muted/50 group-hover:bg-muted'
            }`}>
              <Navigation className={`w-5 h-5 ${
                offers.some(o => o.is_accepted && o.motoboy_status === 'in_progress')
                  ? 'text-white'
                  : 'text-muted-foreground group-hover:text-foreground'
              } transition-colors`} />
            </div>
            <span className={`text-xs font-medium transition-colors ${
              offers.some(o => o.is_accepted && o.motoboy_status === 'in_progress')
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground group-hover:text-foreground'
            }`}>Ao Vivo</span>
          </button>
          
          <button 
            onClick={() => navigate("/restaurante/perfil")}
            className="relative flex flex-col items-center gap-1 px-4 py-1 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-muted/50 group-hover:bg-muted flex items-center justify-center transition-colors">
              <Store className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Perfil</span>
          </button>
        </div>
      </nav>

        {/* Rating Modal */}
        {selectedOffer && restaurant && (
          <RatingModal
            open={ratingModalOpen}
            onOpenChange={setRatingModalOpen}
            offerId={selectedOffer.id}
            motoboyId={selectedOffer.accepted_by || ""}
            motoboyName={selectedOffer.motoboy_name || "Motoboy"}
            restaurantId={restaurant.id}
            onRatingComplete={() => {
              setOffers(current =>
                current.map(o =>
                  o.id === selectedOffer.id ? { ...o, has_rating: true } : o
                )
              );
              setSelectedOffer(null);
            }}
          />
        )}

        {/* Chat Modal */}
        {chatOffer && restaurant && (
          <ChatModal
            open={!!chatOffer}
            onOpenChange={(open) => !open && setChatOffer(null)}
            offerId={chatOffer.id}
            userId={restaurant.id}
            senderType="restaurant"
            contactName={chatOffer.motoboy_name || "Motoboy"}
            contactAvatarUrl={chatOffer.motoboy_avatar_url}
            contactPhone={chatOffer.motoboy_phone}
            contactRating={chatOffer.motoboy_rating}
          />
        )}

        {/* Accepted Offer Details Modal */}
        {detailsModalOffer && restaurant && (
          <AcceptedOfferDetailsModal
            open={!!detailsModalOffer}
            onOpenChange={(open) => !open && setDetailsModalOffer(null)}
            offer={detailsModalOffer}
            unreadCount={unreadCounts[detailsModalOffer.id] || 0}
            onChatClick={() => {
              setChatOffer(detailsModalOffer);
              setDetailsModalOffer(null);
            }}
            onRateClick={() => {
              setSelectedOffer(detailsModalOffer);
              setRatingModalOpen(true);
              setDetailsModalOffer(null);
            }}
            onLiveTrackClick={() => {
              navigate("/restaurante/motoboy-ao-vivo");
              setDetailsModalOffer(null);
            }}
          />
        )}
      </div>
    </>
  );
};

export default RestaurantHome;
