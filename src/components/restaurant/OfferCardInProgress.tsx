import { useState } from "react";
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
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { MotoboyRatingsModal } from "@/components/MotoboyRatingsModal";

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
  accepted_by?: string | null;
}

interface OfferCardInProgressProps {
  offer: Offer;
  unreadCount: number;
  onDetailsClick: () => void;
  onChatClick: () => void;
}

const formatTime = (time: string) => time.slice(0, 5);

export const OfferCardInProgress = ({ 
  offer, 
  unreadCount, 
  onDetailsClick,
  onChatClick
}: OfferCardInProgressProps) => {
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const hasArrived = offer.motoboy_status === "in_progress";

  return (
    <>
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
              {offer.motoboy_rating !== undefined && offer.motoboy_review_count && offer.motoboy_review_count > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRatingsModal(true);
                  }}
                  className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-amber-600 transition-colors cursor-pointer"
                >
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {offer.motoboy_rating} ({offer.motoboy_review_count})
                </button>
              )}
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
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  const phone = offer.motoboy_phone?.replace(/\D/g, '');
                  window.open(`https://wa.me/55${phone}`, "_blank");
                }}
                className="text-xs bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20"
              >
                <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </Button>
              
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
            </>
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

    {offer.accepted_by && (
      <MotoboyRatingsModal
        open={showRatingsModal}
        onOpenChange={setShowRatingsModal}
        motoboyId={offer.accepted_by}
        motoboyName={offer.motoboy_name || "Motoboy"}
        motoboyAvatarUrl={offer.motoboy_avatar_url}
      />
    )}
    </>
  );
};
