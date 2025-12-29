import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  LogOut, 
  Store, 
  Package, 
  MapPin,
  Settings,
  Loader2,
  Trash2,
  Navigation,
  Clock,
  Bike,
  Archive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import RatingModal from "@/components/RatingModal";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { ChatModal } from "@/components/ChatModal";
import { useUnreadCounts } from "@/hooks/useChatMessages";
import { AcceptedOfferDetailsModal } from "@/components/AcceptedOfferDetailsModal";
import { RestaurantStats } from "@/components/restaurant/RestaurantStats";
import { OfferCardAvailable } from "@/components/restaurant/OfferCardAvailable";
import { OfferCardInProgress } from "@/components/restaurant/OfferCardInProgress";
import { OfferCardHistory } from "@/components/restaurant/OfferCardHistory";
import { ArchivedOfferCard } from "@/components/restaurant/ArchivedOfferCard";
import { ExpiredOfferCard } from "@/components/restaurant/ExpiredOfferCard";
import { EmptyState } from "@/components/restaurant/EmptyState";

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

interface ArchivedOffer {
  id: string;
  original_offer_id: string;
  restaurant_name: string;
  offer_date: string | null;
  time_start: string;
  time_end: string;
  city: string | null;
  payment: string | null;
  was_accepted: boolean;
  accepted_by_name: string | null;
  archived_at: string;
  offer_type: string | null;
}

const isOfferExpired = (offer: Offer): boolean => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const offerDate = offer.offer_date || today;
  
  // If offer date is in the past
  if (offerDate < today) return true;
  
  // If offer date is today, check if end time has passed
  if (offerDate === today) {
    const [endHours, endMinutes] = offer.time_end.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(endHours, endMinutes, 0, 0);
    return now > endTime;
  }
  
  return false;
};

const isOfferInProgress = (offer: Offer): boolean => {
  if (!offer.is_accepted) return false;
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const offerDate = offer.offer_date || today;
  
  // If offer date is in the past, it's history
  if (offerDate < today) return false;
  
  // If offer date is today, check if end time has passed
  if (offerDate === today) {
    const [endHours, endMinutes] = offer.time_end.split(':').map(Number);
    const endTime = new Date(now);
    endTime.setHours(endHours, endMinutes, 0, 0);
    return now <= endTime;
  }
  
  // Future date, still in progress
  return true;
};

const RestaurantHome = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playAlert, playMotoboyArrived, playNewMessage } = useNotificationSound();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailsModalOffer, setDetailsModalOffer] = useState<Offer | null>(null);
  const [chatOffer, setChatOffer] = useState<Offer | null>(null);
  const [activeTab, setActiveTab] = useState("available");
  const [archivedOffers, setArchivedOffers] = useState<ArchivedOffer[]>([]);

  // Categorize offers
  const { availableOffers, inProgressOffers, historyOffers, expiredOffers, uniqueMotoboys } = useMemo(() => {
    const available: Offer[] = [];
    const inProgress: Offer[] = [];
    const history: Offer[] = [];
    const expired: Offer[] = [];
    const motoboyIds = new Set<string>();

    offers.forEach(offer => {
      if (offer.is_accepted) {
        // Accepted offers
        if (isOfferInProgress(offer)) {
          inProgress.push(offer);
          if (offer.accepted_by) motoboyIds.add(offer.accepted_by);
        } else {
          // Accepted but ended - goes to history
          history.push(offer);
          if (offer.accepted_by) motoboyIds.add(offer.accepted_by);
        }
      } else {
        // Not accepted
        if (isOfferExpired(offer)) {
          // Expired without acceptance - goes to expired section
          expired.push(offer);
        } else {
          // Still available
          available.push(offer);
        }
      }
    });

    return {
      availableOffers: available,
      inProgressOffers: inProgress,
      historyOffers: history,
      expiredOffers: expired,
      uniqueMotoboys: motoboyIds.size
    };
  }, [offers]);

  // Get unread counts for all accepted offers
  const acceptedOfferIds = useMemo(() => 
    offers.filter(o => o.is_accepted).map(o => o.id), 
    [offers]
  );
  const unreadCounts = useUnreadCounts(acceptedOfferIds, restaurant?.id || null, playNewMessage);

  // Calculate total unread for in-progress tab badge
  const totalUnreadInProgress = useMemo(() => {
    return inProgressOffers.reduce((sum, offer) => sum + (unreadCounts[offer.id] || 0), 0);
  }, [inProgressOffers, unreadCounts]);

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

      // Fetch archived offers
      const { data: archivedData } = await supabase
        .from("expired_offers_archive")
        .select("*")
        .order("archived_at", { ascending: false })
        .limit(50);

      if (archivedData) {
        setArchivedOffers(archivedData as ArchivedOffer[]);
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

              // Switch to in-progress tab
              setActiveTab("in_progress");
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
                duration: 10000,
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

        {/* Stats Dashboard */}
        <div className="px-4 -mt-4">
          <RestaurantStats
            availableCount={availableOffers.length}
            inProgressCount={inProgressOffers.length}
            historyCount={historyOffers.length + expiredOffers.length + archivedOffers.length}
            uniqueMotoboys={uniqueMotoboys}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Content with Tabs */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Meus Extras</h2>
            <Button onClick={() => navigate("/restaurante/criar-extra")} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Criar Extra
            </Button>
          </div>

          {offers.length === 0 && archivedOffers.length === 0 ? (
            <EmptyState type="all" />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="available" className="relative text-xs sm:text-sm">
                  <Clock className="w-3 h-3 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Disponíveis</span>
                  <span className="sm:hidden">Disp.</span>
                  {availableOffers.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 h-5 px-1.5 text-[10px] bg-amber-500/20 text-amber-600"
                    >
                      {availableOffers.length}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger value="in_progress" className="relative text-xs sm:text-sm">
                  <Bike className="w-3 h-3 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Em Andamento</span>
                  <span className="sm:hidden">Andamento</span>
                  {inProgressOffers.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className={`ml-1 h-5 px-1.5 text-[10px] ${
                        totalUnreadInProgress > 0 
                          ? 'bg-red-500 text-white animate-pulse' 
                          : 'bg-emerald-500/20 text-emerald-600'
                      }`}
                    >
                      {totalUnreadInProgress > 0 ? totalUnreadInProgress : inProgressOffers.length}
                    </Badge>
                  )}
                </TabsTrigger>
                
                <TabsTrigger value="history" className="relative text-xs sm:text-sm">
                  <Archive className="w-3 h-3 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Histórico</span>
                  <span className="sm:hidden">Hist.</span>
                  {(historyOffers.length + expiredOffers.length + archivedOffers.length) > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-1 h-5 px-1.5 text-[10px]"
                    >
                      {historyOffers.length + expiredOffers.length + archivedOffers.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="space-y-3 mt-0">
                {availableOffers.length === 0 ? (
                  <EmptyState type="available" />
                ) : (
                  availableOffers.map((offer) => (
                    <OfferCardAvailable 
                      key={offer.id} 
                      offer={offer} 
                      onDelete={() => setOfferToDelete(offer)} 
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="in_progress" className="space-y-3 mt-0">
                {inProgressOffers.length === 0 ? (
                  <EmptyState type="in_progress" />
                ) : (
                  inProgressOffers.map((offer) => (
                    <OfferCardInProgress
                      key={offer.id}
                      offer={offer}
                      unreadCount={unreadCounts[offer.id] || 0}
                      onDetailsClick={() => setDetailsModalOffer(offer)}
                      onChatClick={() => setChatOffer(offer)}
                      onLiveClick={() => navigate("/restaurante/motoboy-ao-vivo")}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-3 mt-0">
                {historyOffers.length === 0 && expiredOffers.length === 0 && archivedOffers.length === 0 ? (
                  <EmptyState type="history" />
                ) : (
                  <>
                    {/* Recent history offers (can still rate) */}
                    {historyOffers.map((offer) => (
                      <OfferCardHistory
                        key={offer.id}
                        offer={offer}
                        onRateClick={() => {
                          setSelectedOffer(offer);
                          setRatingModalOpen(true);
                        }}
                      />
                    ))}
                    
                    {/* Expired offers (not accepted) separator */}
                    {expiredOffers.length > 0 && historyOffers.length > 0 && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">Não aceitos</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    
                    {/* Expired offers (not accepted) */}
                    {expiredOffers.map((offer) => (
                      <ExpiredOfferCard
                        key={offer.id}
                        offer={offer}
                      />
                    ))}
                    
                    {/* Archived offers separator */}
                    {(historyOffers.length > 0 || expiredOffers.length > 0) && archivedOffers.length > 0 && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">Anteriores</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    
                    {/* Archived offers */}
                    {archivedOffers.map((offer) => (
                      <ArchivedOfferCard
                        key={offer.id}
                        offer={offer}
                      />
                    ))}
                  </>
                )}
              </TabsContent>
            </Tabs>
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
              {inProgressOffers.some(o => o.motoboy_status === 'in_progress') && (
                <div className="absolute -top-1 right-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold text-white animate-pulse shadow-lg shadow-red-500/50">
                  {inProgressOffers.filter(o => o.motoboy_status === 'in_progress').length}
                </div>
              )}
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                inProgressOffers.some(o => o.motoboy_status === 'in_progress')
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 animate-pulse'
                  : 'bg-muted/50 group-hover:bg-muted'
              }`}>
                <Navigation className={`w-5 h-5 ${
                  inProgressOffers.some(o => o.motoboy_status === 'in_progress')
                    ? 'text-white'
                    : 'text-muted-foreground group-hover:text-foreground'
                } transition-colors`} />
              </div>
              <span className={`text-xs font-medium transition-colors ${
                inProgressOffers.some(o => o.motoboy_status === 'in_progress')
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
