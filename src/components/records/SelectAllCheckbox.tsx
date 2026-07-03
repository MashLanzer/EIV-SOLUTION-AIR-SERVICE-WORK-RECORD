"use client";

export function SelectAllCheckbox({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all records"
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
