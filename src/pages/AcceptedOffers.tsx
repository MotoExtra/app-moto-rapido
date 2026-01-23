import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Clock, MapPin, Package, Star, ArrowLeft, Phone, X, Loader2, MapPinCheck, Navigation, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPayment } from "@/lib/utils";
import RateRestaurantModal from "@/components/RateRestaurantModal";
import RateExternalRestaurantModal from "@/components/RateExternalRestaurantModal";
import OfferLocationMap from "@/components/OfferLocationMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLiveLocationBroadcast } from "@/hooks/useLiveLocationBroadcast";
import { isWithinRadius, isWithinTimeWindow, calculateDistance } from "@/lib/distance";
import { ChatModal } from "@/components/ChatModal";
import { useUnreadCounts } from "@/hooks/useChatMessages";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { isRatingPromptTime, hasShownRatingPrompt, markRatingPromptShown, sendRatingPushNotification, hasSentRatingPushNotification } from "@/lib/ratingPrompt";
interface AcceptedOffer {
  id: string;
  status: string;
  accepted_at: string;
  user_id: string;
  offer: {
    id: string;
    restaurant_name: string;
    description: string;
    address: string;
    time_start: string;
    time_end: string;
    offer_date: string | null;
    radius: number;
    needs_bag: boolean;
    can_become_permanent?: boolean;
    includes_meal?: boolean;
    delivery_range: string;
    delivery_quantity?: string | null;
    experience: string | null;
    rating: number;
    review_count: number;
    phone: string | null;
    payment: string | null;
    created_by: string | null;
    lat: number | null;
    lng: number | null;
    offer_type?: string | null;
    external_restaurant_id?: string | null;
  };
  has_rating?: boolean;
  has_external_rating?: boolean;
}

// Helper function to check if offer period has expired
const isOfferExpired = (offer: AcceptedOffer['offer']): boolean => {
  const now = new Date();
  const offerDate = offer.offer_date ? new Date(offer.offer_date + 'T00:00:00') : new Date();
  const [endHours, endMinutes] = offer.time_end.split(':').map(Number);
  
  const offerEndTime = new Date(offerDate);
  offerEndTime.setHours(endHours, endMinutes, 0, 0);
  
  return now > offerEndTime;
};

// Helper function to check if offer is still in progress (not expired)
const isOfferInProgress = (offer: AcceptedOffer['offer']): boolean => {
  return !isOfferExpired(offer);
};

const AcceptedOffers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playNewMessage } = useNotificationSound();
  const [acceptedOffers, setAcceptedOffers] = useState<AcceptedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [offerToCancel, setOfferToCancel] = useState<AcceptedOffer | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<AcceptedOffer | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [arrivingId, setArrivingId] = useState<string | null>(null);
  const [motoboyName, setMotoboyName] = useState<string>("Motoboy");
  const [chatOffer, setChatOffer] = useState<AcceptedOffer | null>(null);
  
  // Get unread counts for all accepted offers
  const offerIds = useMemo(() => acceptedOffers.map(ao => ao.offer.id), [acceptedOffers]);
  const unreadCounts = useUnreadCounts(offerIds, userId, playNewMessage);
  
  // Geolocation hook
  const geolocation = useGeolocation();
  
  // Force re-render every minute to update time-based conditions
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Categorize offers into active and completed based on time
  // Include tick in dependencies so offers are recategorized every minute
  const { activeOffers, completedOffers } = useMemo(() => {
    const active: AcceptedOffer[] = [];
    const completed: AcceptedOffer[] = [];
    
    acceptedOffers.forEach(ao => {
      if (isOfferInProgress(ao.offer)) {
        active.push(ao);
      } else {
        completed.push(ao);
      }
    });
    
    return { activeOffers: active, completedOffers: completed };
  }, [acceptedOffers, tick]);
  
  // Find the active in_progress offer for live location broadcasting
  const activeInProgressOffer = useMemo(() => {
    return activeOffers.find(ao => ao.status === 'in_progress');
  }, [activeOffers]);
  
  // Broadcast live location when motoboy is in_progress
  useLiveLocationBroadcast({
    userId: userId,
    offerId: activeInProgressOffer?.offer.id || null,
    isActive: !!activeInProgressOffer,
    latitude: geolocation.latitude,
    longitude: geolocation.longitude,
    accuracy: geolocation.accuracy,
  });

  // Track which offers have already triggered proximity vibration
  const [vibratedOffers, setVibratedOffers] = useState<Set<string>>(new Set());

  // Vibrate phone when motoboy enters proximity zone for CHEGUEI button
  useEffect(() => {
    if (!geolocation.latitude || !geolocation.longitude) return;

    activeOffers.forEach((ao) => {
      // Skip if already in_progress or already vibrated for this offer
      if (ao.status === 'in_progress' || vibratedOffers.has(ao.offer.id)) return;

      const { lat, lng, offer_date, time_start } = ao.offer;
      if (!lat || !lng) return;

      const distance = calculateDistance(
        geolocation.latitude!,
        geolocation.longitude!,
        lat,
        lng
      );
      const isLocationOk = distance <= 1; // Within 1km
      const isTimeOk = isWithinTimeWindow(offer_date, time_start, 30);

      // If conditions are met, vibrate, show toast, and mark as notified
      if (isLocationOk && isTimeOk) {
        // Vibrate pattern: 3 short bursts to get attention
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        
        // Show toast reminder
        toast({
          title: "🔔 Você está próximo!",
          description: `Chegou em ${ao.offer.restaurant_name}? Aperte o botão CHEGUEI para confirmar sua chegada.`,
          duration: 8000,
        });
        
        setVibratedOffers((prev) => new Set(prev).add(ao.offer.id));
      }
    });
  }, [geolocation.latitude, geolocation.longitude, activeOffers, vibratedOffers]);

  useEffect(() => {
    const fetchAcceptedOffers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Erro",
            description: "Você precisa estar logado para ver seus extras aceitos.",
            variant: "destructive",
          });
          navigate("/login/motoboy");
          return;
        }

        setUserId(user.id);

        // Fetch motoboy profile name
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        
        if (profile?.name) {
          setMotoboyName(profile.name);
        }

        const { data, error } = await supabase
          .from("accepted_offers")
          .select(`
            id,
            status,
            accepted_at,
            user_id,
            offer:offers(
              id,
              restaurant_name,
              description,
              address,
              time_start,
              time_end,
              offer_date,
              radius,
              needs_bag,
              can_become_permanent,
              includes_meal,
              delivery_range,
              delivery_quantity,
              experience,
              rating,
              review_count,
              phone,
              payment,
              created_by,
              lat,
              lng,
              offer_type,
              external_restaurant_id
            )
          `)
          .order("accepted_at", { ascending: false });

        if (error) throw error;

        // Check which offers already have ratings from this motoboy (restaurant offers)
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("offer_id")
          .eq("motoboy_id", user.id)
          .eq("rating_type", "motoboy_to_restaurant");

        const ratedOfferIds = new Set(ratingsData?.map(r => r.offer_id) || []);

        // Check which offers already have external restaurant ratings
        const { data: externalRatingsData } = await supabase
          .from("external_restaurant_ratings")
          .select("offer_id")
          .eq("motoboy_id", user.id);

        const externalRatedOfferIds = new Set(externalRatingsData?.map(r => r.offer_id) || []);

        const enrichedOffers = (data as AcceptedOffer[]).map(ao => ({
          ...ao,
          has_rating: ratedOfferIds.has(ao.offer.id),
          has_external_rating: externalRatedOfferIds.has(ao.offer.id),
        }));

        setAcceptedOffers(enrichedOffers);
      } catch (error) {
        console.error("Erro ao buscar extras aceitos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar seus extras aceitos.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAcceptedOffers();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/login/motoboy");
      }
    });

    return () => subscription.unsubscribe();
  }, [toast, navigate]);

  // Auto-trigger rating modal 3 minutes after offer end time
  useEffect(() => {
    if (!userId) return;

    const offerToRate = completedOffers.find(ao => {
      const isMotoboyOffer = ao.offer.offer_type === 'motoboy';
      const hasExternalRestaurant = !!ao.offer.external_restaurant_id;
      
      // For motoboy offers with external restaurant
      if (isMotoboyOffer && hasExternalRestaurant) {
        return !ao.has_external_rating &&
          isRatingPromptTime(ao.offer.offer_date, ao.offer.time_end) &&
          !hasShownRatingPrompt(ao.offer.id, 'motoboy');
      }
      
      // For restaurant offers
      return ao.offer.created_by &&
        !ao.has_rating &&
        isRatingPromptTime(ao.offer.offer_date, ao.offer.time_end) &&
        !hasShownRatingPrompt(ao.offer.id, 'motoboy');
    });

    if (offerToRate) {
      setSelectedOffer(offerToRate);
      setRatingModalOpen(true);
      markRatingPromptShown(offerToRate.offer.id, 'motoboy');
    }
  }, [completedOffers, tick, userId]);

  // Send push notification for rating 3 minutes after offer end time
  useEffect(() => {
    if (!userId) return;

    completedOffers.forEach(async (ao) => {
      if (
        ao.offer.created_by &&
        !ao.has_rating &&
        isRatingPromptTime(ao.offer.offer_date, ao.offer.time_end) &&
        !hasSentRatingPushNotification(ao.offer.id, 'motoboy')
      ) {
        await sendRatingPushNotification({
          offerId: ao.offer.id,
          restaurantName: ao.offer.restaurant_name,
          targetUserId: userId,
          targetType: 'motoboy',
        });
      }
    });
  }, [completedOffers, tick, userId]);

  // Calculate minutes until offer start
  const getMinutesUntilStart = (offer: AcceptedOffer['offer']): number => {
    const now = new Date();
    const offerDate = offer.offer_date ? new Date(offer.offer_date + 'T00:00:00') : new Date();
    const [startHours, startMinutes] = offer.time_start.split(':').map(Number);
    
    const offerStartTime = new Date(offerDate);
    offerStartTime.setHours(startHours, startMinutes, 0, 0);
    
    return (offerStartTime.getTime() - now.getTime()) / (1000 * 60);
  };

  // Get penalty info based on time until start (for display purposes)
  const getPenaltyInfo = (minutesUntilStart: number): { xp: number; label: string; severity: 'critical' | 'medium' | 'low' } => {
    if (minutesUntilStart < 180) {
      return { xp: 100, label: 'Menos de 3h', severity: 'critical' };
    } else if (minutesUntilStart < 360) {
      return { xp: 50, label: '3-6h', severity: 'medium' };
    } else {
      return { xp: 25, label: 'Mais de 6h', severity: 'low' };
    }
  };

  const handleConfirmCancel = async () => {
    if (!offerToCancel || !userId) return;

    const minutesUntilStart = Math.floor(getMinutesUntilStart(offerToCancel.offer));
    const penaltyInfo = getPenaltyInfo(minutesUntilStart);
    
    setCancellingId(offerToCancel.id);

    try {
      // Store offer info before deletion for notification
      const cancelledOffer = offerToCancel.offer;
      const restaurantUserId = cancelledOffer.created_by;

      // Apply progressive cancellation penalty
      const { data: penaltyResult, error: penaltyError } = await supabase.rpc(
        "record_cancellation_progressive" as any,
        {
          p_user_id: userId,
          p_offer_id: cancelledOffer.id,
          p_minutes_until_start: minutesUntilStart,
        }
      );

      if (penaltyError) {
        console.error("Erro ao aplicar penalidade:", penaltyError);
        // Continue with cancellation even if penalty fails
      }

      // Delete the accepted_offer record
      const { error: deleteError } = await supabase
        .from("accepted_offers")
        .delete()
        .eq("id", offerToCancel.id);

      if (deleteError) throw deleteError;

      // Update the offer to make it available again
      const { error: updateError } = await supabase
        .from("offers")
        .update({ is_accepted: false, accepted_by: null })
        .eq("id", cancelledOffer.id);

      if (updateError) throw updateError;

      // Remove from local state
      setAcceptedOffers((current) => current.filter((o) => o.id !== offerToCancel.id));

      // Show toast with penalty info
      const resultData = penaltyResult as any;
      const penaltyXp = resultData?.[0]?.penalty_xp || penaltyInfo.xp;
      const penaltyReason = resultData?.[0]?.penalty_reason || `Cancelamento com ${penaltyInfo.label} de antecedência`;
      
      // Haptic feedback for negative action
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      toast({
        title: "Extra cancelado",
        description: `${penaltyReason}. Você perdeu -${penaltyXp} XP.`,
        variant: "destructive",
      });

      // Send push notification to motoboy about penalty
      supabase.functions.invoke("notify-penalty", {
        body: {
          user_id: userId,
          penalty_type: "cancellation",
          xp_amount: penaltyXp,
          reason: penaltyReason,
        },
      }).then((result) => {
        console.log("Penalty notification sent:", result);
      }).catch((err) => {
        console.error("Error sending penalty notification:", err);
      });

      // Notify the restaurant owner about the cancellation (don't wait for it)
      if (restaurantUserId) {
        supabase.functions.invoke("notify-offer-cancelled", {
          body: {
            offer_id: cancelledOffer.id,
            motoboy_name: motoboyName,
            restaurant_user_id: restaurantUserId,
          },
        }).then((result) => {
          console.log("Cancellation notification sent:", result);
        }).catch((err) => {
          console.error("Error sending cancellation notification:", err);
        });
      }
    } catch (error) {
      console.error("Erro ao cancelar extra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o extra. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
      setOfferToCancel(null);
    }
  };

  const getStatusBadge = (status: string, isExpired: boolean = false) => {
    // If offer period has expired, show as completed regardless of actual status
    if (isExpired) {
      return <Badge variant="outline" className="bg-muted">Concluído</Badge>;
    }
    
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      in_progress: { label: "Em Andamento", variant: "default" },
      completed: { label: "Concluído", variant: "outline" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  // Check if "Cheguei" button should be enabled for a specific offer
  const getArrivalStatus = (offer: AcceptedOffer['offer']) => {
    const isTimeOk = isWithinTimeWindow(offer.offer_date, offer.time_start, 30);
    
    let isLocationOk = false;
    let distance: number | null = null;
    
    if (geolocation.latitude && geolocation.longitude && offer.lat && offer.lng) {
      distance = calculateDistance(
        geolocation.latitude,
        geolocation.longitude,
        offer.lat,
        offer.lng
      );
      isLocationOk = distance <= 1; // Within 1km
    }
    
    return {
      isEnabled: isTimeOk && isLocationOk,
      isTimeOk,
      isLocationOk,
      distance,
      hasLocation: offer.lat !== null && offer.lng !== null,
      hasUserLocation: geolocation.latitude !== null && geolocation.longitude !== null,
      locationError: geolocation.error,
    };
  };

  const handleArrival = async (acceptedOffer: AcceptedOffer) => {
    setArrivingId(acceptedOffer.id);
    try {
      const { error } = await supabase
        .from("accepted_offers")
        .update({ status: "in_progress" })
        .eq("id", acceptedOffer.id);
      
      if (error) throw error;
      
      setAcceptedOffers(current =>
        current.map(ao =>
          ao.id === acceptedOffer.id ? { ...ao, status: "in_progress" } : ao
        )
      );
      
      // Apply arrival delay penalty if applicable (using v2 that logs to penalty_history)
      let penaltyMessage = "";
      if (userId && acceptedOffer.offer.offer_date && acceptedOffer.offer.time_start) {
        try {
          const { data: penaltyData, error: penaltyError } = await supabase.rpc(
            "apply_arrival_delay_penalty_v2" as any,
            {
              p_user_id: userId,
              p_offer_id: acceptedOffer.offer.id,
              p_offer_date: acceptedOffer.offer.offer_date,
              p_time_start: acceptedOffer.offer.time_start,
            }
          );
          
          if (penaltyError) {
            console.error("Erro ao calcular penalidade:", penaltyError);
          } else {
            const resultData = penaltyData as any;
            if (resultData && resultData.length > 0 && resultData[0].applied) {
              const penalty = resultData[0];
              penaltyMessage = `\n⚠️ ${penalty.penalty_reason}: -${penalty.penalty_xp} XP`;
              console.log("Penalidade aplicada:", penalty);
              
              // Send push notification to motoboy about delay penalty
              supabase.functions.invoke("notify-penalty", {
                body: {
                  user_id: userId,
                  penalty_type: "delay",
                  xp_amount: penalty.penalty_xp,
                  reason: penalty.penalty_reason,
                },
              }).then((result) => {
                console.log("Delay penalty notification sent:", result);
              }).catch((err) => {
                console.error("Error sending delay penalty notification:", err);
              });
              
              // Haptic feedback for penalty
              if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
              }
            }
          }
        } catch (penaltyErr) {
          console.error("Erro ao aplicar penalidade:", penaltyErr);
        }
      }
      
      // Notify restaurant about motoboy arrival
      if (acceptedOffer.offer.created_by) {
        try {
          const { error: notifyError } = await supabase.functions.invoke("notify-motoboy-arrived", {
            body: {
              offer_id: acceptedOffer.offer.id,
              motoboy_name: motoboyName,
              restaurant_user_id: acceptedOffer.offer.created_by,
            },
          });
          
          if (notifyError) {
            console.error("Erro ao notificar restaurante:", notifyError);
          } else {
            console.log("Restaurante notificado sobre chegada");
          }
        } catch (notifyErr) {
          console.error("Erro ao chamar função de notificação:", notifyErr);
        }
      }
      
      toast({
        title: penaltyMessage ? "Check-in realizado com atraso" : "Check-in realizado!",
        description: penaltyMessage 
          ? `Sua chegada foi confirmada.${penaltyMessage}` 
          : "Sua chegada foi confirmada com sucesso.",
        variant: penaltyMessage ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Erro ao confirmar chegada:", error);
      toast({
        title: "Erro",
        description: "Não foi possível confirmar sua chegada. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setArrivingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      {/* Cancel Confirmation Dialog with Penalty Warning */}
      <AlertDialog open={!!offerToCancel} onOpenChange={(open) => !open && setOfferToCancel(null)}>
        <AlertDialogContent className="z-[1000]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" />
              Cancelar Extra
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Tem certeza que deseja cancelar o extra em{" "}
                  <span className="font-semibold">{offerToCancel?.offer.restaurant_name}</span>?
                </p>
                
                {offerToCancel && (() => {
                  const minutesUntilStart = Math.floor(getMinutesUntilStart(offerToCancel.offer));
                  const penaltyInfo = getPenaltyInfo(minutesUntilStart);
                  const hoursUntilStart = Math.floor(minutesUntilStart / 60);
                  const minsUntilStart = Math.floor(minutesUntilStart % 60);
                  
                  return (
                    <div className={`p-3 rounded-lg border ${
                      penaltyInfo.severity === 'critical' 
                        ? 'bg-destructive/10 border-destructive/30' 
                        : penaltyInfo.severity === 'medium'
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                      <p className="font-semibold text-foreground mb-1">
                        ⚠️ Penalidade: -{penaltyInfo.xp} XP
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Faltam {hoursUntilStart}h{minsUntilStart > 0 ? ` ${minsUntilStart}min` : ''} para o início.
                        {penaltyInfo.severity === 'critical' && (
                          <span className="block mt-1 text-destructive font-medium">
                            Cancelamentos de última hora impactam muito os restaurantes!
                          </span>
                        )}
                      </p>
                    </div>
                  );
                })()}
                
                <p className="text-sm">
                  Esta ação fará o extra voltar a ficar disponível para outros motoboys.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Extras Aceitos</h1>
        </div>
      </header>

      {/* Ofertas Aceitas */}
      <div className="p-4 space-y-4 pb-28">
        {acceptedOffers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Você ainda não aceitou nenhum extra.</p>
              <Button className="mt-4" onClick={() => navigate("/home")}>
                Ver Ofertas Disponíveis
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Offers Section */}
            {activeOffers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Em Andamento ({activeOffers.length})
                </h2>
                {activeOffers.map((acceptedOffer) => (
                  <Card key={acceptedOffer.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{acceptedOffer.offer.restaurant_name}</CardTitle>
                            {getStatusBadge(acceptedOffer.status, false)}
                          </div>
                          <CardDescription className="font-medium">
                            {acceptedOffer.offer.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{acceptedOffer.offer.address}</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                        <Clock className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {acceptedOffer.offer.offer_date 
                              ? new Date(acceptedOffer.offer.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                              : 'Data não informada'}
                          </span>
                          <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                            {acceptedOffer.offer.time_start} até {acceptedOffer.offer.time_end}
                          </span>
                        </div>
                        {acceptedOffer.offer.radius && (
                          <Badge variant="outline" className="ml-auto bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-xs">
                            {acceptedOffer.offer.radius} km
                          </Badge>
                        )}
                      </div>

                      {acceptedOffer.offer.delivery_range && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>Raio: {acceptedOffer.offer.delivery_range}</span>
                        </div>
                      )}

                      {acceptedOffer.offer.delivery_quantity && (
                        <div className="flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span>Entregas: {acceptedOffer.offer.delivery_quantity}</span>
                        </div>
                      )}

                      {acceptedOffer.offer.payment && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium">Pagamento: {formatPayment(acceptedOffer.offer.payment)}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {acceptedOffer.offer.delivery_range && (
                          <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600 border-teal-500/30">
                            📍 {acceptedOffer.offer.delivery_range}
                          </Badge>
                        )}
                        {acceptedOffer.offer.delivery_quantity && (
                          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600 border-indigo-500/30">
                            📦 {acceptedOffer.offer.delivery_quantity}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ${acceptedOffer.offer.needs_bag ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-green-500/10 text-green-600 border-green-500/30'}`}>
                          {acceptedOffer.offer.needs_bag ? '🎒 Precisa de bag' : '✓ Não precisa de bag'}
                        </Badge>
                        {acceptedOffer.offer.can_become_permanent && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                            💼 Possibilidade de fixo
                          </Badge>
                        )}
                        {acceptedOffer.offer.includes_meal && (
                          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                            🍔 Direito a lanche
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center text-sm pt-2 border-t">
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{acceptedOffer.offer.rating}</span>
                        <span className="text-muted-foreground ml-1">({acceptedOffer.offer.review_count})</span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Aceito em: {new Date(acceptedOffer.accepted_at).toLocaleString("pt-BR")}
                      </p>

                      {/* Location Map */}
                      <OfferLocationMap
                        address={acceptedOffer.offer.address}
                        lat={acceptedOffer.offer.lat}
                        lng={acceptedOffer.offer.lng}
                        restaurantName={acceptedOffer.offer.restaurant_name}
                        offerId={acceptedOffer.offer.id}
                      />

                      {/* Contact Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t">
                        {acceptedOffer.offer.phone && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => window.open(`tel:${acceptedOffer.offer.phone}`, "_blank")}
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Ligar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                              onClick={() => {
                                const phone = acceptedOffer.offer.phone?.replace(/\D/g, '');
                                window.open(`https://wa.me/55${phone}`, "_blank");
                              }}
                            >
                              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              WhatsApp
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant={unreadCounts[acceptedOffer.offer.id] > 0 ? "default" : "outline"}
                          className={`relative ${acceptedOffer.offer.phone ? '' : 'flex-1'}`}
                          onClick={() => setChatOffer(acceptedOffer)}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                          {unreadCounts[acceptedOffer.offer.id] > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse"
                            >
                              {unreadCounts[acceptedOffer.offer.id]}
                            </Badge>
                          )}
                        </Button>
                      </div>

                      {acceptedOffer.status === "pending" && (() => {
                        const arrivalStatus = getArrivalStatus(acceptedOffer.offer);
                        
                        return (
                          <div className="space-y-3 mt-3">
                            {/* Botão CHEGUEI */}
                            <Button
                              size="lg"
                              className={`w-full h-14 text-lg font-bold transition-all duration-300 ${
                                arrivalStatus.isEnabled
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/30 animate-shake-urgent'
                                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                              }`}
                              disabled={!arrivalStatus.isEnabled || arrivingId === acceptedOffer.id}
                              onClick={() => handleArrival(acceptedOffer)}
                            >
                              {arrivingId === acceptedOffer.id ? (
                                <>
                                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                  Confirmando...
                                </>
                              ) : arrivalStatus.isEnabled ? (
                                <>
                                  <MapPinCheck className="w-6 h-6 mr-2" />
                                  🔔 CHEGUEI
                                </>
                              ) : (
                                <>
                                  <MapPinCheck className="w-6 h-6 mr-2 opacity-50" />
                                  CHEGUEI
                                </>
                              )}
                            </Button>
                            
                            {/* Status indicators */}
                            {!arrivalStatus.isEnabled && (
                              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/50 border border-border">
                                <div className="flex items-center gap-2 text-xs">
                                  <Clock className={`w-4 h-4 ${arrivalStatus.isTimeOk ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                  <span className={arrivalStatus.isTimeOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>
                                    {arrivalStatus.isTimeOk 
                                      ? '✓ Horário liberado' 
                                      : 'Aguarde até 30min antes do início'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <Navigation className={`w-4 h-4 ${arrivalStatus.isLocationOk ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                  <span className={arrivalStatus.isLocationOk ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}>
                                    {arrivalStatus.locationError 
                                      ? arrivalStatus.locationError
                                      : !arrivalStatus.hasUserLocation
                                        ? 'Ativando GPS...'
                                        : !arrivalStatus.hasLocation
                                          ? 'Localização do extra indisponível'
                                          : arrivalStatus.isLocationOk
                                            ? '✓ Você está no local'
                                            : `Você está a ${arrivalStatus.distance?.toFixed(1)} km do local (máx 1km)`}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Other action buttons */}
                            <div className="flex gap-2">
                              {/* Show rating button for restaurant offers */}
                              {acceptedOffer.offer.offer_type !== 'motoboy' && !acceptedOffer.has_rating && acceptedOffer.offer.created_by && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedOffer(acceptedOffer);
                                    setRatingModalOpen(true);
                                  }}
                                >
                                  <Star className="w-4 h-4 mr-2" />
                                  Avaliar Restaurante
                                </Button>
                              )}
                              {/* Show rating button for motoboy offers with external restaurant */}
                              {acceptedOffer.offer.offer_type === 'motoboy' && !acceptedOffer.has_external_rating && acceptedOffer.offer.external_restaurant_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    setSelectedOffer(acceptedOffer);
                                    setRatingModalOpen(true);
                                  }}
                                >
                                  <Star className="w-4 h-4 mr-2" />
                                  Avaliar Estabelecimento
                                </Button>
                              )}
                              {/* Show "Avaliado" badge for restaurant offers */}
                              {acceptedOffer.offer.offer_type !== 'motoboy' && acceptedOffer.has_rating && (
                                <Badge variant="secondary" className="gap-1 flex-1 justify-center py-2">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  Avaliado
                                </Badge>
                              )}
                              {/* Show "Avaliado" badge for motoboy offers */}
                              {acceptedOffer.offer.offer_type === 'motoboy' && acceptedOffer.has_external_rating && (
                                <Badge variant="secondary" className="gap-1 flex-1 justify-center py-2">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  Avaliado
                                </Badge>
                              )}
                              {(() => {
                                const minutesLeft = getMinutesUntilStart(acceptedOffer.offer);
                                const penaltyInfo = getPenaltyInfo(minutesLeft);
                                
                                return (
                                  <div className="flex-1 relative group">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => setOfferToCancel(acceptedOffer)}
                                      disabled={cancellingId === acceptedOffer.id}
                                    >
                                      {cancellingId === acceptedOffer.id ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                          Cancelando...
                                        </>
                                      ) : (
                                        <>
                                          <X className="w-4 h-4 mr-2" />
                                          Cancelar (-{penaltyInfo.xp} XP)
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Completed Offers Section */}
            {completedOffers.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Concluídos ({completedOffers.length})
                </h2>
                {completedOffers.map((acceptedOffer) => (
                  <Card key={acceptedOffer.id} className="opacity-80">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg text-muted-foreground">{acceptedOffer.offer.restaurant_name}</CardTitle>
                            {getStatusBadge(acceptedOffer.status, true)}
                          </div>
                          <CardDescription className="font-medium">
                            {acceptedOffer.offer.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{acceptedOffer.offer.address}</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
                        <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">
                            {acceptedOffer.offer.offer_date 
                              ? new Date(acceptedOffer.offer.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                              : 'Data não informada'}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {acceptedOffer.offer.time_start} até {acceptedOffer.offer.time_end}
                          </span>
                        </div>
                      </div>

                      {acceptedOffer.offer.payment && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">Pagamento: {formatPayment(acceptedOffer.offer.payment)}</p>
                        </div>
                      )}

                      <div className="flex items-center text-sm pt-2 border-t">
                        <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{acceptedOffer.offer.rating}</span>
                        <span className="text-muted-foreground ml-1">({acceptedOffer.offer.review_count})</span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Aceito em: {new Date(acceptedOffer.accepted_at).toLocaleString("pt-BR")}
                      </p>

                      {/* Action buttons for completed offers */}
                      <div className="flex items-center gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setChatOffer(acceptedOffer)}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Ver Chat
                        </Button>
                        {/* Show rating button for restaurant offers */}
                        {acceptedOffer.offer.offer_type !== 'motoboy' && !acceptedOffer.has_rating && acceptedOffer.offer.created_by && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedOffer(acceptedOffer);
                              setRatingModalOpen(true);
                            }}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Avaliar
                          </Button>
                        )}
                        {/* Show rating button for motoboy offers with external restaurant */}
                        {acceptedOffer.offer.offer_type === 'motoboy' && !acceptedOffer.has_external_rating && acceptedOffer.offer.external_restaurant_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedOffer(acceptedOffer);
                              setRatingModalOpen(true);
                            }}
                          >
                            <Star className="w-4 h-4 mr-1" />
                            Avaliar
                          </Button>
                        )}
                        {/* Show "Avaliado" badge for restaurant offers */}
                        {acceptedOffer.offer.offer_type !== 'motoboy' && acceptedOffer.has_rating && (
                          <Badge variant="secondary" className="gap-1 flex-1 justify-center py-2">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            Avaliado
                          </Badge>
                        )}
                        {/* Show "Avaliado" badge for motoboy offers */}
                        {acceptedOffer.offer.offer_type === 'motoboy' && acceptedOffer.has_external_rating && (
                          <Badge variant="secondary" className="gap-1 flex-1 justify-center py-2">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            Avaliado
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex items-center justify-around p-2">
          <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => navigate("/home")}>
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Ofertas</span>
          </Button>
          <Button variant="default" className="flex-col h-auto py-2">
            <Clock className="w-5 h-5 mb-1 fill-current" />
            <span className="text-xs">Extras Aceitos</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2" onClick={() => navigate("/ranking")}>
            <Star className="w-5 h-5 mb-1" />
            <span className="text-xs">Ranking</span>
          </Button>
        </div>
      </nav>
      </div>

      {/* Rating Modal - for restaurant offers */}
      {selectedOffer && userId && selectedOffer.offer.offer_type !== 'motoboy' && (
        <RateRestaurantModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          offerId={selectedOffer.offer.id}
          restaurantId={selectedOffer.offer.created_by || ""}
          restaurantName={selectedOffer.offer.restaurant_name}
          motoboyId={userId}
          onRatingComplete={() => {
            setAcceptedOffers(current =>
              current.map(ao =>
                ao.id === selectedOffer.id ? { ...ao, has_rating: true } : ao
              )
            );
            setSelectedOffer(null);
          }}
        />
      )}

      {/* Rating Modal - for motoboy offers (external restaurants) */}
      {selectedOffer && userId && selectedOffer.offer.offer_type === 'motoboy' && selectedOffer.offer.external_restaurant_id && (
        <RateExternalRestaurantModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          offerId={selectedOffer.offer.id}
          externalRestaurantId={selectedOffer.offer.external_restaurant_id}
          restaurantName={selectedOffer.offer.restaurant_name}
          motoboyId={userId}
          onRatingComplete={() => {
            setAcceptedOffers(current =>
              current.map(ao =>
                ao.id === selectedOffer.id ? { ...ao, has_external_rating: true } : ao
              )
            );
            setSelectedOffer(null);
          }}
        />
      )}

      {/* Chat Modal */}
      {chatOffer && userId && (
        <ChatModal
          open={!!chatOffer}
          onOpenChange={(open) => !open && setChatOffer(null)}
          offerId={chatOffer.offer.id}
          userId={userId}
          senderType="motoboy"
          contactName={chatOffer.offer.restaurant_name}
          contactPhone={chatOffer.offer.phone}
        />
      )}
    </>
  );
};

export default AcceptedOffers;
