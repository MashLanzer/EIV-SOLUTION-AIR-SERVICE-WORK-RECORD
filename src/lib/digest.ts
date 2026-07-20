// Plain-language financial digest: turns the numbers from getFinancials into a
// short, human summary. Pure + framework-free — it decides *which* sentences
// appear and their tone/trend; the page maps each line's `key` to a localized
// template and formats the money tokens.

export interface DigestInput {
  revenue: number;
  prevRevenue: number;
  labor: number;
  grossProfit: number;
  margin: number; // percent
  outstanding: number;
  overdueAmount: number;
  overdueCount: number;
  jobCount: number;
  topCustomer: { name: string; total: number } | null;
  goalPct: number | null;
}

export type DigestTone = "good" | "bad" | "neutral";

export interface DigestLine {
  // A key under the `digest` i18n namespace.
  key: string;
  tone: DigestTone;
  values: Record<string, string | number>;
}

// Value tokens that should be rendered as currency by the page.
export const DIGEST_MONEY_TOKENS = new Set([
  "revenue",
  "labor",
  "grossProfit",
  "outstanding",
  "overdue",
  "total",
]);

export function buildDigest(input: DigestInput): DigestLine[] {
  const lines: DigestLine[] = [];

  // 1) Revenue, compared with the previous like-for-like window.
  if (input.prevRevenue > 0) {
    const delta = Math.round(((input.revenue - input.prevRevenue) / input.prevRevenue) * 100);
    if (delta >= 1) {
      lines.push({ key: "revenueUp", tone: "good", values: { revenue: input.revenue, deltaPct: delta } });
    } else if (delta <= -1) {
      lines.push({
        key: "revenueDown",
        tone: "bad",
        values: { revenue: input.revenue, deltaPct: Math.abs(delta) },
      });
    } else {
      lines.push({ key: "revenueFlat", tone: "neutral", values: { revenue: input.revenue } });
    }
  } else {
    lines.push({ key: "revenueOnly", tone: "neutral", values: { revenue: input.revenue } });
  }

  // 2) Profit after labor (only meaningful once there's revenue). The loss case
  // passes the magnitude so the template reads "a loss of {grossProfit}".
  if (input.revenue > 0) {
    const positive = input.grossProfit >= 0;
    lines.push({
      key: positive ? "profitPositive" : "profitNegative",
      tone: positive ? "good" : "bad",
      values: { labor: input.labor, grossProfit: Math.abs(input.grossProfit), margin: input.margin },
    });
  }

  // 3) Money still owed, flagging any overdue portion.
  if (input.outstanding > 0) {
    if (input.overdueAmount > 0) {
      lines.push({
        key: "owedWithOverdue",
        tone: "bad",
        values: {
          outstanding: input.outstanding,
          overdue: input.overdueAmount,
          overdueCount: input.overdueCount,
        },
      });
    } else {
      lines.push({ key: "owedClean", tone: "neutral", values: { outstanding: input.outstanding } });
    }
  }

  // 4) Throughput.
  if (input.jobCount > 0) {
    lines.push({ key: "jobs", tone: "neutral", values: { jobs: input.jobCount } });
  }

  // 5) Top customer of the window.
  if (input.topCustomer && input.topCustomer.total > 0) {
    lines.push({
      key: "topCustomer",
      tone: "neutral",
      values: { name: input.topCustomer.name, total: input.topCustomer.total },
    });
  }

  // 6) Revenue-goal progress.
  if (input.goalPct != null) {
    lines.push({
      key: input.goalPct >= 100 ? "goalHit" : "goalProgress",
      tone: input.goalPct >= 100 ? "good" : "neutral",
      values: { goalPct: input.goalPct },
    });
  }

  return lines;
}
