// Best-effort address -> coordinates using OpenStreetMap's free Nominatim
// service. Never throws: geocoding failing (rate limit, no match, network)
// just leaves a project without a map pin, it never blocks saving.
//
// Nominatim's usage policy asks for a descriptive User-Agent and no more than
// ~1 request/second; project saves are infrequent enough to stay well under.
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(
  address: string
): Promise<GeoPoint | null> {
  const q = address.trim();
  if (!q) return null;

  try {
    const url = `${ENDPOINT}?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EIV-Solution-Air-Work-Record/1.0 (project geocoding)",
        Accept: "application/json",
      },
      // Don't let a slow geocoder hang the save.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const hit = data[0];
    if (!hit) return null;
    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}
