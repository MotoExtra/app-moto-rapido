import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, 
  MapPin, 
  Star,
  MessageCircle,
  Phone,
  Navigation,
  ChevronRight,
  CheckCircle2
} from "lucide-react";

interface Offer {
  id: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  offer_date?: string | null;
  motoboy_name?: string;
  motoboy_phone?: string;
  motoboy_avatar_url?: string | null;
  motoboy_rating?: number;
  motoboy_review_count?: number;
  motoboy_status?: string;
  payment?: string | null;
}

interface OfferCardInProgressProps {
  offer: Offer;
  unreadCount: number;
  onDetailsClick: () => void;
  onChatClick: () => void;
  onLiveClick: () => void;
}

const formatTime = (time: string) => time.slice(0, 5);

export const OfferCardInProgress = ({ 
  offer, 
  unreadCount, 
  onDetailsClick,
  onChatClick,
  onLiveClick
}: OfferCardInProgressProps) => {
  const hasArrived = offer.motoboy_status === "in_progress";

  return (
    <Card className={`overflow-hidden transition-all ${
      hasArrived 
        ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-500/5 to-green-500/5 shadow-lg shadow-emerald-500/10' 
        : 'border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5'
    }`}>
      <CardContent className="p-4">
        {/* Header with offer info */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold truncate">{offer.description}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{offer.address}</span>
            </p>
          </div>
          
          <Badge 
            variant="default" 
            className={hasArrived 
              ? 'bg-emerald-500 text-white' 
              : 'bg-blue-500 text-white'
            }
          >
            {hasArrived ? (
              <><CheckCircle2 className="w-3 h-3 mr-1" /> Chegou</>
            ) : (
              <><Clock className="w-3 h-3 mr-1" /> A caminho</>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(offer.time_start)} - {formatTime(offer.time_end)}
          </span>
          {offer.payment && (
            <span className="font-medium text-emerald-600">{offer.payment}</span>
          )}
        </div>

        {/* Motoboy Card */}
        <div 
          className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
            hasArrived 
              ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50' 
              : 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40'
          }`}
          onClick={onDetailsClick}
        >
          <div className="flex items-center gap-3">
            <Avatar className={`h-14 w-14 border-2 ${
              hasArrived ? 'border-emerald-500' : 'border-blue-500'
            }`}>
              <AvatarImage src={offer.motoboy_avatar_url || undefined} />
              <AvatarFallback className={`font-semibold ${
                hasArrived 
                  ? 'bg-emerald-500/20 text-emerald-700' 
                  : 'bg-blue-500/20 text-blue-700'
              }`}>
                {offer.motoboy_name?.charAt(0).toUpperCase() || "M"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate text-base">{offer.motoboy_name}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {offer.motoboy_rating !== undefined && offer.motoboy_review_count && offer.motoboy_review_count > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {offer.motoboy_rating} ({offer.motoboy_review_count})
                  </span>
                )}
              </div>
            </div>
            
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="h-6 px-2 flex items-center justify-center text-xs animate-pulse"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                {unreadCount}
              </Badge>
            )}
            
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Button 
            size="sm" 
            variant={unreadCount > 0 ? "default" : "outline"}
            onClick={(e) => {
              e.stopPropagation();
              onChatClick();
            }}
            className="text-xs"
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            Chat
            {unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
          </Button>
          
          {offer.motoboy_phone && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${offer.motoboy_phone}`, "_blank");
              }}
              className="text-xs"
            >
              <Phone className="w-3 h-3 mr-1" />
              Ligar
            </Button>
          )}
          
          {hasArrived && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onLiveClick();
              }}
              className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"
            >
              <Navigation className="w-3 h-3 mr-1" />
              Ao Vivo
            </Button>
          )}
        </div>

        {/* Status Indicator */}
        {!hasArrived && (
          <div className="flex items-center justify-center gap-2 text-xs text-amber-600 dark:text-amber-400 mt-3 pt-3 border-t border-dashed">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Aguardando chegada do motoboy</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
