"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPlatformAdminAction,
  type AdminActionState,
} from "@/actions/platformAdmins";

// Add a platform admin by email. Owner-only (the server action re-checks); the
// added person gets console access but not the ability to manage this list.
export function AddPlatformAdminForm() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    addPlatformAdminAction,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          name="email"
          required
          placeholder="admin@company.com"
          aria-label="Admin email"
          className="flex-1"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          <UserPlus className="h-4 w-4" />
          {pending ? "Adding…" : "Add admin"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive-text">{state.error}</p>}
      {state.ok && <p className="text-sm text-success-text">Admin added.</p>}
    </form>
  );
}
