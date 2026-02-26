import { useState, useEffect, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocoding";


interface OfferLocationMapProps {
  address: string;
  lat?: number | null;
  lng?: number | null;
  restaurantName: string;
  offerId?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

// Lazy load map component to avoid SSR/context issues
const MapContent = lazy(() => import("./MapContent"));

const OfferLocationMap = ({ address, lat, lng, restaurantName, offerId }: OfferLocationMapProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    lat && lng ? { lat, lng } : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const doGeocode = async () => {
      if (coordinates || !address) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await geocodeAddress(address);

        if (result) {
          setCoordinates({ lat: result.lat, lng: result.lng });

          if (offerId) {
            await supabase
              .from("offers")
              .update({ lat: result.lat, lng: result.lng })
              .eq("id", offerId);
          }
        } else {
          setError("Endereço não encontrado");
        }
      } catch (err) {
        console.error("Erro ao geocodificar:", err);
        setError("Erro ao buscar localização");
      } finally {
        setIsLoading(false);
      }
    };

    if (isExpanded && !coordinates) {
      doGeocode();
    }
  }, [isExpanded, address, coordinates, offerId]);

  const openInGoogleMaps = () => {
    if (coordinates) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        "_blank"
      );
    }
  };

  const openInWaze = () => {
    if (coordinates) {
      window.open(
        `https://waze.com/ul?ll=${coordinates.lat},${coordinates.lng}&navigate=yes`,
        "_blank"
      );
    } else {
      window.open(
        `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
        "_blank"
      );
    }
  };

  return (
    <div className="mt-3 border rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-3 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-medium">Ver Localização no Mapa</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </Button>

      {isExpanded && (
        <div className="border-t">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando mapa...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={openInGoogleMaps}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Abrir no Google Maps
                </Button>
              </div>
            </div>
          ) : coordinates ? (
            <>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center p-8 h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                }
              >
                <MapContent
                  coordinates={coordinates}
                  restaurantName={restaurantName}
                  address={address}
                />
              </Suspense>
              <div className="flex gap-2 p-3 bg-muted/30">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={openInGoogleMaps}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Google Maps
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={openInWaze}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Waze
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default OfferLocationMap;
