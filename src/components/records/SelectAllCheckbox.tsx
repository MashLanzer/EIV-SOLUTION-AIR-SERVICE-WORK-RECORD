"use client";

import { useT } from "@/components/i18n/LocaleProvider";

export function SelectAllCheckbox({ formId }: { formId: string }) {
  const t = useT().adminRecords;
  return (
    <input
      type="checkbox"
      aria-label={t.selectAll}
      data-select-all
      onChange={(e) => {
        const form = document.getElementById(formId) as HTMLFormElement | null;
        form
          ?.querySelectorAll<HTMLInputElement>('input[name="ids"]')
          .forEach((checkbox) => {
            checkbox.checked = e.target.checked;
          });
      }}
    />
  );
}
