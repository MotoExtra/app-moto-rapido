import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Package, Star, AlertCircle, TrendingUp } from "lucide-react";

// Mock data - depois vem do backend
const mockOffers = [
  {
    id: 1,
    restaurant: "Restaurante de marmita no Cristóvão Colombo",
    urgent: true,
    description: "70+3+marmita",
    address: "Rua Sampaio, 789",
    timeStart: "11:00",
    timeEnd: "16:00",
    radius: 5,
    needsBag: true,
    deliveryRange: "15-30 entregas",
    experience: "Motoboy com experiência",
    rating: 4.5,
    reviewCount: 24,
  },
  {
    id: 2,
    restaurant: "Pizzaria do Centro",
    urgent: false,
    description: "Entregas noturnas",
    address: "Av. Principal, 123",
    timeStart: "18:00",
    timeEnd: "23:00",
    radius: 3,
    needsBag: true,
    deliveryRange: "10-20 entregas",
    experience: "Iniciante aceito",
    rating: 4.8,
    reviewCount: 45,
  },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Oportunidades</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Encontre o melhor match
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 bg-background/50 backdrop-blur-sm px-4 py-3 rounded-xl border shadow-sm">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-primary text-primary" />
                <span className="text-2xl font-bold text-primary">100</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Seu Score</span>
            </div>
          </div>
        </div>
      </header>

      {/* Offers List */}
      <div className="p-4 space-y-4 pb-20">
        {mockOffers.map((offer) => (
          <Card key={offer.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{offer.restaurant}</CardTitle>
                    {offer.urgent && (
                      <Badge className="bg-urgent text-urgent-foreground">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        EXTRA
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="font-medium">
                    {offer.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{offer.address}</span>
              </div>

              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{offer.timeStart} até {offer.timeEnd} • Raio de {offer.radius} km</span>
              </div>

              <div className="flex items-center text-sm text-muted-foreground">
                <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Faz {offer.deliveryRange}</span>
              </div>

              {offer.needsBag && (
                <Badge variant="outline" className="text-xs">
                  Precisa de bag
                </Badge>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center text-sm">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{offer.rating}</span>
                  <span className="text-muted-foreground ml-1">({offer.reviewCount})</span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/oferta/${offer.id}`)}
                  >
                    Ver detalhes
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => navigate(`/oferta/${offer.id}`)}
                  >
                    Aceitar
                  </Button>
                </div>
              </div>

              {offer.experience && (
                <p className="text-xs text-muted-foreground italic">
                  Obs.: {offer.experience}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="flex items-center justify-around p-2">
          <Button variant="ghost" className="flex-col h-auto py-2">
            <Package className="w-5 h-5 mb-1" />
            <span className="text-xs">Ofertas</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2">
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs">Meus Turnos</span>
          </Button>
          <Button variant="ghost" className="flex-col h-auto py-2">
            <Star className="w-5 h-5 mb-1" />
            <span className="text-xs">Ranking</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Home;
