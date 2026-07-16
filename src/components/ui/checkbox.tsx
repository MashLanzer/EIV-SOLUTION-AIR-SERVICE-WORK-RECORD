"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// A monochrome, theme-aware checkbox that reads as part of the app instead of
// the browser's default white box. It stays a real <input type="checkbox"> (so
// name/value/defaultChecked/onChange all pass through and forms submit it), but
// the native control is painted over: appearance-none for the box, an overlaid
// check that fades in when checked. Drop-in for `<input type="checkbox">`.
export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        className={cn(
          "peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-neutral-300 bg-white transition-colors",
          "checked:border-neutral-900 checked:bg-neutral-900",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-neutral-600 dark:bg-neutral-800 dark:checked:border-neutral-100 dark:checked:bg-neutral-100",
          className
        )}
        {...props}
      />
      <Check
        aria-hidden="true"
        strokeWidth={3}
        className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100 dark:text-neutral-900"
      />
    </span>
  );
}
