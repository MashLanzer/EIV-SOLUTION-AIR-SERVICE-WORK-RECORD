import { describe, expect, it } from "vitest";

import { haversineKm, orderByRoute, routeLengthKm } from "@/lib/route";

describe("haversineKm", () => {
  it("is ~0 for the same point", () => {
    expect(haversineKm({ lat: 40, lng: -74 }, { lat: 40, lng: -74 })).toBeCloseTo(0, 5);
  });

  it("matches a known distance (roughly NYC↔LA ~3936 km)", () => {
    const d = haversineKm({ lat: 40.7128, lng: -74.006 }, { lat: 34.0522, lng: -118.2437 });
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(3970);
  });
});

describe("orderByRoute", () => {
  it("returns the input for 0-2 points unchanged", () => {
    const pts = [{ id: "a", lat: 1, lng: 1 }];
    expect(orderByRoute(pts)).toEqual(pts);
    const two = [
      { id: "a", lat: 1, lng: 1 },
      { id: "b", lat: 2, lng: 2 },
    ];
    expect(orderByRoute(two).map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("visits nearest-first from the starting point", () => {
    // Points on a line; input is deliberately out of order after the start.
    const pts = [
      { id: "start", lat: 0, lng: 0 },
      { id: "far", lat: 0, lng: 3 },
      { id: "mid", lat: 0, lng: 2 },
      { id: "near", lat: 0, lng: 1 },
    ];
    expect(orderByRoute(pts).map((p) => p.id)).toEqual(["start", "near", "mid", "far"]);
  });

  it("never loses or duplicates a stop", () => {
    const pts = Array.from({ length: 6 }, (_, i) => ({ id: String(i), lat: i, lng: -i }));
    const out = orderByRoute(pts);
    expect(new Set(out.map((p) => p.id))).toEqual(new Set(pts.map((p) => p.id)));
    expect(out).toHaveLength(pts.length);
  });

  it("greedy order is no longer than the naive input order", () => {
    const pts = [
      { id: "s", lat: 0, lng: 0 },
      { id: "a", lat: 0, lng: 3 },
      { id: "b", lat: 0, lng: 1 },
      { id: "c", lat: 0, lng: 2 },
    ];
    expect(routeLengthKm(orderByRoute(pts))).toBeLessThanOrEqual(routeLengthKm(pts));
  });
});
