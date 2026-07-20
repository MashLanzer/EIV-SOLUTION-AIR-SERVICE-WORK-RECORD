import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DigestTone } from "@/lib/digest";
import { cn } from "@/lib/utils";

const DOT: Record<DigestTone, string> = {
  good: "bg-emerald-500",
  bad: "bg-red-500",
  neutral: "bg-neutral-400 dark:bg-neutral-500",
};

// A plain-language summary of the period's finances: one short sentence per
// insight, each with a tone dot. Presentational — the page resolves the copy.
export function FinancialDigest({
  heading,
  lines,
}: {
  heading: string;
  lines: { text: string; tone: DigestTone }[];
}) {
  if (lines.length === 0) return null;
  return (
    <Card className="animate-fade-up">
      <CardContent className="flex flex-col gap-3 p-4">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <Sparkles className="h-3.5 w-3.5" />
          {heading}
        </span>
        <ul className="flex flex-col gap-2">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-200">
              <span
                className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT[l.tone])}
                aria-hidden="true"
              />
              <span className="leading-snug">{l.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
