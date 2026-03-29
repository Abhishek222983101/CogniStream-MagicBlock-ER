export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distance: string;
  distanceValue: number;
  duration: string;
  durationValue: number;
}

export interface GeoLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const INDIAN_CITIES: GeoLocation[] = [
  { city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  { city: "New Delhi", state: "Delhi", lat: 28.7041, lng: 77.1025 },
  { city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Chandigarh", state: "Punjab", lat: 30.7333, lng: 76.7794 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Guwahati", state: "Assam", lat: 26.1445, lng: 91.7362 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
  { city: "Bhopal", state: "Madhya Pradesh", lat: 23.2599, lng: 77.4126 },
  { city: "Patna", state: "Bihar", lat: 25.5941, lng: 85.1376 },
  { city: " Kochi", state: "Kerala", lat: 9.9312, lng: 76.2673 },
  { city: "Vellore", state: "Tamil Nadu", lat: 12.9325, lng: 79.1328 },
  { city: "Nagpur", state: "Maharashtra", lat: 21.1458, lng: 79.0882 },
  { city: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 },
  { city: "Coimbatore", state: "Tamil Nadu", lat: 11.0168, lng: 76.9558 },
  { city: "Mangalore", state: "Karnataka", lat: 12.9180, lng: 74.8560 },
  { city: "Visakhapatnam", state: "Andhra Pradesh", lat: 17.6868, lng: 83.2185 },
  { city: "Trivandrum", state: "Kerala", lat: 8.5241, lng: 76.9366 },
  { city: "Jammu", state: "Jammu & Kashmir", lat: 32.7266, lng: 74.8570 },
  { city: "Dehradun", state: "Uttarakhand", lat: 30.3165, lng: 78.0322 },
  { city: "Ludhiana", state: "Punjab", lat: 30.9010, lng: 75.8573 },
  { city: "Rajkot", state: "Gujarat", lat: 22.3039, lng: 70.8022 },
  { city: "Surat", state: "Gujarat", lat: 21.1702, lng: 72.8311 },
  { city: "Vijayawada", state: "Andhra Pradesh", lat: 16.5062, lng: 80.6480 },
  { city: "Ranchi", state: "Jharkhand", lat: 23.3441, lng: 85.3095 },
  { city: "Cuttack", state: "Odisha", lat: 20.4625, lng: 85.8828 },
  { city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 },
  { city: "Jamshedpur", state: "Jharkhand", lat: 22.8015, lng: 86.2029 },
  { city: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lng: 74.7973 },
  { city: "Madurai", state: "Tamil Nadu", lat: 9.9252, lng: 78.1198 },
  { city: "Tiruchirappalli", state: "Tamil Nadu", lat: 10.7905, lng: 78.7045 },
  { city: " Mysore", state: "Karnataka", lat: 12.2958, lng: 76.6394 },
];

export const SAMPLE_COORDINATES: Record<string, Coordinates> = Object.fromEntries(
  INDIAN_CITIES.map(c => [`${c.city}, ${c.state}`, { lat: c.lat, lng: c.lng }])
);

export function getCityCoordinates(city: string, state?: string): Coordinates | null {
  const cityData = INDIAN_CITIES.find(c => 
    c.city.toLowerCase() === city.toLowerCase() ||
    c.city.toLowerCase().includes(city.toLowerCase())
  );
  if (cityData) {
    if (state && cityData.state.toLowerCase() !== state.toLowerCase()) {
      return null;
    }
    return { lat: cityData.lat, lng: cityData.lng };
  }
  return null;
}

export function calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371;
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function isWithinRadius(patientCoords: Coordinates, trialCoords: Coordinates, radiusKm: number): boolean {
  const distance = calculateHaversineDistance(patientCoords, trialCoords);
  return distance <= radiusKm;
}

export function getNearbyCities(center: Coordinates, radiusKm: number): GeoLocation[] {
  return INDIAN_CITIES.filter(city => {
    const distance = calculateHaversineDistance(center, { lat: city.lat, lng: city.lng });
    return distance <= radiusKm;
  });
}

const getApiKey = () => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.warn('Google Maps API key not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
    return '';
  }
  return apiKey;
};

export async function getDistanceMatrix(
  origins: string,
  destinations: string[]
): Promise<DistanceResult[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const destStr = destinations.join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements) {
      return data.rows[0].elements.map((element: any) => {
        if (element.status === 'OK') {
          return {
            distance: element.distance.text,
            distanceValue: element.distance.value,
            duration: element.duration.text,
            durationValue: element.duration.value,
          };
        }
        return {
          distance: 'N/A',
          distanceValue: -1,
          duration: 'N/A',
          durationValue: -1,
        };
      });
    }
    return null;
  } catch (error) {
    console.error('Distance Matrix API error:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function getCoordinatesForLocation(location: string): Coordinates | null {
  const normalizedLocation = location.trim();
  if (normalizedLocation in SAMPLE_COORDINATES) {
    return SAMPLE_COORDINATES[normalizedLocation];
  }
  const cityMatch = getCityCoordinates(normalizedLocation);
  if (cityMatch) return cityMatch;
  return null;
}
