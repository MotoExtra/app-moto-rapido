import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  motoboy_name?: string;
}

interface RestaurantRatingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  restaurantName: string;
}

export function RestaurantRatingsModal({
  open,
  onOpenChange,
  restaurantId,
  restaurantName,
}: RestaurantRatingsModalProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  useEffect(() => {
    if (open && restaurantId) {
      fetchRatings();
    }
  }, [open, restaurantId]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          id,
          rating,
          comment,
          created_at,
          motoboy_id
        `)
        .eq("restaurant_id", restaurantId)
        .eq("rating_type", "motoboy_to_restaurant")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch motoboy names
        const motoboyIds = [...new Set(data.filter(r => r.motoboy_id).map(r => r.motoboy_id))];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", motoboyIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

        const ratingsWithNames = data.map(r => ({
          ...r,
          motoboy_name: r.motoboy_id ? profileMap.get(r.motoboy_id) || "Motoboy" : "Motoboy"
        }));

        setRatings(ratingsWithNames);
        
        // Calculate average
        const avg = data.reduce((acc, r) => acc + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setRatings([]);
        setAverageRating(null);
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-amber-500 text-amber-500"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Avaliações de {restaurantName}
          </DialogTitle>
          {averageRating !== null && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/10">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span className="font-bold text-amber-600 text-lg">{averageRating}</span>
              </div>
              <span className="text-muted-foreground text-sm">
                ({ratings.length} {ratings.length === 1 ? "avaliação" : "avaliações"})
              </span>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[400px] mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma avaliação encontrada.
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  className="p-4 rounded-xl bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{rating.motoboy_name}</span>
                    {renderStars(rating.rating)}
                  </div>
                  {rating.comment && (
                    <p className="text-sm text-foreground/80">{rating.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(rating.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
