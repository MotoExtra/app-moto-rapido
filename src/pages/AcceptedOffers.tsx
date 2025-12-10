import { useEffect, useState } from "react";
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
import { Clock, MapPin, Package, Star, ArrowLeft, Phone, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RateRestaurantModal from "@/components/RateRestaurantModal";

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
    radius: number;
    needs_bag: boolean;
    delivery_range: string;
    experience: string | null;
    rating: number;
    review_count: number;
    phone: string | null;
    payment: string | null;
    created_by: string | null;
  };
  has_rating?: boolean;
}

const AcceptedOffers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [acceptedOffers, setAcceptedOffers] = useState<AcceptedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [offerToCancel, setOfferToCancel] = useState<AcceptedOffer | null>(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<AcceptedOffer | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
          navigate("/login");
          return;
        }

        setUserId(user.id);

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
              radius,
              needs_bag,
              delivery_range,
              experience,
              rating,
              review_count,
              phone,
              payment,
              created_by
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
        navigate("/login");
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
        <AlertDialogContent>
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

                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    {acceptedOffer.offer.time_start} até {acceptedOffer.offer.time_end} • Raio de{" "}
                    {acceptedOffer.offer.radius} km
                  </span>
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>Faz {acceptedOffer.offer.delivery_range}</span>
                </div>

                {acceptedOffer.offer.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{acceptedOffer.offer.phone}</span>
                  </div>
                )}

                {acceptedOffer.offer.payment && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium">Pagamento: {acceptedOffer.offer.payment}</p>
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

                {acceptedOffer.status === "pending" && (
                  <div className="flex gap-2 mt-3">
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
                )}
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
    </>
  );
};

export default AcceptedOffers;
