"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";

import { submitReceiptRatingAction, type RatingState } from "@/actions/receipt";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// Light-only (the receipt page has no dark mode). Interactive 1-5 stars plus
// an optional comment, posted to the token-gated public action.
export function ReceiptRatingForm({ token }: { token: string }) {
  const t = useT().receipt;
  const [state, formAction, pending] = useActionState<RatingState, FormData>(
    submitReceiptRatingAction.bind(null, token),
    undefined
  );
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-center">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={cn(
                "h-6 w-6",
                n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
              )}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-neutral-900">{t.ratingThanks}</p>
      </div>
    );
  }

  const shown = hover || rating;

  return (
    <form
      action={formAction}
      className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-5"
    >
      <p className="text-sm font-semibold text-neutral-900">{t.rateTitle}</p>
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={t.starAria.replace("{n}", String(n))}
            aria-pressed={rating === n}
            onMouseEnter={() => setHover(n)}
            onClick={() => setRating(n)}
            className="rounded p-1 transition-transform active:scale-90"
          >
            <Star
              className={cn(
                "h-8 w-8 transition-colors",
                n <= shown ? "fill-amber-400 text-amber-400" : "text-neutral-300"
              )}
            />
          </button>
        ))}
      </div>
      {rating === 0 ? (
        <p className="text-xs text-neutral-400">{t.rateHint}</p>
      ) : (
        <>
          <textarea
            name="feedback"
            rows={3}
            placeholder={t.feedbackPlaceholder}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
          >
            {t.submitRating}
          </button>
        </>
      )}
    </form>
  );
}
