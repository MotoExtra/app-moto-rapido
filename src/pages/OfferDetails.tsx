import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Package, Star, AlertCircle, ArrowLeft, Phone, Navigation } from "lucide-react";

// Mock data - depois vem do backend
const mockOffers = [
  {
    id: 1,
    restaurant: "Restaurante de marmita no Cristóvão Colombo",
    urgent: true,
    description: "70+3+marmita",
    address: "Rua Sampaio, 789",
    fullAddress: "Rua Sampaio, 789 - Cristóvão Colombo, Porto Alegre - RS",
    timeStart: "11:00",
    timeEnd: "16:00",
    radius: 5,
    needsBag: true,
    deliveryRange: "15-30 entregas",
    experience: "Motoboy com experiência",
    payment: "R$ 70 + R$ 3 por entrega",
    observations: "Preferência para motoboys que já conhecem a região. Pagamento ao final do turno.",
    rating: 4.5,
    reviewCount: 24,
    phone: "(51) 99999-8888",
    lat: -30.0331,
    lng: -51.2300,
  },
  {
    id: 2,
    restaurant: "Pizzaria do Centro",
    urgent: false,
    description: "Entregas noturnas",
    address: "Av. Principal, 123",
    fullAddress: "Av. Principal, 123 - Centro, Porto Alegre - RS",
    timeStart: "18:00",
    timeEnd: "23:00",
    radius: 3,
    needsBag: true,
    deliveryRange: "10-20 entregas",
    experience: "Iniciante aceito",
    payment: "R$ 80 fixo",
    observations: "Entregas em prédios, necessário ter experiência com portarias.",
    rating: 4.8,
    reviewCount: 45,
    phone: "(51) 98888-7777",
    lat: -30.0277,
    lng: -51.2287,
  },
];

const OfferDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const offer = mockOffers.find((o) => o.id === Number(id));

  if (!offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card>
          <CardHeader>
            <CardTitle>Oferta não encontrada</CardTitle>
            <CardDescription>Esta oferta não existe ou foi removida.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/home")}>Voltar para ofertas</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  // URL do mapa estático (usando OpenStreetMap via StaticMap API)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${offer.lng - 0.01},${offer.lat - 0.01},${offer.lng + 0.01},${offer.lat + 0.01}&layer=mapnik&marker=${offer.lat},${offer.lng}`;

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Detalhes da Oferta</h1>
        </div>
      </header>

      {/* Mapa */}
      <div className="relative w-full h-64 bg-muted">
        <iframe
          title="Mapa do local de partida"
          src={mapUrl}
          className="w-full h-full border-0"
        />
        <Button
          size="sm"
          className="absolute bottom-4 right-4 gap-2"
          onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${offer.lat},${offer.lng}`, "_blank")}
        >
          <Navigation className="w-4 h-4" />
          Navegar
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-4">
        {/* Card Principal */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-2xl">{offer.restaurant}</CardTitle>
                  {offer.urgent && (
                    <Badge className="bg-urgent text-urgent-foreground">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      EXTRA
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-lg font-medium">
                  {offer.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 pt-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg">{offer.rating}</span>
              <span className="text-muted-foreground">({offer.reviewCount} avaliações)</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Endereço */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Endereço de partida</p>
                <p className="text-sm text-muted-foreground">{offer.fullAddress}</p>
              </div>
            </div>

            {/* Horário */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Horário do turno</p>
                <p className="text-sm text-muted-foreground">
                  {offer.timeStart} até {offer.timeEnd}
                </p>
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Volume estimado</p>
                <p className="text-sm text-muted-foreground">
                  {offer.deliveryRange} • Raio de {offer.radius} km
                </p>
              </div>
            </div>

            {/* Contato */}
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Contato (após aceitar)</p>
                <p className="text-sm text-muted-foreground">{offer.phone}</p>
              </div>
            </div>

            <div className="pt-2 border-t space-y-3">
              {/* Pré-requisitos */}
              <div>
                <p className="font-medium mb-2">Pré-requisitos</p>
                <div className="flex flex-wrap gap-2">
                  {offer.needsBag && (
                    <Badge variant="outline">Precisa de bag</Badge>
                  )}
                  {offer.experience && (
                    <Badge variant="outline">{offer.experience}</Badge>
                  )}
                </div>
              </div>

              {/* Pagamento */}
              {offer.payment && (
                <div>
                  <p className="font-medium mb-1">Pagamento</p>
                  <p className="text-sm text-muted-foreground">{offer.payment}</p>
                </div>
              )}

              {/* Observações */}
              {offer.observations && (
                <div>
                  <p className="font-medium mb-1">Observações</p>
                  <p className="text-sm text-muted-foreground italic">{offer.observations}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Regras de Cancelamento */}
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Regras de cancelamento
                </p>
                <p className="text-orange-700 dark:text-orange-300 mt-1">
                  Cancelamento permitido até <strong>3 horas antes</strong> do início do turno. 
                  Após esse período, só é possível cancelar conversando diretamente com o restaurante.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default OfferDetails;
