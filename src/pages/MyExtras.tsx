import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Clock, Loader2, Pencil, Trash2, Plus, Bike, MapPin, Star, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RateMotoboyModal from "@/components/RateMotoboyModal";
import { isRatingPromptTime, hasShownRatingPrompt, markRatingPromptShown } from "@/lib/ratingPrompt";
import type { User } from "@supabase/supabase-js";

interface MyOffer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  is_accepted: boolean;
  offer_date?: string;
  accepted_by?: string;
  created_by?: string;
}

interface AcceptedInfo {
  user_id: string;
  status: string;
  profile?: { name: string };
}

const MyExtras = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [myOffers, setMyOffers] = useState<MyOffer[]>([]);
  const [acceptedInfoMap, setAcceptedInfoMap] = useState<Record<string, AcceptedInfo>>({});
  const [ratedOffers, setRatedOffers] = useState<Set<string>>(new Set());
  
  // Rating modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    offerId: string;
    motoboyId: string;
    motoboyName: string;
  } | null>(null);

  const fetchMyOffers = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("id, restaurant_name, description, address, time_start, time_end, is_accepted, offer_date, accepted_by, created_by")
        .eq("created_by", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const offers = data || [];
      setMyOffers(offers);

      // Fetch accepted offer info for accepted offers
      const acceptedOfferIds = offers.filter(o => o.is_accepted && o.accepted_by).map(o => o.id);
      
      if (acceptedOfferIds.length > 0) {
        const { data: acceptedData } = await supabase
          .from("accepted_offers")
          .select("offer_id, user_id, status")
          .in("offer_id", acceptedOfferIds);

        const infoMap: Record<string, AcceptedInfo> = {};
        
        if (acceptedData && acceptedData.length > 0) {
          // Fetch profile names
          const userIds = [...new Set(acceptedData.map(a => a.user_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", userIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

          for (const ao of acceptedData) {
            infoMap[ao.offer_id] = {
              user_id: ao.user_id,
              status: ao.status || 'pending',
              profile: { name: profileMap.get(ao.user_id) || 'Motoboy' },
            };
          }
        }

        setAcceptedInfoMap(infoMap);

        // Check which offers already have ratings from this user
        const completedOfferIds = acceptedData
          ?.filter(a => a.status === 'completed')
          .map(a => a.offer_id) || [];

        if (completedOfferIds.length > 0) {
          const { data: existingRatings } = await supabase
            .from("ratings")
            .select("offer_id")
            .in("offer_id", completedOfferIds)
            .eq("restaurant_id", userId)
            .eq("rating_type", "restaurant_to_motoboy");

          if (existingRatings) {
            setRatedOffers(new Set(existingRatings.map(r => r.offer_id)));
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar meus extras:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus extras.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login/motoboy");
        return;
      }

      setUser(user);
      await fetchMyOffers(user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate("/login/motoboy");
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate, fetchMyOffers]);

  // Auto-trigger rating modal for completed offers
  useEffect(() => {
    if (!user || myOffers.length === 0) return;

    for (const offer of myOffers) {
      const info = acceptedInfoMap[offer.id];
      if (!info || info.status !== 'completed') continue;
      if (ratedOffers.has(offer.id)) continue;
      if (hasShownRatingPrompt(offer.id, 'restaurant')) continue;
      if (!isRatingPromptTime(offer.offer_date || null, offer.time_end)) continue;

      // Auto-open rating modal
      setRatingTarget({
        offerId: offer.id,
        motoboyId: info.user_id,
        motoboyName: info.profile?.name || 'Motoboy',
      });
      setRatingModalOpen(true);
      markRatingPromptShown(offer.id, 'restaurant');
      break;
    }
  }, [user, myOffers, acceptedInfoMap, ratedOffers]);

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este extra?")) return;

    try {
      const { error } = await supabase
        .from("offers")
        .delete()
        .eq("id", offerId);

      if (error) throw error;

      setMyOffers((current) => current.filter((o) => o.id !== offerId));

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

  const handleOpenRating = (offer: MyOffer) => {
    const info = acceptedInfoMap[offer.id];
    if (!info) return;

    setRatingTarget({
      offerId: offer.id,
      motoboyId: info.user_id,
      motoboyName: info.profile?.name || 'Motoboy',
    });
    setRatingModalOpen(true);
  };

  const handleRatingComplete = () => {
    if (ratingTarget) {
      setRatedOffers(prev => new Set(prev).add(ratingTarget.offerId));
    }
    setRatingTarget(null);
  };

  const getOfferStatus = (offer: MyOffer) => {
    const info = acceptedInfoMap[offer.id];
    if (!offer.is_accepted) return 'available';
    if (!info) return 'accepted';
    return info.status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs flex-shrink-0">Concluído</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs flex-shrink-0">Em andamento</Badge>;
      case 'arrived':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/30 text-xs flex-shrink-0">Chegou</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-xs flex-shrink-0">Cancelado</Badge>;
      case 'accepted':
      case 'pending':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs flex-shrink-0">Aceito</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs flex-shrink-0">Disponível</Badge>;
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
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-blue-500/10 via-background to-blue-500/5 border-b shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/home")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Extras Ofertados</h1>
              </div>
            </div>
            <Button
              onClick={() => navigate("/ofertar-extra")}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo Extra
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {myOffers.length === 0 ? (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-blue-500/5">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Você ainda não criou nenhum extra</p>
                <p className="text-sm mt-1">Oferte extras para outros motoboys!</p>
                <Button
                  onClick={() => navigate("/ofertar-extra")}
                  className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Extra
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground px-1">
              {myOffers.length} extra{myOffers.length !== 1 ? 's' : ''} criado{myOffers.length !== 1 ? 's' : ''}
            </p>
            
            {myOffers.map((offer) => {
              const status = getOfferStatus(offer);
              const info = acceptedInfoMap[offer.id];
              const isCompleted = status === 'completed';
              const alreadyRated = ratedOffers.has(offer.id);
              const canRate = isCompleted && !alreadyRated && info;

              return (
                <Card
                  key={offer.id}
                  className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-card via-card to-blue-500/5"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-base truncate">{offer.restaurant_name}</h4>
                          {getStatusBadge(status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{offer.description}</p>

                        {/* Show who accepted */}
                        {info && (
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Bike className="w-3 h-3" />
                            Aceito por <span className="font-medium text-foreground">{info.profile?.name}</span>
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5" />
                            {offer.time_start} - {offer.time_end}
                          </span>
                          <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-lg truncate max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{offer.address}</span>
                          </span>
                        </div>

                        {/* Rating button for completed offers */}
                        {canRate && (
                          <Button
                            onClick={() => handleOpenRating(offer)}
                            size="sm"
                            className="mt-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-white gap-1.5"
                          >
                            <Star className="w-4 h-4" />
                            Avaliar {info.profile?.name}
                          </Button>
                        )}

                        {isCompleted && alreadyRated && (
                          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Avaliação enviada</span>
                          </div>
                        )}
                      </div>
                      
                      {!isCompleted && status !== 'cancelled' && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {status === 'available' && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600"
                                onClick={() => navigate(`/editar-extra/${offer.id}`)}
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                                onClick={() => handleDeleteOffer(offer.id)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {ratingTarget && user && (
        <RateMotoboyModal
          open={ratingModalOpen}
          onOpenChange={setRatingModalOpen}
          offerId={ratingTarget.offerId}
          motoboyId={ratingTarget.motoboyId}
          motoboyName={ratingTarget.motoboyName}
          ratingUserId={user.id}
          onRatingComplete={handleRatingComplete}
        />
      )}
    </div>
  );
};

export default MyExtras;
