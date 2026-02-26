import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = "AIzaSyBXfRcuKCrNHDYY3cJL9JKMa8gaSV3LVes";

interface MapContentProps {
  coordinates: {
    lat: number;
    lng: number;
  };
  restaurantName: string;
  address: string;
}

const MapContent = ({ coordinates, restaurantName, address }: MapContentProps) => {
  const center = { lat: coordinates.lat, lng: coordinates.lng };

  return (
    <div className="h-48 w-full">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={center}
          defaultZoom={15}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapId="offer-location-map"
          style={{ width: "100%", height: "100%" }}
        >
          <AdvancedMarker position={center} title={restaurantName || address}>
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg flex items-center justify-center border-2 border-background">
                <span className="text-xl">📍</span>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rotate-45" />
            </div>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
};

export default MapContent;
