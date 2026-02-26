import { useEffect, useState, useMemo, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = "AIzaSyBXfRcuKCrNHDYY3cJL9JKMa8gaSV3LVes";

interface LocationPoint {
  lat: number;
  lng: number;
  recorded_at: string;
}

interface LiveMotoboyMapProps {
  motoboyLat: number;
  motoboyLng: number;
  restaurantLat: number;
  restaurantLng: number;
  motoboyName: string;
  restaurantName: string;
  routeHistory?: LocationPoint[];
  showRouteHistory?: boolean;
  hasMotoboyLocation?: boolean;
}

export interface LiveMotoboyMapRef {
  centerOnMotoboy: () => void;
}

// Inner component that has access to map instance
const MapInner = forwardRef<LiveMotoboyMapRef, LiveMotoboyMapProps>(({
  motoboyLat,
  motoboyLng,
  restaurantLat,
  restaurantLng,
  motoboyName,
  restaurantName,
  routeHistory = [],
  showRouteHistory = true,
  hasMotoboyLocation = true
}, ref) => {
  const map = useMap();
  const directLineRef = useRef<google.maps.Polyline | null>(null);
  const routeLineRef = useRef<google.maps.Polyline | null>(null);

  // Center on motoboy
  useImperativeHandle(ref, () => ({
    centerOnMotoboy: () => {
      if (map && hasMotoboyLocation) {
        map.panTo({ lat: motoboyLat, lng: motoboyLng });
        map.setZoom(17);
      }
    }
  }), [map, motoboyLat, motoboyLng, hasMotoboyLocation]);

  // Fit bounds on initial load
  useEffect(() => {
    if (!map) return;
    
    if (hasMotoboyLocation) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: motoboyLat, lng: motoboyLng });
      bounds.extend({ lat: restaurantLat, lng: restaurantLng });
      map.fitBounds(bounds, 50);
    } else {
      map.setCenter({ lat: restaurantLat, lng: restaurantLng });
      map.setZoom(15);
    }
  }, [map, hasMotoboyLocation]);

  // Direct line between motoboy and restaurant
  useEffect(() => {
    if (!map || !hasMotoboyLocation) return;

    if (!directLineRef.current) {
      directLineRef.current = new google.maps.Polyline({
        map,
        strokeColor: '#10b981',
        strokeWeight: 3,
        strokeOpacity: 0.5,
        geodesic: true,
      });
      directLineRef.current.set('icons', [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
        offset: '0',
        repeat: '15px'
      }]);
    }

    directLineRef.current.setPath([
      { lat: motoboyLat, lng: motoboyLng },
      { lat: restaurantLat, lng: restaurantLng },
    ]);

    return () => {
      directLineRef.current?.setMap(null);
      directLineRef.current = null;
    };
  }, [map, motoboyLat, motoboyLng, restaurantLat, restaurantLng, hasMotoboyLocation]);

  // Route history polyline
  useEffect(() => {
    if (!map) return;

    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    if (!showRouteHistory || routeHistory.length < 2) return;

    const path = routeHistory.map(p => ({ lat: p.lat, lng: p.lng }));
    if (hasMotoboyLocation) {
      path.push({ lat: motoboyLat, lng: motoboyLng });
    }

    routeLineRef.current = new google.maps.Polyline({
      map,
      path,
      strokeColor: '#3b82f6',
      strokeWeight: 4,
      strokeOpacity: 0.8,
    });

    return () => {
      routeLineRef.current?.setMap(null);
      routeLineRef.current = null;
    };
  }, [map, routeHistory, motoboyLat, motoboyLng, showRouteHistory, hasMotoboyLocation]);

  // Calculate total distance
  const totalDistance = useMemo(() => {
    if (routeHistory.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < routeHistory.length; i++) {
      const p1 = new google.maps.LatLng(routeHistory[i - 1].lat, routeHistory[i - 1].lng);
      const p2 = new google.maps.LatLng(routeHistory[i].lat, routeHistory[i].lng);
      total += google.maps.geometry?.spherical?.computeDistanceBetween?.(p1, p2) || 0;
    }
    return total;
  }, [routeHistory]);

  return (
    <>
      {/* Restaurant marker */}
      <AdvancedMarker position={{ lat: restaurantLat, lng: restaurantLng }} title={restaurantName}>
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-full shadow-lg flex items-center justify-center border-2 border-background">
            <span className="text-xl">🏪</span>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rotate-45" />
        </div>
      </AdvancedMarker>

      {/* Motoboy marker */}
      {hasMotoboyLocation && (
        <AdvancedMarker position={{ lat: motoboyLat, lng: motoboyLng }} title={motoboyName}>
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full shadow-lg shadow-emerald-500/50 flex items-center justify-center animate-pulse border-[3px] border-background">
              <span className="text-2xl">🏍️</span>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-500 rotate-45" />
          </div>
        </AdvancedMarker>
      )}

      {/* Start point marker */}
      {showRouteHistory && routeHistory.length > 1 && (
        <AdvancedMarker 
          position={{ lat: routeHistory[0].lat, lng: routeHistory[0].lng }} 
          title={`Início: ${new Date(routeHistory[0].recorded_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-background shadow-lg flex items-center justify-center">
            <span className="text-xs text-white font-bold">▶</span>
          </div>
        </AdvancedMarker>
      )}

      {/* Live/Waiting indicator overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-lg">
        {hasMotoboyLocation ? (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-foreground">AO VIVO</span>
          </>
        ) : (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-medium text-foreground">Aguardando GPS do motoboy</span>
          </>
        )}
      </div>

      {/* Route stats overlay */}
      {showRouteHistory && routeHistory.length > 1 && hasMotoboyLocation && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 px-3 py-2 rounded-lg bg-background/95 backdrop-blur-sm border border-border shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500 rounded" />
            <span className="text-xs font-medium text-foreground">Rota percorrida</span>
          </div>
          <div className="text-xs text-muted-foreground">
            📍 {routeHistory.length} pontos • {(totalDistance / 1000).toFixed(1)} km
          </div>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/80 to-transparent pointer-events-none z-10" />
    </>
  );
});

MapInner.displayName = 'MapInner';

const LiveMotoboyMap = forwardRef<LiveMotoboyMapRef, LiveMotoboyMapProps>((props, ref) => {
  const defaultCenter = { lat: props.motoboyLat, lng: props.motoboyLng };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-border/50">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="live-motoboy-map"
          style={{ width: "100%", height: "100%" }}
        >
          <MapInner ref={ref} {...props} />
        </Map>
      </APIProvider>
    </div>
  );
});

LiveMotoboyMap.displayName = 'LiveMotoboyMap';

export default LiveMotoboyMap;
