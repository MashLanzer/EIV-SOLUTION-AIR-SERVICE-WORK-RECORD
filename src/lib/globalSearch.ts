import { prisma } from "@/lib/prisma";
import { getWorkerTeamIds } from "@/lib/projectAccess";

// Global search runs on read across the entities the current role can reach.
// Audience is strictly separated (see globalSearch):
//   - Admins search company-wide: records, customers, projects, workers, teams.
//   - Workers search only what they can already open: their own records and the
//     projects on their teams. No customers, workers or teams — they have no
//     pages for those, so surfacing them would leak data and dead-end links.

export type SearchGroupType =
  | "records"
  | "customers"
  | "projects"
  | "workers"
  | "teams";

export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface SearchGroup {
  type: SearchGroupType;
  label: string;
  items: SearchItem[];
}

// Cap per category so the palette stays scannable; the merged result is a
// handful of the best matches per type rather than an exhaustive list.
const PER_GROUP = 5;

const GROUP_LABELS: Record<SearchGroupType, string> = {
  records: "Records",
  customers: "Customers",
  projects: "Projects",
  workers: "Workers",
  teams: "Teams",
};

export interface SearchScope {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
}

function insensitive(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

async function adminGroups(
  organizationId: string,
  q: string
): Promise<SearchGroup[]> {
  const [records, customers, projects, workers, teams] = await Promise.all([
    prisma.workRecord.findMany({
      where: {
        organizationId,
        OR: [{ jobNumber: insensitive(q) }, { customerName: insensitive(q) }],
      },
      orderBy: { date: "desc" },
      take: PER_GROUP,
      select: { id: true, jobNumber: true, customerName: true },
    }),
    prisma.customer.findMany({
      where: {
        organizationId,
        OR: [
          { name: insensitive(q) },
          { address: insensitive(q) },
          { phone: insensitive(q) },
          { email: insensitive(q) },
        ],
      },
      orderBy: { name: "asc" },
      take: PER_GROUP,
      select: { id: true, name: true, address: true },
    }),
    prisma.project.findMany({
      where: {
        organizationId,
        OR: [{ name: insensitive(q) }, { address: insensitive(q) }],
      },
      orderBy: { updatedAt: "desc" },
      take: PER_GROUP,
      select: { id: true, name: true, address: true },
    }),
    prisma.user.findMany({
      where: {
        organizationId,
        OR: [{ name: insensitive(q) }, { email: insensitive(q) }],
      },
      orderBy: { name: "asc" },
      take: PER_GROUP,
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.team.findMany({
      where: { organizationId, name: insensitive(q) },
      orderBy: { name: "asc" },
      take: PER_GROUP,
      select: { id: true, name: true },
    }),
  ]);

  return [
    {
      type: "records",
      label: GROUP_LABELS.records,
      items: records.map((r) => ({
        id: r.id,
        title: `#${r.jobNumber}`,
        subtitle: r.customerName,
        href: `/admin/records/${r.id}`,
      })),
    },
    {
      type: "customers",
      label: GROUP_LABELS.customers,
      items: customers.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.address,
        href: `/admin/customers/${c.id}`,
      })),
    },
    {
      type: "projects",
      label: GROUP_LABELS.projects,
      items: projects.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.address ?? undefined,
        href: `/admin/projects/${p.id}`,
      })),
    },
    {
      type: "workers",
      label: GROUP_LABELS.workers,
      items: workers.map((w) => ({
        id: w.id,
        title: w.name?.trim() || w.email,
        subtitle: w.role === "ADMIN" ? "Admin" : "Worker",
        href: `/admin/workers/${w.id}`,
      })),
    },
    {
      type: "teams",
      label: GROUP_LABELS.teams,
      items: teams.map((t) => ({
        id: t.id,
        title: t.name,
        href: `/admin/teams/${t.id}`,
      })),
    },
  ];
}

async function workerGroups(
  organizationId: string,
  userId: string,
  q: string
): Promise<SearchGroup[]> {
  const teamIds = await getWorkerTeamIds(userId);
  const [records, projects] = await Promise.all([
    prisma.workRecord.findMany({
      where: {
        organizationId,
        submittedById: userId,
        OR: [{ jobNumber: insensitive(q) }, { customerName: insensitive(q) }],
      },
      orderBy: { date: "desc" },
      take: PER_GROUP,
      select: { id: true, jobNumber: true, customerName: true },
    }),
    teamIds.length > 0
      ? prisma.project.findMany({
          where: {
            organizationId,
            teamId: { in: teamIds },
            OR: [{ name: insensitive(q) }, { address: insensitive(q) }],
          },
          orderBy: { updatedAt: "desc" },
          take: PER_GROUP,
          select: { id: true, name: true, address: true },
        })
      : Promise.resolve([]),
  ]);

  return [
    {
      type: "records",
      label: GROUP_LABELS.records,
      items: records.map((r) => ({
        id: r.id,
        title: `#${r.jobNumber}`,
        subtitle: r.customerName,
        href: `/records/${r.id}`,
      })),
    },
    {
      type: "projects",
      label: GROUP_LABELS.projects,
      items: projects.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.address ?? undefined,
        href: `/records/projects/${p.id}`,
      })),
    },
  ];
}

// Returns only the non-empty groups for the query, role-scoped. A blank or
// too-short query returns nothing (the caller shows a hint instead).
export async function globalSearch(
  scope: SearchScope,
  rawQuery: string
): Promise<SearchGroup[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const groups = scope.isAdmin
    ? await adminGroups(scope.organizationId, q)
    : await workerGroups(scope.organizationId, scope.userId, q);
  return groups.filter((g) => g.items.length > 0);
}
