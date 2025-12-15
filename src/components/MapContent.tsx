import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
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

interface MapContentProps {
  coordinates: {
    lat: number;
    lng: number;
  };
  restaurantName: string;
  address: string;
}

const MapContent = ({ coordinates, restaurantName, address }: MapContentProps) => {
  return (
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
  );
};

export default MapContent;
