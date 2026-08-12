/**
 * Reset business data — wipes a company's operational records so you can start
 * fresh, WITHOUT deleting the companies themselves, their users/employees,
 * roles (Positions), or the platform/console data.
 *
 * SAFE BY DESIGN:
 *  - Runs inside a single transaction: if any delete fails (e.g. a foreign-key
 *    order issue), the whole thing rolls back and NOTHING is deleted.
 *  - Refuses to run unless you pass --yes.
 *  - Prints row counts before and after.
 *
 * THIS IS IRREVERSIBLE. Take a database backup first.
 *
 * Run it against the target database, e.g.:
 *   DATABASE_URL="postgresql://…"  npx tsx prisma/reset-business-data.ts --yes
 *
 * KEEPS (not touched):
 *   Organization, User, Position, Team, TeamMembership, UserSkill, OrgSkill,
 *   WorkType(+Category), ChecklistTemplate(+Item), Tag, Material,
 *   ExpenseCategory, ExpenseRule, Announcement, ImpersonationSession,
 *   PlatformAdmin, PlatformSavedView, OrgNote, OrgReminder, PlatformMessage,
 *   and platform-level AuditEvents (organizationId = null).
 *
 * DELETES (all rows):
 *   Customer, Project, WorkRecord, Photo/WorkPhoto/PhotoTag, Checklist(+Item)
 *   instances, Comment, Invoice(+LineItem), Estimate(+LineItem), ScheduledJob
 *   (+JobStatusEvent), TimeOff, Expense, MileageEntry, RecordMaterial,
 *   RecordReviewEvent, RoleChangeEvent, PinnedProject, NativeHandoffCode,
 *   Notification, and company-scoped AuditEvents (organizationId != null).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tables cleared, leaf-first so foreign keys never block a delete. Keys are
// Prisma model accessors (camelCase). Order matters.
const CLEAR_IN_ORDER = [
  "recordMaterial",
  "workPhoto",
  "photoTag",
  "checklistItem",
  "checklist",
  "comment",
  "recordReviewEvent",
  "jobStatusEvent",
  "invoiceLineItem",
  "estimateLineItem",
  "nativeHandoffCode",
  "pinnedProject",
  "notification",
  "timeOff",
  "expense",
  "mileageEntry",
  "roleChangeEvent",
  "scheduledJob",
  "invoice",
  "estimate",
  "photo",
  "workRecord",
  "project",
  "customer",
] as const;

// Models we KEEP but want to show counts for, so you can confirm nothing that
// should survive got touched.
const PRESERVED = ["organization", "user", "position", "team"] as const;

async function counts(models: readonly string[]) {
  const out: Record<string, number> = {};
  for (const m of models) {
    // @ts-expect-error dynamic model access
    out[m] = await prisma[m].count();
  }
  return out;
}

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(
      "\nRefusing to run without --yes.\n" +
        "This permanently deletes all business data (customers, work records, projects,\n" +
        "invoices, estimates, schedule, photos, expenses, …) from EVERY company.\n" +
        "Companies, users/employees, roles and platform data are kept.\n\n" +
        "Back up your database first, then re-run:\n" +
        "  DATABASE_URL=\"…\" npx tsx prisma/reset-business-data.ts --yes\n"
    );
    process.exit(1);
  }

  const before = await counts([...CLEAR_IN_ORDER, ...PRESERVED]);
  console.log("\nBefore:");
  console.table(before);

  console.log("\nDeleting business data in a transaction…");
  const deleted = await prisma.$transaction(async (tx) => {
    const result: Record<string, number> = {};
    for (const m of CLEAR_IN_ORDER) {
      // @ts-expect-error dynamic model access
      const { count } = await tx[m].deleteMany({});
      result[m] = count;
    }
    // Company-scoped audit log only; platform events (organizationId = null) stay.
    const audit = await tx.auditEvent.deleteMany({ where: { organizationId: { not: null } } });
    result["auditEvent (company)"] = audit.count;
    return result;
  });

  console.log("\nDeleted rows:");
  console.table(deleted);

  const after = await counts([...CLEAR_IN_ORDER, ...PRESERVED]);
  console.log("\nAfter:");
  console.table(after);

  const kept = await counts(PRESERVED);
  console.log(
    `\nDone. Kept ${kept.organization} company/companies, ${kept.user} users, ` +
      `${kept.position} roles, ${kept.team} teams. Business data is now empty.\n`
  );
}

main()
  .catch((e) => {
    console.error("\nFailed — nothing was deleted (transaction rolled back):\n", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
