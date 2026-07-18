import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  Image as ImageIcon,
  Mail,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileCardList } from "@/components/ui/responsive-table";
import { Pagination } from "@/components/ui/pagination";
import { SuccessToast } from "@/components/ui/success-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditCustomerButton } from "@/components/customers/EditCustomerButton";
import { DeleteCustomerButton } from "@/components/customers/DeleteCustomerButton";
import { MergeCustomerForm } from "@/components/customers/MergeCustomerForm";
import { ShareCustomerPortalButton } from "@/components/customers/ShareCustomerPortalButton";
import { getOrgFeatures } from "@/lib/features";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { ProjectSchedule, type ProjectScheduleJob } from "@/components/projects/ProjectSchedule";
import { StatusBadge } from "@/components/records/StatusBadge";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getUse24Hour } from "@/lib/timeFormat";
import { formatTimeRange } from "@/lib/format";
import { requirePermission } from "@/lib/authz";
import { dayKey, startOfUtcDay } from "@/lib/schedule";
import { getLocale, getT } from "@/lib/i18n/server";

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSince(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default async function AdminCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    merged?: string;
    error?: string;
    page?: string;
  }>;
}) {
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);
  const { portal: portalEnabled } = await getOrgFeatures(organizationId);
  const { id } = await params;
  const { saved, merged, error, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const customer = await prisma.customer.findFirst({ where: { id, organizationId } });
  if (!customer) notFound();

  const [recordCount, statusGroups, records, projects, scheduledJobRows] = await Promise.all([
    prisma.workRecord.count({ where: { organizationId, customerId: id } }),
    // Bounded to the 3 statuses - a tiny at-a-glance health breakdown.
    prisma.workRecord.groupBy({
      by: ["status"],
      where: { organizationId, customerId: id },
      _count: { _all: true },
    }),
    prisma.workRecord.findMany({
      where: { organizationId, customerId: id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        jobNumber: true,
        status: true,
        typeOfWork: true,
        submittedBy: { select: { name: true } },
      },
      ...paginationArgs(page),
    }),
    prisma.project.findMany({
      where: { organizationId, customerId: id },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { records: true, photos: true } },
      },
    }),
    // Upcoming scheduled visits for this customer (today onward).
    prisma.scheduledJob.findMany({
      where: {
        organizationId,
        customerId: id,
        status: { not: "CANCELED" },
        scheduledFor: { gte: startOfUtcDay(new Date()) },
      },
      orderBy: [{ scheduledFor: "asc" }, { startTime: "asc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        scheduledFor: true,
        startTime: true,
        endTime: true,
        status: true,
        assignedTo: { select: { name: true } },
        team: { select: { name: true } },
      },
    }),
  ]);
  const pages = pageCount(recordCount);

  const statusCount = (status: "APPROVED" | "SUBMITTED" | "NEEDS_CHANGES") =>
    statusGroups.find((g) => g.status === status)?._count._all ?? 0;
  const approvedCount = statusCount("APPROVED");
  const pendingCount = statusCount("SUBMITTED");
  const needsChangesCount = statusCount("NEEDS_CHANGES");

  const others = await prisma.customer.findMany({
    where: { organizationId, id: { not: id } },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    customer.address
  )}`;
  const mapsDir = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    customer.address
  )}`;
  const dict = await getT();
  const use24 = await getUse24Hour(organizationId);
  const t = dict.customers;
  const locale = await getLocale();

  const visitDateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const scheduledJobs: ProjectScheduleJob[] = scheduledJobRows.map((j) => ({
    id: j.id,
    title: j.title,
    dateKey: dayKey(j.scheduledFor),
    dateLabel: visitDateFmt.format(j.scheduledFor),
    timeLabel: formatTimeRange(j.startTime, j.endTime, use24, dict.schedule.allDay),
    who: j.assignedTo?.name ?? j.team?.name ?? null,
    status: j.status,
  }));

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message={t.customerSaved} aboveMobileNav />}
      {merged && <SuccessToast message={t.customersMerged} aboveMobileNav />}
      {error === "merge" && (
        <Alert variant="error">
          {t.mergeError}
        </Alert>
      )}

      {/* Header - identity, address, and one-tap contact actions */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-3">
            <AvatarInitials name={customer.name} className="h-12 w-12 text-base" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {customer.name}
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                {t.customerSince.replace("{date}", formatSince(customer.createdAt, locale))}
              </div>
            </div>
          </div>

          <a
            href={mapsSearch}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{customer.address}</span>
          </a>

          {/* One-tap contact - only the actions that have a value */}
          <div className="flex gap-2">
            {customer.phone && (
              <Button asChild variant="outline" className="flex-1">
                <a href={`tel:${customer.phone}`}>
                  <Phone className="h-4 w-4" />
                  {t.call}
                </a>
              </Button>
            )}
            {customer.email && (
              <Button asChild variant="outline" className="flex-1">
                <a href={`mailto:${customer.email}`}>
                  <Mail className="h-4 w-4" />
                  {t.email}
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="flex-1">
              <a href={mapsDir} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4" />
                {t.directions}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProjectSchedule
        jobs={scheduledJobs}
        title={dict.projects.upcomingVisits}
        emptyText={dict.projects.noUpcomingVisits}
        viewAllLabel={dict.projects.viewCalendar}
      />

      {/* Snapshot - total jobs + status breakdown */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {recordCount}
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t.totalJobs}
                </div>
              </div>
            </div>
            {recordCount > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/records?customerName=${encodeURIComponent(customer.name)}`}
                >
                  {t.viewAll}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {recordCount > 0 && (
            <div className="grid grid-cols-3 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <div>
                <div className="text-lg font-semibold tabular-nums text-success-text">
                  {approvedCount}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t.approved}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {pendingCount}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t.pendingReview}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-warning-text">
                  {needsChangesCount}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t.needsChanges}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects (jobsites) for this customer */}
      {projects.length > 0 && (
        <section
          className="flex animate-fade-up flex-col gap-3"
          style={{ animationDelay: "80ms", animationFillMode: "both" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.projectsCount.replace("{n}", String(projects.length))}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="flex items-center gap-3 rounded-xl p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    <FolderKanban className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                        {p.name}
                      </span>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="tabular-nums">{p._count.photos}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span className="tabular-nums">{p._count.records}</span>
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Job history - primary content, moved above editing */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.jobHistory.replace("{n}", String(recordCount))}
        </h2>
        {records.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardList}
                title={t.noJobs}
                description={t.noJobsDesc}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden sm:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{dict.records.date}</TableHead>
                        <TableHead>{dict.records.jobNumber}</TableHead>
                        <TableHead>{dict.adminRecords.colStatus}</TableHead>
                        <TableHead>{dict.records.typeOfWork}</TableHead>
                        <TableHead>{t.submittedBy}</TableHead>
                        <TableHead className="text-right">{t.open}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.date, locale)}</TableCell>
                          <TableCell>{record.jobNumber}</TableCell>
                          <TableCell>
                            <StatusBadge status={record.status} />
                          </TableCell>
                          <TableCell>{record.typeOfWork}</TableCell>
                          <TableCell>{record.submittedBy?.name ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="icon">
                              <Link
                                href={`/admin/records/${record.id}`}
                                aria-label={t.openRecordAria.replace("{n}", record.jobNumber)}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <MobileCardList>
              {records.map((record) => (
                <Card key={record.id}>
                  <Link
                    href={`/admin/records/${record.id}`}
                    className="flex items-start gap-3 p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                          {dict.records.jobNumber}{record.jobNumber}
                        </span>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDate(record.date, locale)} · {record.typeOfWork}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {record.submittedBy?.name ?? "—"}
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  </Link>
                </Card>
              ))}
            </MobileCardList>

            <Pagination
              page={page}
              pageCount={pages}
              basePath={`/admin/customers/${id}`}
            />
          </>
        )}
      </section>

      {/* Customer portal - private, login-free link to the customer's own
          history, photos and invoices. Hidden when the module is off. */}
      {portalEnabled && (
        <section
          className="flex animate-fade-up flex-col gap-3"
          style={{ animationDelay: "150ms", animationFillMode: "both" }}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {dict.portal.title}
          </h2>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{dict.portal.desc}</p>
              <ShareCustomerPortalButton customerId={customer.id} initialToken={customer.portalToken} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Manage - editing, merging and deleting as a compact action row.
          Editing opens in a bottom sheet (like the rest of the app) so the
          form no longer dominates the page; viewing comes first. */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "160ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.manage}
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="grid grid-cols-2 gap-2">
              <EditCustomerButton
                customerId={customer.id}
                defaultValues={{
                  name: customer.name,
                  address: customer.address,
                  phone: customer.phone ?? "",
                  email: customer.email ?? "",
                }}
                fullWidth
              />
              <DeleteCustomerButton customerId={customer.id} fullWidth />
            </div>
            <MergeCustomerForm sourceId={customer.id} others={others} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
