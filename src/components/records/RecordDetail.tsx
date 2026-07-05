import type { WorkPhoto, WorkRecord } from "@prisma/client";

import { StatusBadge } from "@/components/records/StatusBadge";
import { DataField } from "@/components/ui/data-field";
import { formatTime } from "@/lib/format";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function RecordDetail({
  record,
}: {
  record: WorkRecord & { photos?: WorkPhoto[] };
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <StatusBadge status={record.status} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DataField label="Date" value={formatDate(record.date)} />
        <DataField label="Job #" value={record.jobNumber} />
        <DataField label="Lead Installer" value={record.leadInstallerName} />
        <DataField label="Helper" value={record.helperName} />
        <DataField label="Customer Name" value={record.customerName} />
        <DataField label="Customer Address" value={record.customerAddress} />
        <DataField label="Arrival Time" value={formatTime(record.arrivalTime)} />
        <DataField label="Departure Time" value={formatTime(record.departureTime)} />
        <DataField label="Type of Work" value={record.typeOfWork} />
        <DataField
          label="Lead Installer Pay"
          value={`$${record.leadInstallerPay.toFixed(2)}`}
        />
        <DataField
          label="Helper Pay"
          value={record.helperPay ? `$${record.helperPay.toFixed(2)}` : null}
        />
      </div>

      <DataField
        label="Work Performed / Notes"
        value={<p className="whitespace-pre-wrap">{record.workPerformedNotes}</p>}
      />

      {record.photos && record.photos.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Photos
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {record.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={photo.dataUrl}
                alt={`Work photo ${photo.position + 1}`}
                className="aspect-square w-full rounded-lg border border-neutral-200 dark:border-neutral-800 object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Customer Signature
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.customerSignature}
            alt="Customer signature"
            className="h-32 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 object-contain"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Installer Signature
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.installerSignature}
            alt="Installer signature"
            className="h-32 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 object-contain"
          />
        </div>
      </div>
    </div>
  );
}
