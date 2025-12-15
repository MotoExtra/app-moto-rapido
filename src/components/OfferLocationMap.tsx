import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon
const customIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

const OfferLocationMap = ({ address, lat, lng, restaurantName, offerId }: OfferLocationMapProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    lat && lng ? { lat, lng } : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const geocodeAddress = async () => {
      if (coordinates || !address) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const newLat = parseFloat(data[0].lat);
          const newLng = parseFloat(data[0].lon);
          
          setCoordinates({ lat: newLat, lng: newLng });

          // Save coordinates to database if offerId is provided
          if (offerId) {
            await supabase
              .from("offers")
              .update({ lat: newLat, lng: newLng })
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
      geocodeAddress();
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
              <div className="h-48 w-full">
                <MapContainer
                  center={[coordinates.lat, coordinates.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[coordinates.lat, coordinates.lng]} icon={customIcon}>
                    <Popup>
                      <div className="text-center">
                        <strong>{restaurantName}</strong>
                        <br />
                        <span className="text-xs">{address}</span>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
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
