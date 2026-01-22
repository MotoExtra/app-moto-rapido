import { motion } from "framer-motion";
import { 
  Clock, 
  MapPin, 
  Calendar,
  Pause,
  Play,
  Trash2,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RecurringOffer {
  id: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  days_of_week: number[];
  is_active: boolean;
  payment: string | null;
  includes_meal: boolean;
  delivery_range: string;
}

interface RecurringOfferCardProps {
  offer: RecurringOffer;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatTime = (time: string) => {
  return time.slice(0, 5);
};

const RecurringOfferCard = ({
  offer,
  onToggleActive,
  onDelete,
}: RecurringOfferCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <Card className={`p-4 ${!offer.is_active ? "opacity-60" : ""}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              offer.is_active 
                ? "bg-primary/10" 
                : "bg-muted"
            }`}>
              <RefreshCw className={`w-5 h-5 ${
                offer.is_active ? "text-primary" : "text-muted-foreground"
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">
                {offer.description}
              </h3>
              <Badge variant={offer.is_active ? "default" : "secondary"} className="text-xs">
                {offer.is_active ? "Ativo" : "Pausado"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Days of week */}
        <div className="flex gap-1 mb-3">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const isActive = offer.days_of_week.includes(day);
            return (
              <div
                key={day}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  ${isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {dayNames[day]}
              </div>
            );
          })}
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{formatTime(offer.time_start)} - {formatTime(offer.time_end)}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="line-clamp-1">{offer.address}</span>
          </div>

          {offer.payment && (
            <div className="flex items-center gap-2">
              <span className="text-primary font-semibold">{offer.payment}</span>
              {offer.includes_meal && (
                <Badge variant="secondary" className="text-xs">
                  + Refeição
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            variant={offer.is_active ? "outline" : "default"}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onToggleActive(offer.id, !offer.is_active)}
          >
            {offer.is_active ? (
              <>
                <Pause className="w-4 h-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Ativar
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(offer.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default RecurringOfferCard;
