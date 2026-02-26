// Shared types for MotoExtraMap
export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MotoExtraMapProps {
  className?: string;
  zoom?: number;
  showUserLocation?: boolean;
  center?: MapCoordinates;
}

// capacitor-google-map custom element is typed by @capacitor/google-maps
