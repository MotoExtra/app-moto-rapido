import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Clock, MapPin, Trash2, Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SnackExchange {
  id: string;
  user_id: string;
  offering: string;
  wanting: string;
  description?: string;
  city: string;
  phone: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_by?: string | null;
  profiles?: {
    name: string;
  };
  accepter_profile?: {
    name: string;
  };
}

interface SnackExchangeCardProps {
  exchange: SnackExchange;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onContact?: () => void;
}

export function SnackExchangeCard({ 
  exchange, 
  currentUserId,
  onDelete,
  onContact
}: SnackExchangeCardProps) {
  const isOwner = currentUserId === exchange.user_id;
  const isAccepter = currentUserId === exchange.accepted_by;
  const isPending = exchange.status === 'pending';
  const isConfirmed = exchange.status === 'confirmed';
  const expiresAt = new Date(exchange.expires_at);
  const timeLeft = formatDistanceToNow(expiresAt, { locale: ptBR, addSuffix: false });
  
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Vi sua oferta de troca de lanche no app. Você tem ${exchange.offering} e quer ${exchange.wanting}. Podemos negociar?`
    );
    const phone = exchange.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const getStatusBadge = () => {
    if (isConfirmed) {
      return (
        <div className="flex items-center gap-1 text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded-full">
          <Check className="w-3 h-3" />
          Confirmada
        </div>
      );
    }
    if (isPending) {
      if (isOwner) {
        return (
          <div className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded-full animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            Alguém quer trocar!
          </div>
        );
      }
      if (isAccepter) {
        return (
          <div className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-600 px-2 py-1 rounded-full">
            <Loader2 className="w-3 h-3 animate-spin" />
            Aguardando confirmação
          </div>
        );
      }
    }
    return null;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
              👤
            </div>
            <div>
              <p className="font-medium text-sm">{exchange.profiles?.name || 'Motoboy'}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{exchange.city}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {isOwner && onDelete && !isPending && !isConfirmed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(exchange.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2 py-2 border-y border-border/30">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs">🟢</span>
            <span className="text-sm"><strong>Tenho:</strong> {exchange.offering}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">🔵</span>
            <span className="text-sm"><strong>Quero:</strong> {exchange.wanting}</span>
          </div>
          {exchange.description && (
            <p className="text-xs text-muted-foreground pl-8">{exchange.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Expira em {timeLeft}</span>
          </div>

          {/* Show buttons for non-owner on available cards */}
          {(!isOwner && exchange.status === 'available') && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onContact}
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Chat
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-green-600 hover:bg-green-700"
                onClick={handleWhatsApp}
              >
                <Phone className="w-3 h-3 mr-1" />
                WhatsApp
              </Button>
            </div>
          )}

          {/* Show chat button for pending/confirmed exchanges for participants */}
          {(isPending || isConfirmed) && (isOwner || isAccepter) && (
            <Button
              variant={isPending && isOwner ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={onContact}
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              {isPending && isOwner ? 'Ver proposta' : 'Chat'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
