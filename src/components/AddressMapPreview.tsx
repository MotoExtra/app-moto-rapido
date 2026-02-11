import { useState, useEffect, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { geocodeStructured } from "@/lib/geocoding";
import "leaflet/dist/leaflet.css";

interface AddressMapPreviewProps {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

// Lazy load map component
const MapContent = lazy(() => import("./MapContent"));

const AddressMapPreview = ({ rua, numero, bairro, cidade }: AddressMapPreviewProps) => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fullAddress = rua && numero && bairro && cidade
    ? `${rua}, ${numero} - ${bairro}, ${cidade}, ES, Brasil`
    : "";

  const canSearch = rua && numero && bairro && cidade;

  const handleGeocode = async () => {
    if (!canSearch) return;

    setIsLoading(true);
    setError(null);
    setCoordinates(null);

    try {
      const result = await geocodeStructured({ rua, numero, bairro, cidade });

      if (result) {
        setCoordinates({ lat: result.lat, lng: result.lng });
      } else {
        setError("Endereço não encontrado no mapa. Verifique os dados.");
      }
    } catch (err) {
      console.error("Erro ao geocodificar:", err);
      setError("Erro ao buscar localização. Tente novamente.");
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  };

  // Reset when address changes
  useEffect(() => {
    setHasSearched(false);
    setCoordinates(null);
    setError(null);
  }, [rua, numero, bairro, cidade]);

  if (!canSearch) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Preencha rua, número, bairro e cidade para visualizar no mapa
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="p-3 bg-muted/30 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">Preview do Mapa</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant={hasSearched && coordinates ? "outline" : "default"}
            onClick={handleGeocode}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasSearched ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Atualizar
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-1" />
                Verificar
              </>
            )}
          </Button>
        </div>
        {hasSearched && (
          <div className="mt-2 text-xs">
            {coordinates ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>Endereço encontrado</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-1 text-destructive">
                <XCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8 h-48 bg-muted/10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Buscando localização...</span>
        </div>
      )}

      {!isLoading && coordinates && (
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8 h-48">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          }
        >
          <MapContent
            coordinates={coordinates}
            restaurantName=""
            address={fullAddress}
          />
        </Suspense>
      )}

      {!isLoading && !hasSearched && (
        <div className="p-6 text-center bg-muted/10">
          <p className="text-sm text-muted-foreground">
            Clique em "Verificar" para confirmar a localização antes de publicar
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressMapPreview;
