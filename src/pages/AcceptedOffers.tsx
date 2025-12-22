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
import OfferLocationMap from "@/components/OfferLocationMap";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLiveLocationBroadcast } from "@/hooks/useLiveLocationBroadcast";
import { isWithinRadius, isWithinTimeWindow, calculateDistance } from "@/lib/distance";
import { ChatModal } from "@/components/ChatModal";
import { useUnreadCounts } from "@/hooks/useChatMessages";
import { useNotificationSound } from "@/hooks/useNotificationSound";
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
  };
  has_rating?: boolean;
}

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
  
  // Find the active in_progress offer for live location broadcasting
  const activeInProgressOffer = useMemo(() => {
    return acceptedOffers.find(ao => ao.status === 'in_progress');
  }, [acceptedOffers]);
  
  // Broadcast live location when motoboy is in_progress
  useLiveLocationBroadcast({
    userId: userId,
    offerId: activeInProgressOffer?.offer.id || null,
    isActive: !!activeInProgressOffer,
    latitude: geolocation.latitude,
    longitude: geolocation.longitude,
    accuracy: geolocation.accuracy,
  });
  
  // Force re-render every minute to update time-based conditions
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

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
              lng
            )
          `)
          .order("accepted_at", { ascending: false });

        if (error) throw error;

        // Check which offers already have ratings from this motoboy
        const { data: ratingsData } = await supabase
          .from("ratings")
          .select("offer_id")
          .eq("motoboy_id", user.id)
          .eq("rating_type", "motoboy_to_restaurant");

        const ratedOfferIds = new Set(ratingsData?.map(r => r.offer_id) || []);

        const enrichedOffers = (data as AcceptedOffer[]).map(ao => ({
          ...ao,
          has_rating: ratedOfferIds.has(ao.offer.id)
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

  const handleConfirmCancel = async () => {
    if (!offerToCancel) return;
    
    setCancellingId(offerToCancel.id);

    try {
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
        .eq("id", offerToCancel.offer.id);

      if (updateError) throw updateError;

      // Remove from local state
      setAcceptedOffers((current) => current.filter((o) => o.id !== offerToCancel.id));

      toast({
        title: "Extra cancelado",
        description: "O extra foi cancelado e está disponível novamente.",
      });
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

  const getStatusBadge = (status: string) => {
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
        title: "Check-in realizado!",
        description: "Sua chegada foi confirmada com sucesso.",
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
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!offerToCancel} onOpenChange={(open) => !open && setOfferToCancel(null)}>
        <AlertDialogContent className="z-[1000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Extra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o extra em{" "}
              <span className="font-semibold">{offerToCancel?.offer.restaurant_name}</span>?
              <br /><br />
              Esta ação fará o extra voltar a ficar disponível para outros motoboys.
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
      <div className="p-4 space-y-4">
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
          acceptedOffers.map((acceptedOffer) => (
            <Card key={acceptedOffer.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{acceptedOffer.offer.restaurant_name}</CardTitle>
                      {getStatusBadge(acceptedOffer.status)}
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

                {acceptedOffer.offer.phone && (
                  <div className="flex items-center gap-2">
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
                      variant={unreadCounts[acceptedOffer.offer.id] > 0 ? "default" : "outline"}
                      className="flex-1 relative"
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

                {acceptedOffer.status === "pending" && (() => {
                  const arrivalStatus = getArrivalStatus(acceptedOffer.offer);
                  
                  return (
                    <div className="space-y-3 mt-3">
                      {/* Botão CHEGUEI */}
                      <Button
                        size="lg"
                        className={`w-full h-14 text-lg font-bold transition-all duration-300 ${
                          arrivalStatus.isEnabled
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/30 animate-pulse'
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
                            CHEGUEI
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
                        {!acceptedOffer.has_rating && acceptedOffer.offer.created_by && (
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
                        {acceptedOffer.has_rating && (
                          <Badge variant="secondary" className="gap-1 flex-1 justify-center py-2">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            Avaliado
                          </Badge>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
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
                              Cancelar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))
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

      {/* Rating Modal */}
      {selectedOffer && userId && (
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
