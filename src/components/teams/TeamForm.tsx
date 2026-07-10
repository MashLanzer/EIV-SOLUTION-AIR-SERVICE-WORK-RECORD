"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTeamAction,
  updateTeamAction,
  type TeamFormState,
} from "@/actions/teams";

export function TeamForm({
  teamId,
  defaultName,
}: {
  teamId?: string;
  defaultName?: string;
}) {
  const action = teamId ? updateTeamAction.bind(null, teamId) : createTeamAction;
  const [state, formAction, pending] = useActionState<TeamFormState, FormData>(
    action,
    undefined
  );

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
