export type TransportMode = 'DRIVING' | 'WALKING' | 'BICYCLE';

export interface ItineraryOrigin {
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  customOrigin: boolean;
}

export interface ItineraryStep {
  stepNumber: number;
  storeUid: string;
  storeName: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceFromPreviousKm: number;
  travelTimeMinutes: number;
  estimatedArrivalTime: string;
  isOpenAtArrival: boolean;
  isClosedAllDay: boolean;
  isSameLocationAsPrevious: boolean;
  scheduleInfo: string;
  warningAlert?: string | null;
}

export interface OptimizeItineraryRequest {
  storeUids: string[];
  originLatitude?: number | null;
  originLongitude?: number | null;
  originAddress?: string | null;
  transportMode?: TransportMode;
  departureTime?: string | null;
}

export interface OptimizeItineraryResponse {
  origin: ItineraryOrigin;
  destination: ItineraryStep;
  orderedSteps: ItineraryStep[];
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  transportMode: TransportMode;
  googleMapsUrl: string;
  waypointsTruncated: boolean;
  warnings: string[];
}
