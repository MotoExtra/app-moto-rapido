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
import { Star, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import RatingTagSelector from "./RatingTagSelector";

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
      // Insert rating
      const { data: ratingData, error: ratingError } = await supabase
        .from("ratings")
        .insert({
          offer_id: offerId,
          restaurant_id: restaurantId,
          motoboy_id: motoboyId,
          rating,
          comment: comment.trim() || null,
          rating_type: "motoboy_to_restaurant",
        })
        .select("id")
        .single();

      if (ratingError) throw ratingError;

      // Insert tag selections
      if (selectedTags.length > 0 && ratingData) {
        const tagSelections = selectedTags.map((tagId) => ({
          rating_id: ratingData.id,
          tag_id: tagId,
        }));

        await supabase.from("rating_tag_selections" as any).insert(tagSelections as any);
      }

      toast({
        title: "Avaliação enviada!",
        description: "Obrigado por avaliar este restaurante.",
      });

      onRatingComplete();
      onOpenChange(false);
      setRating(0);
      setComment("");
      setSelectedTags([]);
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

  const getRatingLabel = (value: number) => {
    const labels = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"];
    return labels[value] || "";
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[1000] overflow-hidden">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-xl font-bold text-center">
            Avaliar Restaurante
          </DialogTitle>
          <DialogDescription className="text-center">
            Como foi sua experiência com{" "}
            <span className="font-semibold text-primary">{restaurantName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Stars Rating */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star, index) => (
                <motion.button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 focus:outline-none"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: index * 0.1, 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20 
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Star
                    className={`w-10 h-10 transition-all duration-200 ${
                      star <= displayRating
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                        : "text-muted-foreground/30 hover:text-muted-foreground/50"
                    }`}
                  />
                </motion.button>
              ))}
            </div>

            {/* Rating Label */}
            <AnimatePresence mode="wait">
              {displayRating > 0 && (
                <motion.div
                  key={displayRating}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    displayRating >= 4 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : displayRating >= 3 
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {getRatingLabel(displayRating)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tags */}
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <RatingTagSelector
              applicableTo="restaurant"
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </motion.div>

          {/* Comment Section */}
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Textarea
              placeholder="Deixe um comentário sobre sua experiência (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {comment.length}/500 caracteres
            </p>
          </motion.div>

          {/* Privacy Note */}
          <motion.p 
            className="text-xs text-muted-foreground text-center mt-4 bg-muted/50 rounded-lg p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Esta avaliação será visível apenas para outros motoboys
          </motion.p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="transition-all duration-200"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="gap-2 transition-all duration-200"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Avaliação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateRestaurantModal;
