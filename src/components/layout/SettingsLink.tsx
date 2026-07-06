"use client";

import { Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function SettingsLink({ href }: { href: string }) {
  return (
    <Button asChild type="button" variant="outline" size="sm">
      <Link href={href}>
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Settings</span>
      </Link>
    </Button>
  );
}
