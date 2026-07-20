// Revenue forecast from a monthly history, with a widening confidence band.
// A least-squares trend line projects the next few months; the band comes from
// the fit's residual spread (how noisy the history is) and grows with distance.
// Pure + framework-free so it's unit-testable.

export interface ForecastPoint {
  // Months ahead: 1 = next month.
  step: number;
  value: number;
  low: number;
  high: number;
}

export interface ForecastResult {
  // The fitted trend value at each historical point (for drawing the line).
  fit: number[];
  points: ForecastPoint[];
  // Trend direction over the history: per-month slope (money).
  slope: number;
  // Goodness of fit as a 0-100 percent (R², clamped). Higher = tighter trend.
  confidencePct: number;
}

// 80% band (z ≈ 1.28). Wide enough to be honest about uncertainty without
// swamping the projection.
const Z = 1.2816;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Ordinary least squares on points (i, history[i]) for i = 0..n-1.
function fitLine(history: number[]): { a: number; b: number } {
  const n = history.length;
  const meanX = (n - 1) / 2;
  const meanY = history.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (history[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = meanY - b * meanX;
  return { a, b };
}

export function forecastRevenue(history: number[], periods = 3): ForecastResult {
  const clean = history.map((v) => (Number.isFinite(v) ? v : 0));
  const n = clean.length;

  // Not enough points to fit a trend: flat-line the last known value with no
  // band, so callers still get a sensible shape.
  if (n < 2) {
    const base = n === 1 ? clean[0] : 0;
    return {
      fit: clean.slice(),
      points: Array.from({ length: periods }, (_, k) => ({
        step: k + 1,
        value: round2(base),
        low: round2(base),
        high: round2(base),
      })),
      slope: 0,
      confidencePct: 0,
    };
  }

  const { a, b } = fitLine(clean);
  const fit = clean.map((_, i) => a + b * i);

  // Residual spread (sample standard deviation of the fit errors).
  const meanY = clean.reduce((s, y) => s + y, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (clean[i] - fit[i]) ** 2;
    ssTot += (clean[i] - meanY) ** 2;
  }
  const stdErr = Math.sqrt(ssRes / Math.max(1, n - 2));
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  const points: ForecastPoint[] = Array.from({ length: periods }, (_, k) => {
    const step = k + 1;
    const value = a + b * (n - 1 + step);
    // The band widens the further out we project.
    const band = Z * stdErr * (1 + (step - 1) * 0.35);
    return {
      step,
      value: round2(Math.max(0, value)),
      low: round2(Math.max(0, value - band)),
      high: round2(Math.max(0, value + band)),
    };
  });

  return {
    fit: fit.map(round2),
    points,
    slope: round2(b),
    confidencePct: Math.round(r2 * 100),
  };
}
