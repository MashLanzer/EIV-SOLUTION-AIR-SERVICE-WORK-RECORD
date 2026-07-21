"use client";

// The "select all" checkbox for the Companies list. Toggles every row checkbox
// (name "orgids") and dispatches a change event so the floating bulk bar
// recomputes its selection (setting .checked in code doesn't fire one).
export function OrgSelectAll() {
  function onToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const on = e.target.checked;
    document
      .querySelectorAll<HTMLInputElement>('input[name="orgids"]')
      .forEach((c) => {
        c.checked = on;
      });
    document.dispatchEvent(new Event("change"));
  }

  return (
    <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
      <input
        type="checkbox"
        data-select-all-orgs
        onChange={onToggle}
        className="h-4 w-4 rounded border-neutral-300 accent-primary dark:border-neutral-600"
      />
      Select all
    </label>
  );
}
