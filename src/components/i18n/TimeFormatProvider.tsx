"use client";

import { createContext, useContext, type ReactNode } from "react";

// The org's 12/24-hour time preference, seeded once per authenticated layout
// from the server-resolved setting so client components (the schedule cards)
// render times the same way the server does. Defaults to false (12-hour) when
// no provider is present, so it degrades safely rather than throwing.
const TimeFormatContext = createContext<boolean>(false);

export function TimeFormatProvider({
  use24,
  children,
}: {
  use24: boolean;
  children: ReactNode;
}) {
  return <TimeFormatContext.Provider value={use24}>{children}</TimeFormatContext.Provider>;
}

// True when times should render in 24-hour form. Pair with formatTime:
// formatTime(job.startTime, useUse24Hour()).
export function useUse24Hour(): boolean {
  return useContext(TimeFormatContext);
}
