import { Activity, CalendarDays, Camera, ClipboardList, Receipt } from "lucide-react";

import { JobStatusTimeline } from "@/components/schedule/JobStatusTimeline";
import { ScheduleStatusBadge } from "@/components/schedule/ScheduleStatusBadge";
import { prisma } from "@/lib/prisma";
import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const customer = await prisma.customer.findFirst({
    where: { portalToken: token },
    include: {
      organization: {
        select: {
          name: true,
          logoUrl: true,
          companyPhone: true,
          companyAddress: true,
          currencySymbol: true,
        },
      },
      records: {
        where: { status: "APPROVED" },
        orderBy: { date: "desc" },
        include: { photos: { orderBy: { position: "asc" }, select: { id: true, dataUrl: true } } },
      },
      invoices: {
        orderBy: { issueDate: "desc" },
        include: {
          lineItems: { select: { quantity: true, unitPrice: true } },
        },
      },
      scheduledJobs: {
        where: { status: { not: "CANCELED" } },
        orderBy: { scheduledFor: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          scheduledFor: true,
          status: true,
          statusEvents: {
            orderBy: { createdAt: "asc" },
            select: { status: true, actorName: true, createdAt: true },
          },
        },
      },
    },
  });

  const dict = await getT();
  const t = dict.portal;

  if (!customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-8">
        <div className="mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">{t.notFoundTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t.notFoundDesc}</p>
        </div>
      </main>
    );
  }

  const locale = await getLocale();
  const org = customer.organization;
  const cur = org?.currencySymbol || "$";
  const money = (n: number) => `${cur}${n.toFixed(2)}`;
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const eventFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const liveJobs = customer.scheduledJobs;

  const allPhotos = customer.records.flatMap((r) => r.photos);
  const invDict = dict.invoices;
  const invoiceStatusLabel: Record<string, string> = {
    DRAFT: invDict.statusDraft,
    SENT: invDict.statusSent,
    PAID: invDict.statusPaid,
    VOID: invDict.statusVoid,
  };

  const stat = (icon: React.ReactNode, value: number, label: string) => (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-4">
      <span className="text-neutral-400">{icon}</span>
      <span className="text-2xl font-semibold tabular-nums text-neutral-900">{value}</span>
      <span className="text-xs uppercase tracking-wide text-neutral-400">{label}</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-neutral-200 p-6">
            {org?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-neutral-900">{org?.name}</h1>
              <p className="truncate text-sm text-neutral-500">
                {[org?.companyPhone, org?.companyAddress].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="p-6">
            <p className="text-xl font-semibold text-neutral-900">
              {t.greeting.replace("{name}", customer.name)}
            </p>
            <p className="mt-1 text-sm text-neutral-500">{t.intro}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {stat(<ClipboardList className="h-5 w-5" />, customer.records.length, t.statsVisits)}
              {stat(<Camera className="h-5 w-5" />, allPhotos.length, t.statsPhotos)}
              {stat(<Receipt className="h-5 w-5" />, customer.invoices.length, t.statsInvoices)}
            </div>
          </div>
        </div>

        {/* Live status of upcoming/active visits */}
        {liveJobs.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <h2 className="flex items-center gap-2 border-b border-neutral-200 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              <Activity className="h-4 w-4" />
              {t.liveTitle}
            </h2>
            <ul className="divide-y divide-neutral-100">
              {liveJobs.map((job) => (
                <li key={job.id} className="flex flex-col gap-3 px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900">{job.title || t.jobLabel}</p>
                      <p className="text-xs text-neutral-400 tabular-nums">{dateFmt.format(job.scheduledFor)}</p>
                    </div>
                    <ScheduleStatusBadge status={job.status} />
                  </div>
                  {job.statusEvents.length > 0 && (
                    <JobStatusTimeline
                      events={job.statusEvents.map((e) => ({
                        status: e.status,
                        actorName: e.actorName,
                        time: eventFmt.format(e.createdAt),
                      }))}
                    />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Service history */}
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <h2 className="border-b border-neutral-200 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t.visitsTitle}
          </h2>
          {customer.records.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-neutral-400">{t.visitsEmpty}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {customer.records.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-neutral-900">{r.typeOfWork}</span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-500 tabular-nums">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {dateFmt.format(r.date)}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {t.jobLabel} #{r.jobNumber}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Photos */}
        {allPhotos.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <h2 className="border-b border-neutral-200 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              {t.photosTitle}
            </h2>
            <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-4">
              {allPhotos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.dataUrl}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </section>
        )}

        {/* Invoices */}
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <h2 className="border-b border-neutral-200 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {t.invoicesTitle}
          </h2>
          {customer.invoices.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-neutral-400">{t.invoicesEmpty}</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {customer.invoices.map((inv) => {
                const totals = computeTotals(
                  inv.lineItems.map((li) => ({
                    quantity: Number(li.quantity),
                    unitPrice: Number(li.unitPrice),
                  })),
                  Number(inv.taxRate)
                );
                return (
                  <li key={inv.id} className="flex items-center justify-between gap-3 px-6 py-4">
                    <div className="min-w-0">
                      <span className="font-medium text-neutral-900 tabular-nums">
                        {formatInvoiceNumber(inv.number)}
                      </span>
                      <span className="ml-2 text-xs uppercase tracking-wide text-neutral-400">
                        {invoiceStatusLabel[inv.status] ?? inv.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold tabular-nums text-neutral-900">
                        {money(totals.total)}
                      </span>
                      {inv.publicToken && (
                        <a
                          href={`/invoice/${inv.publicToken}`}
                          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                        >
                          {t.viewInvoice}
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="pb-4 text-center text-xs text-neutral-400">{t.footer}</p>
      </div>
    </main>
  );
}
