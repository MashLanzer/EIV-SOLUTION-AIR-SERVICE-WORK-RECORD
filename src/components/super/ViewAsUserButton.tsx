"use client";

import { useFormStatus } from "react-dom";
import { Eye } from "lucide-react";

import { enterOrgAction } from "@/actions/impersonation";
import { cn } from "@/lib/utils";

// Per-user action in a company's Users list: start "viewing as" that exact
// person — the owner's session becomes them, with their real role and
// permissions, to reproduce a bug or give fine-grained support. Bound to the
// same server action as full support, with the user's id as the target.
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      )}
    >
      <Eye className="h-3.5 w-3.5" />
      {pending ? "Entering…" : "View as"}
    </button>
  );
}

export function ViewAsUserButton({ orgId, userId }: { orgId: string; userId: string }) {
  return (
    <form action={enterOrgAction.bind(null, orgId, "FULL", userId)}>
      <Submit />
    </form>
  );
}
