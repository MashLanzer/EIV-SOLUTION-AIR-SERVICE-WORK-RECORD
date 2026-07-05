import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/layout/LogoutButton";

export function WorkerNav({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/records">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">{name}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
