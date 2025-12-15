import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapContentProps {
  coordinates: {
    lat: number;
    lng: number;
  };
  restaurantName: string;
  address: string;
}

const MapContent = ({ coordinates, restaurantName, address }: MapContentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return;

    // Initialize map using vanilla Leaflet
    const map = L.map(mapRef.current).setView([coordinates.lat, coordinates.lng], 15);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Custom marker icon
    const customIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Add marker with popup
    const marker = L.marker([coordinates.lat, coordinates.lng], { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div style="text-align: center;">
        <strong>${restaurantName}</strong><br/>
        <span style="font-size: 12px;">${address}</span>
      </div>
    `);

    // Disable scroll zoom
    map.scrollWheelZoom.disable();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, coordinates.lat, coordinates.lng, restaurantName, address]);

  if (!isClient) {
    return <div className="h-48 w-full bg-muted animate-pulse" />;
  }

  return <div ref={mapRef} className="h-48 w-full" />;
};

export default MapContent;
