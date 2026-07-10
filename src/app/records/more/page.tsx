import Link from "next/link";
import { ChevronRight, Settings, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/session";

interface MoreLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export default async function WorkerMorePage() {
  const session = await requireAuth();
  const name = session.user.name ?? session.user.email ?? "";

  const links: MoreLink[] = [
    { href: "/records/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">More</h1>
        {name && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{name}</p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="flex flex-col">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3.5 last:border-0 active:bg-neutral-50 dark:active:bg-neutral-800"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {link.label}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
