import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Loader2 } from "lucide-react";

const GOOGLE_MAPS_API_KEY = "AIzaSyBXfRcuKCrNHDYY3cJL9JKMa8gaSV3LVes";

interface MotoExtraMapProps {
  className?: string;
  zoom?: number;
  showUserLocation?: boolean;
  children?: React.ReactNode;
}

const MotoExtraMap = ({ className = "w-full h-64", zoom = 15, showUserLocation = true }: MotoExtraMapProps) => {
  const platform = Capacitor.getPlatform();

  if (platform === "android") {
    return (
      <MotoExtraMapNative className={className} zoom={zoom} showUserLocation={showUserLocation} />
    );
  }

  return (
    <MotoExtraMapWeb className={className} zoom={zoom} showUserLocation={showUserLocation} />
  );
};

// ─── Web Implementation (vis.gl/react-google-maps) ───
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const MotoExtraMapWeb = ({ className, zoom, showUserLocation }: Omit<MotoExtraMapProps, "children">) => {
  const { latitude, longitude, loading, error } = useGeolocation();

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-xl`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Obtendo localização...</span>
      </div>
    );
  }

  if (error || !latitude || !longitude) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-xl`}>
        <span className="text-sm text-destructive">{error || "Localização indisponível"}</span>
      </div>
    );
  }

  const center = { lat: latitude, lng: longitude };

  return (
    <div className={`${className} rounded-xl overflow-hidden border border-border shadow-lg`}>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="motoextra-map"
          style={{ width: "100%", height: "100%" }}
        >
          {showUserLocation && (
            <AdvancedMarker position={center} title="Sua localização">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg shadow-primary/50 flex items-center justify-center animate-pulse border-2 border-background">
                  <span className="text-xl">🏍️</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rotate-45" />
              </div>
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};

// ─── Android Native Implementation (@capacitor/google-maps) ───
import { GoogleMap } from "@capacitor/google-maps";

const MotoExtraMapNative = ({ className, zoom, showUserLocation }: Omit<MotoExtraMapProps, "children">) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const { latitude, longitude, loading, error } = useGeolocation();
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude || googleMapRef.current) return;

    let cancelled = false;

    const createMap = async () => {
      try {
        const map = await GoogleMap.create({
          id: "motoextra-native-map",
          element: mapRef.current!,
          apiKey: GOOGLE_MAPS_API_KEY,
          config: {
            center: { lat: latitude, lng: longitude },
            zoom: zoom || 15,
          },
        });

        if (cancelled) {
          map.destroy();
          return;
        }

        googleMapRef.current = map;
        setMapReady(true);

        if (showUserLocation) {
          await map.addMarker({
            coordinate: { lat: latitude, lng: longitude },
            title: "Sua localização",
            snippet: "Você está aqui",
          });

          try {
            await map.enableCurrentLocation(true);
          } catch {
            // Permission might not be granted yet on native
          }
        }
      } catch (err) {
        console.error("Erro ao criar mapa nativo:", err);
      }
    };

    createMap();

    return () => {
      cancelled = true;
      if (googleMapRef.current) {
        googleMapRef.current.destroy();
        googleMapRef.current = null;
      }
    };
  }, [latitude, longitude, zoom, showUserLocation]);

  // Update marker position when geolocation changes
  useEffect(() => {
    if (!googleMapRef.current || !latitude || !longitude || !mapReady) return;

    googleMapRef.current.setCamera({
      coordinate: { lat: latitude, lng: longitude },
      zoom: zoom || 15,
      animate: true,
    });
  }, [latitude, longitude, mapReady, zoom]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-xl`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Obtendo localização...</span>
      </div>
    );
  }

  if (error || !latitude || !longitude) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted rounded-xl`}>
        <span className="text-sm text-destructive">{error || "Localização indisponível"}</span>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-xl overflow-hidden border border-border shadow-lg`}>
      <capacitor-google-map
        ref={mapRef as any}
        id="motoextra-native-map"
        style={{ display: "inline-block", width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default MotoExtraMap;
