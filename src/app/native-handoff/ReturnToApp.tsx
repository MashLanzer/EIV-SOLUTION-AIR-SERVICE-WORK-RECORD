"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ReturnToApp({ deepLink }: { deepLink: string }) {
  useEffect(() => {
    // Auto-attempt; if the browser blocks a scheme navigation without a
    // user gesture, the button below is the fallback.
    window.location.href = deepLink;
  }, [deepLink]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-success-soft text-green-700">
            <CheckCircle2 className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <CardTitle className="text-xl">You&apos;re signed in</CardTitle>
          <CardDescription>
            Returning to the EIV Solution Air app...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full">
            <a href={deepLink}>Return to the app</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
