import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, XCircle, MapPin, Pencil, Copy, Trash2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExpiredOfferCardProps {
  offer: {
    id: string;
    description: string;
    address: string;
    time_start: string;
    time_end: string;
    offer_date?: string | null;
    payment?: string | null;
    delivery_range?: string | null;
    delivery_quantity?: string | null;
    needs_bag?: boolean | null;
    can_become_permanent?: boolean | null;
    includes_meal?: boolean | null;
    radius?: number | null;
    restaurant_name?: string;
  };
  onDelete?: () => void;
}

export const ExpiredOfferCard = ({ offer, onDelete }: ExpiredOfferCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Hoje";
    try {
      return format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const handleDuplicate = () => {
    navigate("/restaurante/criar-extra", {
      state: {
        duplicate: {
          description: offer.description,
          address: offer.address,
          payment: offer.payment,
          delivery_range: offer.delivery_range,
          delivery_quantity: offer.delivery_quantity,
          needs_bag: offer.needs_bag,
          can_become_permanent: offer.can_become_permanent,
          includes_meal: offer.includes_meal,
          radius: offer.radius,
        }
      }
    });
  };

  return (
    <Card className="bg-muted/30 border-dashed opacity-80 hover:opacity-100 transition-opacity">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                <XCircle className="w-3 h-3 mr-1" />
                Não aceito
              </Badge>
            </div>
            <h3 className="font-medium text-muted-foreground">{offer.description}</h3>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/restaurante/editar-extra/${offer.id}`)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatDate(offer.offer_date)} • {offer.time_start.slice(0, 5)} - {offer.time_end.slice(0, 5)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{offer.address}</span>
          </div>
          
          {offer.payment && (
            <div className="text-xs">
              💰 {offer.payment}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleDuplicate}
          >
            <Copy className="w-3 h-3 mr-1" />
            Duplicar para nova data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
