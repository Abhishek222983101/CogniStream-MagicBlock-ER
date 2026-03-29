export interface Coordinates {
  lat: number;
  lon: number;
}

export interface DistanceResult {
  distance: number;
  duration: number;
  distanceText: string;
  durationText: string;
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  displayName: string;
}

const OSRM_BASE_URL = "https://router.project-osrm.org";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "User-Agent": "CoherenceTrialMatch/1.0",
        },
      }
    );
    
    if (!response.ok) {
      console.error("Geocoding failed:", response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function calculateDrivingDistance(
  origin: Coordinates,
  destination: Coordinates
): Promise<DistanceResult | null> {
  try {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("OSRM request failed:", response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceMeters = route.distance;
      const distanceMiles = distanceMeters * 0.000621371;
      const durationSeconds = route.duration;
      const durationMinutes = Math.round(durationSeconds / 60);
      
      return {
        distance: Math.round(distanceMiles * 10) / 10,
        duration: durationMinutes,
        distanceText: formatDistance(distanceMiles),
        durationText: formatDuration(durationMinutes),
      };
    }
    
    return null;
  } catch (error) {
    console.error("Distance calculation error:", error);
    return null;
  }
}

export function calculateHaversineDistance(
  origin: Coordinates,
  destination: Coordinates
): number {
  const R = 3959;
  const dLat = toRad(destination.lat - origin.lat);
  const dLon = toRad(destination.lon - origin.lon);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) *
      Math.cos(toRad(destination.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDistance(meters: number): string {
  if (meters < 1609.34) {
    return `${Math.round(meters)} m`;
  }
  const miles = meters * 0.000621371;
  return `${miles.toFixed(1)} mi`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export async function calculateDistancesForTrials(
  patientLocation: string,
  trials: Array<{ location: string; name: string }>,
  radiusMiles: number = 100
): Promise<
  Array<{
    name: string;
    location: string;
    withinRadius: boolean;
    distance: number;
    distanceText: string;
    durationText: string;
    coordinates: Coordinates | null;
  }>
> {
  const patientCoords = await geocodeAddress(patientLocation);
  
  if (!patientCoords) {
    console.error("Could not geocode patient location:", patientLocation);
    return trials.map((trial) => ({
      ...trial,
      withinRadius: false,
      distance: -1,
      distanceText: "N/A",
      durationText: "N/A",
      coordinates: null,
    }));
  }
  
  const results = await Promise.all(
    trials.map(async (trial) => {
      const trialCoords = await geocodeAddress(trial.location);
      
      if (!trialCoords) {
        return {
          ...trial,
          withinRadius: false,
          distance: -1,
          distanceText: "N/A",
          durationText: "N/A",
          coordinates: null,
        };
      }
      
      const drivingResult = await calculateDrivingDistance(
        patientCoords,
        trialCoords
      );
      
      let distance: number;
      let distanceText: string;
      let durationText: string;
      
      if (drivingResult) {
        distance = drivingResult.distance;
        distanceText = drivingResult.distanceText;
        durationText = drivingResult.durationText;
      } else {
        distance = calculateHaversineDistance(patientCoords, trialCoords);
        distanceText = `${distance} mi`;
        durationText = "N/A";
      }
      
      return {
        ...trial,
        withinRadius: distance <= radiusMiles,
        distance,
        distanceText,
        durationText,
        coordinates: trialCoords,
      };
    })
  );
  
  return results;
}

export const SAMPLE_LOCATIONS = {
  "Boston, MA": { lat: 42.3601, lon: -71.0589 },
  "Baltimore, MD": { lat: 39.2904, lon: -76.6122 },
  "New York, NY": { lat: 40.7128, lon: -74.006 },
  "Los Angeles, CA": { lat: 34.0522, lon: -118.2437 },
  "Chicago, IL": { lat: 41.8781, lon: -87.6298 },
  "Houston, TX": { lat: 29.7604, lon: -95.3698 },
  "Phoenix, AZ": { lat: 33.4484, lon: -112.074 },
  "Philadelphia, PA": { lat: 39.9526, lon: -75.1652 },
  "San Antonio, TX": { lat: 29.4241, lon: -98.4936 },
  "San Diego, CA": { lat: 32.7157, lon: -117.1611 },
};

export function getCoordinatesForLocation(location: string): Coordinates | null {
  const normalizedLocation = location.trim();
  
  if (normalizedLocation in SAMPLE_LOCATIONS) {
    return SAMPLE_LOCATIONS[normalizedLocation as keyof typeof SAMPLE_LOCATIONS];
  }
  
  return null;
}
