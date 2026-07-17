"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { createRecordAction } from "@/actions/records";
import { useT } from "@/components/i18n/LocaleProvider";
import type { NewRecordFormData } from "@/lib/newRecordForm";

// The office "start a record" flow as a bottom sheet on the calendar. Open state
// rides on the ?record=<jobId> query param (set by a job card's "Start record"),
// so the form opens over the schedule instead of a separate page — no collision
// with the app's tab bar. The data for the sheet is fetched by the page only
// when the param is present. On a successful save the create action redirects
// back to /admin/schedule?saved=1, which drops the param and closes the sheet.
export function StartRecordSheet({
  data,
  storedSignature,
}: {
  data: NewRecordFormData;
  storedSignature?: string | null;
}) {
  const tf = useT().form;
  const tc = useT().common;
  const params = useSearchParams();
  const router = useRouter();
  const open = Boolean(params.get("record"));

  function close() {
    const p = new URLSearchParams(params.toString());
    p.delete("record");
    const qs = p.toString();
    router.replace(qs ? `/admin/schedule?${qs}` : "/admin/schedule", { scroll: false });
  }

  return (
    <BottomSheet open={open} onClose={close} title={tf.newRecordTitle} closeLabel={tc.close}>
      <WorkRecordForm
        embedded
        action={createRecordAction}
        storedSignature={storedSignature}
        defaultValues={{
          jobNumber: data.suggestedJobNumber || undefined,
          leadInstallerPay:
            data.org?.defaultLeadPay != null ? String(data.org.defaultLeadPay) : undefined,
          helperPay:
            data.org?.defaultHelperPay != null ? String(data.org.defaultHelperPay) : undefined,
          workPerformedNotes: data.org?.defaultWorkNotes || undefined,
          ...data.jobPrefill,
        }}
        submitLabel={tf.submitRecord}
        projects={data.projects}
        requirePhoto={data.org?.requirePhoto ?? false}
        requireHelper={data.org?.requireHelper ?? false}
        requireCustomerSignature={data.org?.requireCustomerSignature ?? true}
        workTypeGroups={data.workTypeGroups}
        currency={data.org?.currencySymbol || "$"}
        scheduledJobId={data.linkedJobId}
        attributeWorkers={data.workers}
        attributeDefaultId={data.attributeDefaultId}
        redirectTo="/admin/schedule"
      />
    </BottomSheet>
  );
}
