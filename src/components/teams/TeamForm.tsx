"use client";

import { useActionState, useState } from "react";
import { Check, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTeamAction,
  updateTeamAction,
  type TeamFormState,
} from "@/actions/teams";
import { TEAM_COLORS } from "@/lib/teamColors";
import { cn } from "@/lib/utils";

export function TeamForm({
  teamId,
  defaultName,
  defaultColor,
}: {
  teamId?: string;
  defaultName?: string;
  defaultColor?: string | null;
}) {
  const action = teamId ? updateTeamAction.bind(null, teamId) : createTeamAction;
  const [state, formAction, pending] = useActionState<TeamFormState, FormData>(
    action,
    undefined
  );
  const [color, setColor] = useState<string>(defaultColor ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" required>
          Team name
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultName}
          placeholder="e.g. Install Crew A"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Color</Label>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {TEAM_COLORS.map((c) => {
            const selected = c.key === color;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(selected ? "" : c.key)}
                aria-label={c.label}
                aria-pressed={selected}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105",
                  c.dot,
                  selected && "ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100 ring-offset-white dark:ring-offset-neutral-900"
                )}
              >
                {selected && <Check className="h-4 w-4 text-white" />}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Shown as a dot next to the team and on its project cards.
        </p>
      </div>

      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <div>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Saving..." : teamId ? "Save team" : "Create team"}
        </Button>
      </div>
    </form>
  );
}
