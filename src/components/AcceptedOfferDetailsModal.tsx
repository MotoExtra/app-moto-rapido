import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  MapPin,
  Phone,
  Star,
  Package,
  MessageCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Truck,
  ShoppingBag,
  Briefcase,
  Utensils,
  Navigation,
  User,
} from "lucide-react";

interface Offer {
  id: string;
  restaurant_name: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  offer_date?: string | null;
  is_accepted: boolean;
  accepted_by: string | null;
  created_at: string;
  has_rating?: boolean;
  motoboy_name?: string;
  motoboy_phone?: string;
  motoboy_avatar_url?: string | null;
  motoboy_rating?: number;
  motoboy_review_count?: number;
  motoboy_status?: string;
  payment?: string | null;
  delivery_range?: string | null;
  delivery_quantity?: string | null;
  needs_bag?: boolean | null;
  can_become_permanent?: boolean | null;
  includes_meal?: boolean | null;
  radius?: number | null;
}

interface AcceptedOfferDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer;
  unreadCount: number;
  onChatClick: () => void;
  onRateClick: () => void;
  onLiveTrackClick: () => void;
}

const formatPayment = (payment: string): string => {
  try {
    const parsed = JSON.parse(payment);
    const parts: string[] = [];
    if (parsed.fixed) parts.push(`R$ ${parsed.fixed} fixo`);
    if (parsed.delivery) parts.push(`R$ ${parsed.delivery}/entrega`);
    return parts.join(" + ") || payment;
  } catch {
    return payment;
  }
};

const formatTime = (time: string) => time.slice(0, 5);

export function AcceptedOfferDetailsModal({
  open,
  onOpenChange,
  offer,
  unreadCount,
  onChatClick,
  onRateClick,
  onLiveTrackClick,
}: AcceptedOfferDetailsModalProps) {
  const isArrived = offer.motoboy_status === "in_progress";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Header with status */}
        <div
          className={`p-6 pb-4 ${
            isArrived
              ? "bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent"
              : "bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent"
          }`}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Detalhes do Extra</DialogTitle>
              <Badge
                variant={isArrived ? "default" : "secondary"}
                className={
                  isArrived
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : ""
                }
              >
                {isArrived ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Motoboy Chegou
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 mr-1" /> Aguardando Chegada
                  </>
                )}
              </Badge>
            </div>
          </DialogHeader>

          {/* Motoboy Card */}
          <Card className="mt-4 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar
                  className={`h-16 w-16 border-4 ${
                    isArrived ? "border-emerald-500" : "border-blue-500"
                  } shadow-lg`}
                >
                  <AvatarImage src={offer.motoboy_avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {offer.motoboy_name?.charAt(0).toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold truncate">
                      {offer.motoboy_name}
                    </h3>
                    {isArrived && (
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]"
                      >
                        ✓ No local
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {offer.motoboy_rating !== undefined &&
                      offer.motoboy_review_count &&
                      offer.motoboy_review_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span className="font-semibold text-foreground">
                            {offer.motoboy_rating}
                          </span>
                          <span>({offer.motoboy_review_count} avaliações)</span>
                        </span>
                      )}
                  </div>
                  {offer.motoboy_phone && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {offer.motoboy_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {offer.motoboy_phone && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        window.open(`tel:${offer.motoboy_phone}`, "_blank")
                      }
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Ligar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20 hover:text-green-700"
                      onClick={() => {
                        const phone = offer.motoboy_phone?.replace(/\D/g, '');
                        window.open(`https://wa.me/55${phone}`, "_blank");
                      }}
                    >
                      <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </Button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  size="sm"
                  variant={unreadCount > 0 ? "default" : "outline"}
                  className="w-full relative"
                  onClick={onChatClick}
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Chat
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                {isArrived && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"
                    onClick={onLiveTrackClick}
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    Ao Vivo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Offer Details */}
        <div className="p-6 pt-4 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Package className="w-4 h-4" />
              INFORMAÇÕES DO EXTRA
            </h4>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-lg">{offer.description}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Endereço</p>
                      <p className="font-medium">{offer.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Horário</p>
                      <p className="font-medium">
                        {formatTime(offer.time_start)} - {formatTime(offer.time_end)}
                      </p>
                    </div>
                  </div>

                  {offer.offer_date && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Data</p>
                        <p className="font-medium">
                          {new Date(offer.offer_date + "T00:00:00").toLocaleDateString(
                            "pt-BR",
                            { weekday: "short", day: "2-digit", month: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {offer.payment && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Pagamento</p>
                        <p className="font-medium">{formatPayment(offer.payment)}</p>
                      </div>
                    </div>
                  )}

                  {offer.delivery_range && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <Truck className="w-4 h-4 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Raio</p>
                        <p className="font-medium">{offer.delivery_range}</p>
                      </div>
                    </div>
                  )}

                  {offer.delivery_quantity && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Entregas</p>
                        <p className="font-medium">{offer.delivery_quantity}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      offer.needs_bag
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-green-500/10 text-green-600 border-green-500/30"
                    }`}
                  >
                    {offer.needs_bag ? "🎒 Precisa de bag" : "✓ Não precisa de bag"}
                  </Badge>
                  {offer.can_become_permanent && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30"
                    >
                      💼 Possibilidade de fixo
                    </Badge>
                  )}
                  {offer.includes_meal && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30"
                    >
                      🍔 Direito a lanche
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Button */}
          {!offer.has_rating && (
            <Button
              className="w-full"
              variant="outline"
              onClick={onRateClick}
            >
              <Star className="w-4 h-4 mr-2" />
              Avaliar Motoboy
            </Button>
          )}
          {offer.has_rating && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Você já avaliou este motoboy</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
