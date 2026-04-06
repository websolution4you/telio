/**
 * Google Roads API utilities for Telio Taxi Fleet.
 */

interface LatLng {
  lat: number;
  lng: number;
}

interface SnappedPoint {
  location: {
    latitude: number;
    longitude: number;
  };
  originalIndex?: number;
  placeId: string;
}

interface SnapToRoadsResponse {
  snappedPoints: SnappedPoint[];
}

/**
 * Snaps raw GPS coordinates to the nearest road.
 * @param points Array of raw coordinates
 * @returns Array of snapped coordinates
 */
export async function snapToRoads(points: LatLng[]): Promise<LatLng[]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Roads API: Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
    return points;
  }

  // Optimize: skip Roads API if only one point and it's 0,0
  if (points.length === 0) return [];

  const pathStr = points.map(p => `${p.lat},${p.lng}`).join('|');
  const url = `https://roads.googleapis.com/v1/snapToRoads?path=${pathStr}&interpolate=true&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Roads API Error (${response.status}):`, errorText);
      return points; // Fallback to raw points
    }

    const data: SnapToRoadsResponse = await response.json();
    
    if (!data.snappedPoints || data.snappedPoints.length === 0) {
      return points;
    }

    // Map back to our LatLng format
    return data.snappedPoints.map(sp => ({
      lat: sp.location.latitude,
      lng: sp.location.longitude
    }));

  } catch (err) {
    console.error("Roads API: Fetch failed", err);
    return points;
  }
}
