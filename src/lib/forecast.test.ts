import { describe, expect, it } from "vitest";

import { forecastRevenue } from "./forecast";

describe("forecastRevenue", () => {
  it("projects a perfect upward line with full confidence and no band", () => {
    const r = forecastRevenue([100, 200, 300, 400], 2);
    expect(r.slope).toBe(100);
    expect(r.confidencePct).toBe(100);
    expect(r.points[0].value).toBe(500);
    expect(r.points[1].value).toBe(600);
    // No residual noise → band collapses to the point.
    expect(r.points[0].low).toBe(500);
    expect(r.points[0].high).toBe(500);
  });

  it("widens the band with distance when the history is noisy", () => {
    const r = forecastRevenue([100, 400, 200, 500, 300, 600], 3);
    const b1 = r.points[0].high - r.points[0].low;
    const b3 = r.points[2].high - r.points[2].low;
    expect(b3).toBeGreaterThan(b1);
    expect(r.confidencePct).toBeLessThan(100);
  });

  it("never projects or bands below zero", () => {
    const r = forecastRevenue([300, 200, 100, 0], 3);
    for (const p of r.points) {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.low).toBeGreaterThanOrEqual(0);
    }
  });

  it("flat-lines a single data point with no band", () => {
    const r = forecastRevenue([250], 3);
    expect(r.slope).toBe(0);
    expect(r.points.every((p) => p.value === 250 && p.low === 250 && p.high === 250)).toBe(true);
  });

  it("handles an empty history", () => {
    const r = forecastRevenue([], 2);
    expect(r.points).toHaveLength(2);
    expect(r.points[0].value).toBe(0);
  });
});
