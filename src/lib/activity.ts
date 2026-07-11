import { prisma } from "@/lib/prisma";

// The activity feed is derived on read from data the app already stores -
// there is no ActivityEvent table. Every event is a projection of an existing
// row's timestamp (a record's createdAt/approvedAt, a photo's takenAt, a
// comment's createdAt, ...), so the feed is always consistent with the data
// and needs no migration or write-path bookkeeping.
//
// Audience is strictly separated by role (see getActivityFeed):
//  - Admins see company-wide operational activity.
//  - Workers see only what happened to their OWN work (their records being
//    approved or returned, and comments on their photos) - never a coworker's.

export type ActivityType =
  | "record_submitted"
  | "record_approved"
  | "record_returned"
  | "photo_added"
  | "comment_added"
  | "project_created"
  | "worker_added"
  | "customer_added"
  | "team_added";

export interface ActivityEvent {
  // Stable per (row, kind) so React keys never collide when one record emits
  // both a "submitted" and an "approved" event.
  id: string;
  type: ActivityType;
  at: Date;
  title: string;
  detail?: string;
  actor?: string;
  href?: string;
}

export interface ActivityScope {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
}

// How far back / how many rows to pull from each source before merging. Small
// company scale, so a generous window per source is cheap and keeps the merged
// feed complete for the visible window.
const PER_SOURCE = 40;

function nameOr(person: { name: string | null } | null | undefined, fallback = "Someone") {
  return person?.name?.trim() || fallback;
}

// Admin: company-wide. Pulls the most recent rows from every source, projects
// each into one or more ActivityEvents, then the caller merges + sorts.
async function adminEvents(organizationId: string): Promise<ActivityEvent[]> {
  const [records, photos, comments, projects, workers, customers, teams] =
    await Promise.all([
      prisma.workRecord.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          jobNumber: true,
          customerName: true,
          status: true,
          createdAt: true,
          approvedAt: true,
          updatedAt: true,
          reviewNote: true,
          submittedBy: { select: { name: true } },
          approvedBy: { select: { name: true } },
        },
      }),
      prisma.photo.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          createdAt: true,
          projectId: true,
          project: { select: { name: true } },
          takenBy: { select: { name: true } },
        },
      }),
      prisma.comment.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          body: true,
          createdAt: true,
          photo: { select: { projectId: true, project: { select: { name: true } } } },
          author: { select: { name: true } },
        },
      }),
      prisma.project.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE,
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.customer.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE,
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.team.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE,
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

  const events: ActivityEvent[] = [];

  for (const r of records) {
    const href = `/admin/records/${r.id}`;
    const label = `#${r.jobNumber} · ${r.customerName}`;
    // Submitted: every record was submitted when it was created.
    events.push({
      id: `rec-sub-${r.id}`,
      type: "record_submitted",
      at: r.createdAt,
      actor: nameOr(r.submittedBy),
      title: `${nameOr(r.submittedBy)} submitted a record`,
      detail: label,
      href,
    });
    if (r.approvedAt) {
      events.push({
        id: `rec-app-${r.id}`,
        type: "record_approved",
        at: r.approvedAt,
        actor: nameOr(r.approvedBy),
        title: `Record approved`,
        detail: label,
        href,
      });
    }
    // "Returned" has no dedicated timestamp; a record in NEEDS_CHANGES was last
    // touched when it was returned, so updatedAt is the best available time.
    if (r.status === "NEEDS_CHANGES") {
      events.push({
        id: `rec-ret-${r.id}`,
        type: "record_returned",
        at: r.updatedAt,
        title: `Record returned for changes`,
        detail: r.reviewNote?.trim() ? r.reviewNote.trim() : label,
        href,
      });
    }
  }

  for (const p of photos) {
    events.push({
      id: `photo-${p.id}`,
      type: "photo_added",
      at: p.createdAt,
      actor: nameOr(p.takenBy),
      title: `${nameOr(p.takenBy)} added a photo`,
      detail: p.project?.name ?? undefined,
      href: `/admin/projects/${p.projectId}`,
    });
  }

  for (const c of comments) {
    events.push({
      id: `comment-${c.id}`,
      type: "comment_added",
      at: c.createdAt,
      actor: nameOr(c.author),
      title: `${nameOr(c.author)} commented`,
      detail: c.body.trim().slice(0, 120) || c.photo?.project?.name || undefined,
      href: c.photo ? `/admin/projects/${c.photo.projectId}` : undefined,
    });
  }

  for (const p of projects) {
    events.push({
      id: `project-${p.id}`,
      type: "project_created",
      at: p.createdAt,
      title: `New project created`,
      detail: p.name,
      href: `/admin/projects/${p.id}`,
    });
  }

  for (const w of workers) {
    events.push({
      id: `worker-${w.id}`,
      type: "worker_added",
      at: w.createdAt,
      title: w.role === "ADMIN" ? `New admin added` : `New worker added`,
      detail: w.name?.trim() || w.email,
      href: w.role === "ADMIN" ? undefined : `/admin/workers/${w.id}`,
    });
  }

  for (const c of customers) {
    events.push({
      id: `customer-${c.id}`,
      type: "customer_added",
      at: c.createdAt,
      title: `New customer added`,
      detail: c.name,
      href: `/admin/customers/${c.id}`,
    });
  }

  for (const t of teams) {
    events.push({
      id: `team-${t.id}`,
      type: "team_added",
      at: t.createdAt,
      title: `New team created`,
      detail: t.name,
      href: `/admin/teams/${t.id}`,
    });
  }

  return events;
}

// Worker: strictly personal. Only things that happened to their own work -
// their records approved/returned, and comments on photos of their records.
async function workerEvents(
  organizationId: string,
  userId: string
): Promise<ActivityEvent[]> {
  const [records, comments] = await Promise.all([
    prisma.workRecord.findMany({
      where: {
        organizationId,
        submittedById: userId,
        status: { in: ["APPROVED", "NEEDS_CHANGES"] },
      },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        status: true,
        approvedAt: true,
        updatedAt: true,
        reviewNote: true,
        approvedBy: { select: { name: true } },
      },
    }),
    prisma.comment.findMany({
      where: {
        organizationId,
        photo: { workRecord: { submittedById: userId } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        body: true,
        createdAt: true,
        photo: { select: { projectId: true } },
        author: { select: { name: true } },
      },
    }),
  ]);

  const events: ActivityEvent[] = [];

  for (const r of records) {
    const href = `/records/${r.id}`;
    const label = `#${r.jobNumber} · ${r.customerName}`;
    if (r.status === "APPROVED" && r.approvedAt) {
      events.push({
        id: `rec-app-${r.id}`,
        type: "record_approved",
        at: r.approvedAt,
        title: `Your record was approved`,
        detail: label,
        href,
      });
    }
    if (r.status === "NEEDS_CHANGES") {
      events.push({
        id: `rec-ret-${r.id}`,
        type: "record_returned",
        at: r.updatedAt,
        title: `Your record needs changes`,
        detail: r.reviewNote?.trim() ? r.reviewNote.trim() : label,
        href,
      });
    }
  }

  for (const c of comments) {
    events.push({
      id: `comment-${c.id}`,
      type: "comment_added",
      at: c.createdAt,
      actor: nameOr(c.author),
      title: `${nameOr(c.author)} commented on your work`,
      detail: c.body.trim().slice(0, 120) || undefined,
      href: c.photo ? `/records/projects/${c.photo.projectId}` : undefined,
    });
  }

  return events;
}

// The merged, time-sorted feed for the given scope. `limit` caps the returned
// list after the merge so the newest events across all sources win.
export async function getActivityFeed(
  scope: ActivityScope,
  limit = 60
): Promise<ActivityEvent[]> {
  const events = scope.isAdmin
    ? await adminEvents(scope.organizationId)
    : await workerEvents(scope.organizationId, scope.userId);
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  return events.slice(0, limit);
}

// Cheap "is there anything new?" probe for the header bell's unread dot: the
// timestamp of the single most recent event in this scope, or null if none.
// Runs in the layout on each page load, so it only pulls one row per source.
export async function getLatestActivityAt(
  scope: ActivityScope
): Promise<Date | null> {
  const times: (Date | null)[] = [];

  if (scope.isAdmin) {
    const { organizationId } = scope;
    const [rec, photo, comment, project, worker, customer, team] =
      await Promise.all([
        prisma.workRecord.findFirst({
          where: { organizationId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.photo.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.comment.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.project.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.user.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.customer.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.team.findFirst({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
      ]);
    times.push(
      rec?.updatedAt ?? null,
      photo?.createdAt ?? null,
      comment?.createdAt ?? null,
      project?.createdAt ?? null,
      worker?.createdAt ?? null,
      customer?.createdAt ?? null,
      team?.createdAt ?? null
    );
  } else {
    const { organizationId, userId } = scope;
    const [rec, comment] = await Promise.all([
      prisma.workRecord.findFirst({
        where: {
          organizationId,
          submittedById: userId,
          status: { in: ["APPROVED", "NEEDS_CHANGES"] },
        },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.comment.findFirst({
        where: {
          organizationId,
          photo: { workRecord: { submittedById: userId } },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
    times.push(rec?.updatedAt ?? null, comment?.createdAt ?? null);
  }

  const valid = times.filter((t): t is Date => t !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
}
