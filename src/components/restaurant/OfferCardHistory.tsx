import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, 
  MapPin, 
  Star,
  CheckCircle,
  Copy
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Offer {
  id: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  offer_date?: string | null;
  motoboy_name?: string;
  motoboy_avatar_url?: string | null;
  motoboy_rating?: number;
  motoboy_review_count?: number;
  has_rating?: boolean;
  payment?: string | null;
  accepted_by?: string | null;
}

interface OfferCardHistoryProps {
  offer: Offer;
  onRateClick: () => void;
}

const formatTime = (time: string) => time.slice(0, 5);

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

export const OfferCardHistory = ({ offer, onRateClick }: OfferCardHistoryProps) => {
  const navigate = useNavigate();

  const handleDuplicate = () => {
    // Navigate to create extra with prefilled data
    navigate("/restaurante/criar-extra", {
      state: {
        duplicate: {
          description: offer.description,
          address: offer.address,
          time_start: offer.time_start,
          time_end: offer.time_end,
          payment: offer.payment
        }
      }
    });
  };

  return (
    <Card className="overflow-hidden bg-muted/30 border-muted">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-muted-foreground truncate">{offer.description}</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-0">
                <CheckCircle className="w-3 h-3 mr-0.5" />
                Concluído
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(offer.time_start)} - {formatTime(offer.time_end)}
              </span>
              {offer.offer_date && (
                <span>{formatDate(offer.offer_date)}</span>
              )}
              {offer.payment && (
                <span className="text-emerald-600">{offer.payment}</span>
              )}
            </div>
          </div>
        </div>

        {/* Motoboy Info */}
        {offer.accepted_by && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={offer.motoboy_avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {offer.motoboy_name?.charAt(0).toUpperCase() || "M"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{offer.motoboy_name}</p>
                {offer.motoboy_rating !== undefined && offer.motoboy_review_count && offer.motoboy_review_count > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {offer.motoboy_rating}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!offer.has_rating && (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={onRateClick}
                  className="text-xs"
                >
                  <Star className="w-3 h-3 mr-1" />
                  Avaliar
                </Button>
              )}
              
              {offer.has_rating && (
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                  <Star className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" />
                  Avaliado
                </Badge>
              )}
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleDuplicate}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Duplicar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
