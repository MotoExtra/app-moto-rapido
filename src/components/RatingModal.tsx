import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RatingTagSelector from "./RatingTagSelector";

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  motoboyId: string;
  motoboyName: string;
  restaurantId: string;
  onRatingComplete: () => void;
}

const RatingModal = ({
  open,
  onOpenChange,
  offerId,
  motoboyId,
  motoboyName,
  restaurantId,
  onRatingComplete,
}: RatingModalProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Avaliação necessária",
        description: "Por favor, selecione uma nota de 1 a 5 estrelas.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

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
          rating_type: "restaurant_to_motoboy",
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
        title: "Avaliação enviada",
        description: "Obrigado por avaliar o motoboy!",
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
        description: "Não foi possível enviar a avaliação.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Motoboy</DialogTitle>
          <DialogDescription>
            Como foi a experiência com {motoboyName}?
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Esta avaliação será visível apenas para outros restaurantes
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {rating === 0 && "Selecione uma nota"}
              {rating === 1 && "Muito ruim"}
              {rating === 2 && "Ruim"}
              {rating === 3 && "Regular"}
              {rating === 4 && "Bom"}
              {rating === 5 && "Excelente"}
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Selecione tags (opcional)
            </label>
            <RatingTagSelector
              applicableTo="motoboy"
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
            />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comentário (opcional)
            </label>
            <Textarea
              placeholder="Deixe um comentário sobre o serviço..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Avaliação"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
