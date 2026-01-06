import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, User, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  motoboy: {
    name: string;
    avatar_url: string | null;
  } | null;
}

interface ExternalRestaurantRatingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  externalRestaurantId: string;
  restaurantName: string;
  avgRating: number;
  reviewCount: number;
}

const ExternalRestaurantRatingsModal = ({
  open,
  onOpenChange,
  externalRestaurantId,
  restaurantName,
  avgRating,
  reviewCount,
}: ExternalRestaurantRatingsModalProps) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!open || !externalRestaurantId) return;
      
      setLoading(true);
      try {
        // Fetch ratings first
        const { data: ratingsData, error: ratingsError } = await supabase
          .from("external_restaurant_ratings")
          .select("id, rating, comment, created_at, motoboy_id")
          .eq("external_restaurant_id", externalRestaurantId)
          .order("created_at", { ascending: false });

        if (ratingsError) throw ratingsError;

        if (!ratingsData || ratingsData.length === 0) {
          setRatings([]);
          setLoading(false);
          return;
        }

        // Fetch profiles for all motoboys
        const motoboyIds = ratingsData.map(r => r.motoboy_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", motoboyIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const enrichedRatings: Rating[] = ratingsData.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          motoboy: profilesMap.get(r.motoboy_id) || null,
        }));

        setRatings(enrichedRatings);
      } catch (error) {
        console.error("Erro ao buscar avaliações:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [open, externalRestaurantId]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[1000] max-h-[80vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">
            Avaliações de {restaurantName}
          </DialogTitle>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {reviewCount} {reviewCount === 1 ? "avaliação" : "avaliações"}
            </span>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : ratings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p>Nenhuma avaliação ainda</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  className="p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {rating.motoboy?.avatar_url ? (
                        <img
                          src={rating.motoboy.avatar_url}
                          alt={rating.motoboy.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {rating.motoboy?.name || "Motoboy"}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(rating.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="mt-1">
                        {renderStars(rating.rating)}
                      </div>
                      {rating.comment && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {rating.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExternalRestaurantRatingsModal;
