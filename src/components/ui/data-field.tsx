// Shared read-only "label above value" pair, used anywhere a record's
// already-submitted data is displayed (record detail, and the admin
// mobile card views of the records/customers/workers/reports lists) -
// keeping every read-only view of the same underlying data consistent.
export function DataField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {label}
      </span>
      <span className="text-sm text-neutral-900 dark:text-neutral-100">{value || "—"}</span>
    </div>
  );
}
