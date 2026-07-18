"use client";

import { useState } from "react";
import { ChevronRight, Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { PositionForm } from "@/components/roles/PositionForm";
import { DeletePositionButton } from "@/components/roles/DeletePositionButton";
import { duplicatePositionAction } from "@/actions/positions";
import { useT } from "@/components/i18n/LocaleProvider";
import { TEAM_COLORS } from "@/lib/teamColors";
import type { AccessLevel } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export interface RolePosition {
  id: string;
  name: string;
  color: string | null;
  accessLevel: AccessLevel;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
}

// A position row that opens an edit sheet (form + delete for custom roles).
export function EditRoleSheet({ position }: { position: RolePosition }) {
  const t = useT().roles;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  const dot = TEAM_COLORS.find((c) => c.key === position.color)?.dot ?? "bg-neutral-400";

  const members =
    position.memberCount === 1
      ? t.memberCountOne.replace("{n}", "1")
      : t.memberCountMany.replace("{n}", String(position.memberCount));
  const perms =
    position.permissions.length === 0
      ? t.noPermissions
      : position.permissions.length === 1
        ? t.permCountOne.replace("{n}", "1")
        : t.permCountMany.replace("{n}", String(position.permissions.length));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
              {position.name}
            </span>
            {position.isSystem && <Badge variant="secondary">{t.builtIn}</Badge>}
          </div>
          <div className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
            {members} · {perms}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.editRole} closeLabel={tc.close}>
        <div className="flex flex-col gap-4">
          <PositionForm
            positionId={position.id}
            isSystem={position.isSystem}
            defaultValues={{
              name: position.name,
              color: position.color,
              accessLevel: position.accessLevel,
              permissions: position.permissions,
            }}
          />
          <div className="flex items-center gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <form action={duplicatePositionAction.bind(null, position.id)}>
              <Button type="submit" variant="outline" size="sm">
                <Copy className="h-4 w-4" />
                {t.duplicate}
              </Button>
            </form>
            {!position.isSystem && (
              <div className="ml-auto">
                <DeletePositionButton positionId={position.id} />
              </div>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
