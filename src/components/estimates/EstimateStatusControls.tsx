"use client";

import type { EstimateStatus } from "@prisma/client";
import { Ban, CheckCircle2, RotateCcw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setEstimateStatusAction } from "@/actions/estimates";
import { useT } from "@/components/i18n/LocaleProvider";

function transitionsFor(status: EstimateStatus): {
  status: EstimateStatus;
  labelKey: "markSent" | "markAccepted" | "markDeclined" | "reopen";
  icon: typeof Send;
  variant?: "outline" | "destructive";
}[] {
  switch (status) {
    case "DRAFT":
      return [
        { status: "SENT", labelKey: "markSent", icon: Send, variant: "outline" },
        { status: "ACCEPTED", labelKey: "markAccepted", icon: CheckCircle2 },
      ];
    case "SENT":
      return [
        { status: "ACCEPTED", labelKey: "markAccepted", icon: CheckCircle2 },
        { status: "DECLINED", labelKey: "markDeclined", icon: Ban, variant: "outline" },
        { status: "DRAFT", labelKey: "reopen", icon: RotateCcw, variant: "outline" },
      ];
    case "ACCEPTED":
    case "DECLINED":
      return [{ status: "DRAFT", labelKey: "reopen", icon: RotateCcw, variant: "outline" }];
    default:
      return [];
  }
}

export function EstimateStatusControls({
  estimateId,
  status,
}: {
  estimateId: string;
  status: EstimateStatus;
}) {
  const t = useT().estimates;
  const transitions = transitionsFor(status);
  if (transitions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((tr) => {
        const Icon = tr.icon;
        return (
          <form key={tr.status} action={setEstimateStatusAction.bind(null, estimateId, tr.status)}>
            <Button type="submit" size="sm" variant={tr.variant}>
              <Icon className="h-4 w-4" />
              {t[tr.labelKey]}
            </Button>
          </form>
        );
      })}
    </div>
  );
}
