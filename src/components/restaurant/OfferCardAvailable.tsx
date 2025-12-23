import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Clock, 
  MapPin, 
  MoreVertical, 
  Pencil, 
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Offer {
  id: string;
  description: string;
  address: string;
  time_start: string;
  time_end: string;
  offer_date?: string | null;
  payment?: string | null;
  [key: string]: any;
}

interface OfferCardAvailableProps {
  offer: Offer;
  onDelete: () => void;
}

const formatTime = (time: string) => time.slice(0, 5);

const getTimeUrgency = (timeStart: string, offerDate: string | null | undefined) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const targetDate = offerDate || today;
  
  const [hours, minutes] = timeStart.split(':').map(Number);
  const startTime = new Date(targetDate + 'T' + timeStart);
  
  if (targetDate < today) return { level: 'expired', label: 'Expirado' };
  
  const diffMs = startTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours < 0) return { level: 'started', label: 'Em horário' };
  if (diffHours < 1) return { level: 'urgent', label: `${Math.round(diffHours * 60)}min` };
  if (diffHours < 3) return { level: 'soon', label: `${Math.round(diffHours)}h` };
  
  return { level: 'normal', label: null };
};

export const OfferCardAvailable = ({ offer, onDelete }: OfferCardAvailableProps) => {
  const navigate = useNavigate();
  const urgency = getTimeUrgency(offer.time_start, offer.offer_date);

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${
      urgency.level === 'urgent' ? 'border-amber-500/50 bg-amber-500/5' :
      urgency.level === 'expired' ? 'border-red-500/50 bg-red-500/5 opacity-60' :
      ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{offer.description}</h3>
              {urgency.level === 'urgent' && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  {urgency.label}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{offer.address}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Clock className="w-3 h-3 mr-1" /> Aguardando
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => navigate(`/restaurante/editar-extra/${offer.id}`)}
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Apagar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(offer.time_start)} - {formatTime(offer.time_end)}
            </span>
            {offer.payment && (
              <span className="font-medium text-emerald-600">{offer.payment}</span>
            )}
          </div>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => navigate(`/restaurante/editar-extra/${offer.id}`)}
            className="text-xs"
          >
            <Pencil className="w-3 h-3 mr-1" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
