"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";

interface CustomerSuggestion {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
}

const LISTBOX_ID = "customer-suggestions";
const optionId = (index: number) => `customer-suggestion-${index}`;

// Customer-name input with a suggestions dropdown backed by
// GET /api/customers. Picking a suggestion also fills the address input
// (looked up by id, since both live in the same form). A plain <datalist>
// can't fill two fields and is unreliable in the Android WebView.
export function CustomerAutocomplete({
  defaultValue,
  addressInputId,
  phoneInputId,
  emailInputId,
  invalid,
  describedBy,
}: {
  defaultValue?: string;
  addressInputId: string;
  phoneInputId?: string;
  emailInputId?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  // Debounced best-effort fetch, driven directly from input changes.
  function scheduleFetch(raw: string) {
    clearTimeout(timerRef.current);
    controllerRef.current?.abort();

    const q = raw.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { customers: CustomerSuggestion[] };
        setSuggestions(data.customers);
        setOpen(data.customers.length > 0);
        setActiveIndex(-1);
      } catch {
        // aborted or offline - suggestions are best-effort
      }
    }, 200);
  }

  useEffect(() => {
    const timer = timerRef;
    const controller = controllerRef;
    return () => {
      clearTimeout(timer.current);
      controller.current?.abort();
    };
  }, []);

  function pick(suggestion: CustomerSuggestion) {
    clearTimeout(timerRef.current);
    controllerRef.current?.abort();
    setValue(suggestion.name);
    setOpen(false);
    setActiveIndex(-1);
    const fill = (inputId: string | undefined, val: string | null) => {
      if (!inputId) return;
      const el = document.getElementById(inputId);
      if (el instanceof HTMLInputElement && val) el.value = val;
    };
    fill(addressInputId, suggestion.address);
    fill(phoneInputId, suggestion.phone);
    fill(emailInputId, suggestion.email);
  }

  return (
    <div className="relative">
      <Input
        id="customerName"
        name="customerName"
        required
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          scheduleFetch(e.target.value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
            return;
          }
          if (!open || suggestions.length === 0) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            pick(suggestions[activeIndex]);
          }
        }}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      {open && (
        <ul
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Customer suggestions"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg"
        >
          {suggestions.map((s, index) => (
            <li key={s.id}>
              <button
                type="button"
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${
                  index === activeIndex ? "bg-slate-50 dark:bg-slate-800" : ""
                }`}
              >
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {s.name}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {s.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
