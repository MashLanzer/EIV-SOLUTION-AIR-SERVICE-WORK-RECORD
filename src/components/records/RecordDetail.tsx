import type { WorkRecord } from "@prisma/client";

import { formatTime } from "@/lib/format";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-sm text-slate-900">{value || "—"}</span>
    </div>
  );
}

export function RecordDetail({ record }: { record: WorkRecord }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Date" value={formatDate(record.date)} />
        <Field label="Job #" value={record.jobNumber} />
        <Field label="Lead Installer" value={record.leadInstallerName} />
        <Field label="Helper" value={record.helperName} />
        <Field label="Customer Name" value={record.customerName} />
        <Field label="Customer Address" value={record.customerAddress} />
        <Field label="Arrival Time" value={formatTime(record.arrivalTime)} />
        <Field label="Departure Time" value={formatTime(record.departureTime)} />
        <Field label="Type of Work" value={record.typeOfWork} />
        <Field
          label="Lead Installer Pay"
          value={`$${record.leadInstallerPay.toFixed(2)}`}
        />
        <Field
          label="Helper Pay"
          value={record.helperPay ? `$${record.helperPay.toFixed(2)}` : null}
        />
      </div>

      <Field
        label="Work Performed / Notes"
        value={<p className="whitespace-pre-wrap">{record.workPerformedNotes}</p>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Customer Signature
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.customerSignature}
            alt="Customer signature"
            className="h-32 rounded-md border border-slate-200 bg-white object-contain"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Installer Signature
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.installerSignature}
            alt="Installer signature"
            className="h-32 rounded-md border border-slate-200 bg-white object-contain"
          />
        </div>
      </div>
    </div>
  );
}
