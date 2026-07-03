"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { loginAction, type LoginState } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="e.g. carlos"
          required
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <Button type="submit" size="lg" disabled={pending}>
        <LogIn className="h-4 w-4" />
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
