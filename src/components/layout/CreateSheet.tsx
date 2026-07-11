"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { BottomSheet } from "@/components/layout/BottomSheet";

export interface CreateItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// The "create" actions for the current role, in a bottom sheet opened by the
// center FAB in AppTabBar.
export function CreateSheet({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CreateItem[];
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Create" title="Create">
      <ul className="flex flex-col px-2 pb-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
