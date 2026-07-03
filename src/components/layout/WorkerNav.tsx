import Link from "next/link";

import { LogoutButton } from "@/components/layout/LogoutButton";

export function WorkerNav({ name }: { name: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/records" className="font-semibold text-slate-900">
          EIV Solution Air
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-500 sm:inline">{name}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
