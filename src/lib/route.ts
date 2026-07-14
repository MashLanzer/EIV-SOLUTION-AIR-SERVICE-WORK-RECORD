// Great-circle distance between two lat/lng points, in kilometres.
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Total distance of visiting the points in the given order (km).
export function routeLengthKm(points: { lat: number; lng: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

// Order stops to shorten the drive: a greedy nearest-neighbour tour starting
// from the first stop (the day's first timed job — where the crew begins).
// Not the optimal TSP, but a solid, cheap heuristic for a handful of stops.
export function orderByRoute<T extends { lat: number; lng: number }>(points: T[]): T[] {
  if (points.length <= 2) return points.slice();
  const remaining = points.slice();
  const route: T[] = [remaining.shift() as T];
  while (remaining.length) {
    const current = route[route.length - 1];
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    route.push(remaining.splice(bestIdx, 1)[0]);
  }
  return route;
}
