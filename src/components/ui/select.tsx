"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// A drop-in replacement for a styled native <select>: same props (value /
// defaultValue / onChange / name / id / disabled / required / className /
// aria-*), same <option>/<optgroup> children — but it renders a custom
// trigger + popover listbox so every dropdown in the app looks the same
// instead of falling back to the OS-native picker. A hidden input carries the
// value so it still submits inside a <form>.

type Opt = { value: string; label: React.ReactNode; disabled?: boolean; group?: string };

function collectOptions(children: React.ReactNode): Opt[] {
  const out: Opt[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "optgroup") {
      const props = child.props as { label?: string; children?: React.ReactNode };
      React.Children.forEach(props.children, (opt) => {
        if (React.isValidElement(opt) && opt.type === "option") {
          const p = opt.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
          out.push({ value: String(p.value ?? ""), label: p.children, disabled: p.disabled, group: props.label });
        }
      });
    } else if (child.type === "option") {
      const p = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
      out.push({ value: String(p.value ?? ""), label: p.children, disabled: p.disabled });
    }
  });
  return out;
}

function Select({
  className,
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  required,
  ...rest
}: React.ComponentProps<"select">) {
  const options = React.useMemo(() => collectOptions(children), [children]);
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(() =>
    String(defaultValue ?? value ?? options[0]?.value ?? "")
  );
  const current = isControlled ? String(value) : internal;
  const selected = options.find((o) => o.value === current);

  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const ariaLabel = rest["aria-label"];
  const invalid = rest["aria-invalid"] === true || rest["aria-invalid"] === "true";

  function commit(v: string) {
    if (!isControlled) setInternal(v);
    onChange?.({ target: { value: v, name } } as unknown as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Measure the trigger and anchor the listbox to it. Opens downward by
  // default, but flips up when the trigger sits near the bottom of the viewport
  // (e.g. inside a bottom sheet) so the list stays on screen and usable instead
  // of spilling under the gesture bar. Clamped to the available space so it
  // always scrolls.
  const reposition = React.useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const margin = 12;
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    setPos(
      openUp
        ? { bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width, maxHeight: spaceAbove - margin }
        : { top: r.bottom + 4, left: r.left, width: r.width, maxHeight: spaceBelow - margin }
    );
  }, []);

  function toggle() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    reposition();
    setOpen(true);
  }

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // Re-anchor (don't dismiss) on scroll/resize. A full-screen overlay sits
    // over the page while the list is open, so the content beneath can't be
    // scrolled by the user; the only scrolls that fire are spurious ones from a
    // touch tap on an option. Closing on those swallowed the selection on
    // touch devices — repositioning keeps the list open so the tap lands.
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    // Focus the selected (or first) option for keyboard users.
    const focusTarget =
      listRef.current?.querySelector<HTMLElement>('[data-selected="true"]') ??
      listRef.current?.querySelector<HTMLElement>("[role=option]");
    focusTarget?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[role=option]") ?? []);
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
    items[(next + items.length) % items.length]?.focus();
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        data-required={required || undefined}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-left text-base transition-colors hover:border-neutral-400 dark:hover:border-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
          invalid && "border-destructive ring-1 ring-destructive",
          className
        )}
      >
        <span className="truncate text-neutral-900 dark:text-neutral-100">{selected?.label ?? " "}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-neutral-500 transition-transform dark:text-neutral-400",
            open && "rotate-180"
          )}
        />
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden="true" />
              <div
                ref={listRef}
                role="listbox"
                aria-label={ariaLabel}
                onKeyDown={onListKeyDown}
                style={{
                  top: pos.top,
                  bottom: pos.bottom,
                  left: pos.left,
                  width: pos.width,
                  maxHeight: pos.maxHeight,
                }}
                className="fixed z-[61] overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1 shadow-lg shadow-black/10 [scrollbar-width:thin]"
              >
                {options.map((opt, i) => {
                  const isSel = opt.value === current;
                  const prev = options[i - 1];
                  const showGroup = opt.group && opt.group !== prev?.group;
                  return (
                    <React.Fragment key={`${opt.group ?? ""}-${opt.value}-${i}`}>
                      {showGroup ? (
                        <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                          {opt.group}
                        </div>
                      ) : null}
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSel}
                        data-selected={isSel}
                        disabled={opt.disabled}
                        onClick={() => commit(opt.value)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                          isSel
                            ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                            : "text-neutral-700 hover:bg-neutral-100 focus:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSel ? <Check className="h-4 w-4 shrink-0" /> : null}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}

export { Select };
