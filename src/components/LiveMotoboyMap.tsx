import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
}

// Custom motorcycle icon for motoboy
const motoboyIcon = L.divIcon({
  html: `
    <div class="relative">
      <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full shadow-lg shadow-emerald-500/50 flex items-center justify-center animate-pulse border-3 border-white">
        <span class="text-2xl">🏍️</span>
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-500 rotate-45"></div>
    </div>
  `,
  className: 'custom-motoboy-marker',
  iconSize: [48, 56],
  iconAnchor: [24, 56],
});

// Restaurant marker icon
const restaurantIcon = L.divIcon({
  html: `
    <div class="relative">
      <div class="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-full shadow-lg flex items-center justify-center border-2 border-white">
        <span class="text-xl">🏪</span>
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rotate-45"></div>
    </div>
  `,
  className: 'custom-restaurant-marker',
  iconSize: [40, 48],
  iconAnchor: [20, 48],
});

// Start point icon
const startIcon = L.divIcon({
  html: `
    <div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
      <span class="text-xs">▶</span>
    </div>
  `,
  className: 'custom-start-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const LiveMotoboyMap = ({
  motoboyLat,
  motoboyLng,
  restaurantLat,
  restaurantLng,
  motoboyName,
  restaurantName,
  routeHistory = [],
  showRouteHistory = true
}: LiveMotoboyMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const motoboyMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([motoboyLat, motoboyLng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Add/update markers and polyline
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;

    const map = mapInstanceRef.current;

    // Add restaurant marker (static)
    const restaurantMarker = L.marker([restaurantLat, restaurantLng], {
      icon: restaurantIcon,
    }).addTo(map);
    restaurantMarker.bindPopup(`<strong>${restaurantName}</strong><br/>📍 Local do extra`);

    // Add motoboy marker (will be updated)
    if (motoboyMarkerRef.current) {
      motoboyMarkerRef.current.remove();
    }
    motoboyMarkerRef.current = L.marker([motoboyLat, motoboyLng], {
      icon: motoboyIcon,
    }).addTo(map);
    motoboyMarkerRef.current.bindPopup(`<strong>${motoboyName}</strong><br/>🏍️ Em movimento`);

    // Add polyline between motoboy and restaurant (direct line)
    if (polylineRef.current) {
      polylineRef.current.remove();
    }
    polylineRef.current = L.polyline(
      [
        [motoboyLat, motoboyLng],
        [restaurantLat, restaurantLng],
      ],
      {
        color: '#10b981',
        weight: 3,
        opacity: 0.5,
        dashArray: '10, 10',
      }
    ).addTo(map);

    // Fit bounds to show both markers
    const bounds = L.latLngBounds(
      [motoboyLat, motoboyLng],
      [restaurantLat, restaurantLng]
    );
    map.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      restaurantMarker.remove();
    };
  }, [mapReady, restaurantLat, restaurantLng, restaurantName]);

  // Update motoboy position with smooth animation
  useEffect(() => {
    if (!motoboyMarkerRef.current || !polylineRef.current) return;

    // Animate marker to new position
    const currentLatLng = motoboyMarkerRef.current.getLatLng();
    const newLatLng = L.latLng(motoboyLat, motoboyLng);

    // Only update if position changed significantly (more than 5 meters)
    const distance = currentLatLng.distanceTo(newLatLng);
    if (distance > 5) {
      motoboyMarkerRef.current.setLatLng(newLatLng);
      
      // Update direct line polyline
      polylineRef.current.setLatLngs([
        [motoboyLat, motoboyLng],
        [restaurantLat, restaurantLng],
      ]);
    }
  }, [motoboyLat, motoboyLng, restaurantLat, restaurantLng]);

  // Draw route history
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || !showRouteHistory) return;

    const map = mapInstanceRef.current;

    // Remove previous route polyline and start marker
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }

    if (routeHistory.length < 2) return;

    // Create route polyline from history
    const routePoints: [number, number][] = routeHistory.map(point => [point.lat, point.lng]);
    
    // Add current position as the last point
    routePoints.push([motoboyLat, motoboyLng]);

    routePolylineRef.current = L.polyline(routePoints, {
      color: '#3b82f6', // Blue color for route history
      weight: 4,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Add start point marker
    const firstPoint = routeHistory[0];
    startMarkerRef.current = L.marker([firstPoint.lat, firstPoint.lng], {
      icon: startIcon,
    }).addTo(map);
    
    const startTime = new Date(firstPoint.recorded_at).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    startMarkerRef.current.bindPopup(`<strong>Início do expediente</strong><br/>⏰ ${startTime}`);

  }, [routeHistory, motoboyLat, motoboyLng, mapReady, showRouteHistory]);

  // Calculate total distance traveled
  const totalDistance = routeHistory.length > 1 
    ? routeHistory.reduce((acc, point, index) => {
        if (index === 0) return 0;
        const prevPoint = routeHistory[index - 1];
        const p1 = L.latLng(prevPoint.lat, prevPoint.lng);
        const p2 = L.latLng(point.lat, point.lng);
        return acc + p1.distanceTo(p2);
      }, 0)
    : 0;

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-border/50">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
      
      {/* Live indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-lg">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-bold text-foreground">AO VIVO</span>
      </div>

      {/* Route stats */}
      {showRouteHistory && routeHistory.length > 1 && (
        <div className="absolute top-4 right-4 flex flex-col gap-1 px-3 py-2 rounded-lg bg-background/95 backdrop-blur-sm border border-border shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500 rounded" />
            <span className="text-xs font-medium text-foreground">Rota percorrida</span>
          </div>
          <div className="text-xs text-muted-foreground">
            📍 {routeHistory.length} pontos • {(totalDistance / 1000).toFixed(1)} km
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMotoboyMap;
