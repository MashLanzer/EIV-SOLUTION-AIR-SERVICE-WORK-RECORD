import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Contact,
  ListChecks,
  Settings,
  Users,
  Users2,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

interface MoreLink {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export default async function AdminMorePage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const pendingReviewCount = await prisma.workRecord.count({
    where: { organizationId, status: "SUBMITTED" },
  });

  const links: MoreLink[] = [
    { href: "/admin/records", label: "Records", icon: ClipboardList, badge: pendingReviewCount },
    { href: "/admin/customers", label: "Customers", icon: Contact },
    { href: "/admin/reports", label: "Pay Report", icon: BarChart3 },
    { href: "/admin/workers", label: "Workers", icon: Users },
    { href: "/admin/teams", label: "Teams", icon: Users2 },
    { href: "/admin/checklists", label: "Checklist templates", icon: ListChecks },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">More</h1>

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
                    {link.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white tabular-nums">
                        {link.badge > 99 ? "99+" : link.badge}
                      </span>
                    ) : null}
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
