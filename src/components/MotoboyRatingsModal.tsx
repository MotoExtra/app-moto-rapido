import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  restaurant_name?: string;
}

interface MotoboyRatingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoboyId: string;
  motoboyName: string;
  motoboyAvatarUrl?: string | null;
}

export function MotoboyRatingsModal({
  open,
  onOpenChange,
  motoboyId,
  motoboyName,
  motoboyAvatarUrl,
}: MotoboyRatingsModalProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number | null>(null);

  useEffect(() => {
    if (open && motoboyId) {
      fetchRatings();
    }
  }, [open, motoboyId]);

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
          restaurant_id
        `)
        .eq("motoboy_id", motoboyId)
        .eq("rating_type", "restaurant_to_motoboy")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch restaurant names
        const restaurantIds = [...new Set(data.map(r => r.restaurant_id))];
        
        const { data: restaurants } = await supabase
          .from("restaurants")
          .select("id, fantasy_name")
          .in("id", restaurantIds);

        const restaurantMap = new Map(restaurants?.map(r => [r.id, r.fantasy_name]) || []);

        const ratingsWithNames = data.map(r => ({
          ...r,
          restaurant_name: restaurantMap.get(r.restaurant_id) || "Restaurante"
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
      console.error("Error fetching motoboy ratings:", error);
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
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={motoboyAvatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {motoboyName?.charAt(0).toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">
                {motoboyName}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Avaliações de restaurantes</p>
            </div>
          </div>
          {averageRating !== null && (
            <div className="flex items-center gap-2 mt-3">
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
              Este motoboy ainda não recebeu avaliações de restaurantes.
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  className="p-4 rounded-xl bg-muted/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{rating.restaurant_name}</span>
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
