import Link from "next/link";

import { LogoutButton } from "@/components/layout/LogoutButton";

export function AdminNav({ name }: { name: string }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-semibold text-slate-900">
            EIV Solution Air
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/records" className="text-slate-600 hover:text-slate-900">
              Records
            </Link>
            <Link href="/admin/workers" className="text-slate-600 hover:text-slate-900">
              Workers
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-500 sm:inline">{name}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
