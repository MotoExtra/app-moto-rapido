import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RateRestaurantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  restaurantId: string;
  restaurantName: string;
  motoboyId: string;
  onRatingComplete: () => void;
}

const RateRestaurantModal = ({
  open,
  onOpenChange,
  offerId,
  restaurantId,
  restaurantName,
  motoboyId,
  onRatingComplete,
}: RateRestaurantModalProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma avaliação.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("ratings").insert({
        offer_id: offerId,
        restaurant_id: restaurantId,
        motoboy_id: motoboyId,
        rating,
        comment: comment.trim() || null,
        rating_type: "motoboy_to_restaurant",
      });

      if (error) throw error;

      toast({
        title: "Avaliação enviada!",
        description: "Obrigado por avaliar este restaurante.",
      });

      onRatingComplete();
      onOpenChange(false);
      setRating(0);
      setComment("");
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a avaliação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[1000]">
        <DialogHeader>
          <DialogTitle>Avaliar Restaurante</DialogTitle>
          <DialogDescription>
            Como foi sua experiência com <span className="font-semibold">{restaurantName}</span>?
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Esta avaliação será visível apenas para outros motoboys
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Deixe um comentário sobre sua experiência (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px]"
            maxLength={500}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateRestaurantModal;
