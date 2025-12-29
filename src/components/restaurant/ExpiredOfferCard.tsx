import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, XCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExpiredOfferCardProps {
  offer: {
    id: string;
    description: string;
    address: string;
    time_start: string;
    time_end: string;
    offer_date?: string | null;
    payment?: string | null;
  };
}

export const ExpiredOfferCard = ({ offer }: ExpiredOfferCardProps) => {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Hoje";
    try {
      return format(new Date(dateStr + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="bg-muted/30 border-dashed opacity-70">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                <XCircle className="w-3 h-3 mr-1" />
                Não aceito
              </Badge>
            </div>
            <h3 className="font-medium text-muted-foreground line-through">{offer.description}</h3>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatDate(offer.offer_date)} • {offer.time_start} - {offer.time_end}</span>
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
      </CardContent>
    </Card>
  );
};
