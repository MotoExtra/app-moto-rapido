import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Phone, Clock, MapPin, Trash2 } from "lucide-react";
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
  profiles?: {
    name: string;
  };
}

interface SnackExchangeCardProps {
  exchange: SnackExchange;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onContact?: (phone: string) => void;
}

export function SnackExchangeCard({ 
  exchange, 
  currentUserId,
  onDelete,
  onContact 
}: SnackExchangeCardProps) {
  const isOwner = currentUserId === exchange.user_id;
  const expiresAt = new Date(exchange.expires_at);
  const timeLeft = formatDistanceToNow(expiresAt, { locale: ptBR, addSuffix: false });
  
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Vi sua oferta de troca de lanche no app. Você tem ${exchange.offering} e quer ${exchange.wanting}. Podemos negociar?`
    );
    const phone = exchange.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
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
          
          {isOwner && onDelete && (
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

          {!isOwner && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onContact?.(exchange.phone)}
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
        </div>
      </CardContent>
    </Card>
  );
}
