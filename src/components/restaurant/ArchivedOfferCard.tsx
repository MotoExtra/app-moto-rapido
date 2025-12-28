import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle,
  XCircle,
  Calendar
} from "lucide-react";

interface ArchivedOffer {
  id: string;
  original_offer_id: string;
  restaurant_name: string;
  offer_date: string | null;
  time_start: string;
  time_end: string;
  city: string | null;
  payment: string | null;
  was_accepted: boolean;
  accepted_by_name: string | null;
  archived_at: string;
  offer_type: string | null;
}

interface ArchivedOfferCardProps {
  offer: ArchivedOffer;
}

const formatTime = (time: string) => time.slice(0, 5);

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const ArchivedOfferCard = ({ offer }: ArchivedOfferCardProps) => {
  return (
    <Card className="overflow-hidden bg-muted/30 border-muted">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium text-muted-foreground truncate">
                {offer.restaurant_name}
              </h3>
              {offer.was_accepted ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-0">
                  <CheckCircle className="w-3 h-3 mr-0.5" />
                  Concluído
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-0">
                  <XCircle className="w-3 h-3 mr-0.5" />
                  Não aceito
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(offer.offer_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(offer.time_start)} - {formatTime(offer.time_end)}
              </span>
              {offer.payment && (
                <span className="text-emerald-600 font-medium">{offer.payment}</span>
              )}
            </div>
          </div>
        </div>

        {/* Motoboy Info */}
        {offer.was_accepted && offer.accepted_by_name && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium">
              {offer.accepted_by_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{offer.accepted_by_name}</p>
              <p className="text-xs text-muted-foreground">Motoboy</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
