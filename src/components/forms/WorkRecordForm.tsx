"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  User,
  Clock,
  DollarSign,
  Camera,
  PenTool,
  Save,
  WifiOff,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CustomerAutocomplete,
  type CustomerAutocompleteHandle,
} from "@/components/forms/CustomerAutocomplete";
import { FormSection } from "@/components/forms/FormSection";
import { PhotoField } from "@/components/forms/PhotoField";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/forms/SignaturePad";
import { TypeOfWorkField } from "@/components/forms/TypeOfWorkField";
import { clearDraft, getDraft, setDraft } from "@/lib/draftStore";
import { cn } from "@/lib/utils";
import type { WorkTypeGroup } from "@/lib/workTypes";
import type { RecordFormState } from "@/actions/records";

interface ProjectOption {
  id: string;
  name: string;
  customer?: {
    name: string;
    address: string;
    phone: string | null;
    email: string | null;
  } | null;
}

export interface WorkRecordFormValues {
  date: string;
  jobNumber: string;
  projectId?: string;
  leadInstallerName: string;
  helperName: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  arrivalTime: string;
  departureTime: string;
  typeOfWork: string;
  workPerformedNotes: string;
  leadInstallerPay: string;
  helperPay: string;
  customerSignature: string;
  installerSignature: string;
  photos: string[];
}

interface WorkRecordFormProps {
  action: (
    prevState: RecordFormState,
    formData: FormData
  ) => Promise<RecordFormState>;
  defaultValues?: Partial<WorkRecordFormValues>;
  submitLabel?: string;
  // When set, the form autosaves an in-progress draft under this key so a
  // backgrounded/closed app doesn't lose work. Only the new-record form
  // passes it - editing an existing record should not spawn a draft.
  draftKey?: string;
  // The org's projects, so a record can be filed under one (optional).
  projects?: ProjectOption[];
  // Company policy (Settings): when true at least one photo is required to
  // submit. The server enforces it; this just reflects it in the UI.
  requirePhoto?: boolean;
  // The org's predefined work types (Settings → Work types), grouped by
  // category. When present they drive the Type of Work picker.
  workTypeGroups?: WorkTypeGroup[];
}

// The wizard steps, in order. Each carries its icon + the field ids that live
// on it (used to map a server error back to its step and to compute the
// per-step completion check). The sections themselves all stay mounted in the
// DOM (only the active one is visible) so the draft snapshot and the final
// submit — both of which read the whole <form> — keep working unchanged.
const STEPS: { title: string; icon: typeof Briefcase; fields: string[] }[] = [
  { title: "Job Details", icon: Briefcase, fields: ["date", "jobNumber", "leadInstallerName", "helperName", "projectId"] },
  { title: "Customer", icon: User, fields: ["customerName", "customerAddress", "customerPhone", "customerEmail"] },
  { title: "Time & Work", icon: Clock, fields: ["arrivalTime", "departureTime", "typeOfWork", "workPerformedNotes"] },
  { title: "Payment", icon: DollarSign, fields: ["leadInstallerPay", "helperPay"] },
  { title: "Photos", icon: Camera, fields: ["photos"] },
  { title: "Signatures", icon: PenTool, fields: ["sig-customer", "sig-installer"] },
];
const LAST_STEP = STEPS.length - 1;

function stepOfField(id: string): number {
  const idx = STEPS.findIndex((s) => s.fields.includes(id));
  return idx === -1 ? 0 : idx;
}

function todayIsoDate() {
  // Local calendar day - toISOString() alone is UTC and can be off by a
  // day for evening use in the Americas.
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// "6h 30m" between two HH:MM times, same calendar day. Returns null when either
// is missing or the math is non-positive (overnight/typo — the cross-field
// validation already flags those, so we just don't show a bogus duration).
function durationLabel(a: string, d: string): string | null {
  if (!a || !d) return null;
  const [ah, am] = a.split(":").map(Number);
  const [dh, dm] = d.split(":").map(Number);
  if ([ah, am, dh, dm].some((n) => Number.isNaN(n))) return null;
  const mins = dh * 60 + dm - (ah * 60 + am);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

// A draft is worth restoring only if the worker actually entered something
// beyond the auto-filled date.
function draftHasContent(d: Partial<WorkRecordFormValues>): boolean {
  return Boolean(
    d.jobNumber ||
      d.leadInstallerName ||
      d.helperName ||
      d.customerName ||
      d.customerAddress ||
      d.typeOfWork ||
      d.workPerformedNotes ||
      d.leadInstallerPay ||
      d.helperPay ||
      d.customerSignature ||
      d.installerSignature ||
      (d.photos && d.photos.length > 0)
  );
}

// Friendly names for the error summary, keyed by field name / anchor id.
const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  jobNumber: "Job #",
  leadInstallerName: "Lead Installer",
  customerName: "Customer Name",
  customerAddress: "Customer Address",
  arrivalTime: "Arrival Time",
  departureTime: "Departure Time",
  typeOfWork: "Type of Work",
  workPerformedNotes: "Work Performed / Notes",
  leadInstallerPay: "Lead Installer Pay",
  helperPay: "Helper Pay",
  photos: "Photos",
  "sig-customer": "Customer Signature",
  "sig-installer": "Installer Signature",
};

export function WorkRecordForm({
  action,
  defaultValues,
  submitLabel = "Submit",
  draftKey,
  projects = [],
  requirePhoto = false,
  workTypeGroups,
}: WorkRecordFormProps) {
  const router = useRouter();
  const [state, formAction, actionPending] = useActionState<
    RecordFormState,
    FormData
  >(action, undefined);
  const [transitionPending, startTransition] = useTransition();
  const pending = actionPending || transitionPending;
  const formRef = useRef<HTMLFormElement>(null);
  const customerSigRef = useRef<SignaturePadHandle>(null);
  const installerSigRef = useRef<SignaturePadHandle>(null);
  const customerNameRef = useRef<CustomerAutocompleteHandle>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [sigErrors, setSigErrors] = useState<{
    customer?: string;
    installer?: string;
  }>({});

  // Field values seeded into the (remountable) form. Restoring a draft
  // swaps these in and bumps formKey to re-init the uncontrolled inputs,
  // signature pads, and photo grid.
  const [values, setValues] = useState<Partial<WorkRecordFormValues> | undefined>(
    defaultValues
  );
  const [formKey, setFormKey] = useState(0);
  const [pendingDraft, setPendingDraft] =
    useState<Partial<WorkRecordFormValues> | null>(null);
  const [offline, setOffline] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editing an existing record (no draftKey) has no draft safety net, so guard
  // against losing unsaved edits. The new-record form already autosaves a
  // draft, so it opts out.
  const guardUnsaved = !draftKey;
  const [dirty, setDirty] = useState(false);

  // Wizard state: which step is visible, which steps are complete, and the
  // live "time on site" readout.
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(() =>
    STEPS.map(() => false)
  );
  const [duration, setDuration] = useState<string | null>(null);

  const fieldError = (name: string) => state?.fieldErrors?.[name]?.[0];
  const invalid = (name: string) => (fieldError(name) ? true : undefined);
  const describedBy = (name: string) =>
    fieldError(name) ? `${name}-error` : undefined;

  // Flat list of everything the worker needs to fix, for the summary at the
  // top of the form: server-side field errors plus any missing signatures.
  const errorSummary: { id: string; label: string }[] = [
    ...Object.keys(state?.fieldErrors ?? {})
      .filter((name) => state?.fieldErrors?.[name]?.length)
      .map((name) => ({ id: name, label: FIELD_LABELS[name] ?? name })),
    ...(sigErrors.customer ? [{ id: "sig-customer", label: FIELD_LABELS["sig-customer"] }] : []),
    ...(sigErrors.installer ? [{ id: "sig-installer", label: FIELD_LABELS["sig-installer"] }] : []),
  ];

  // Bring a field into view, switching to its step first (it may live on a
  // step that isn't currently shown).
  const focusField = useCallback((id: string) => {
    setStep(stepOfField(id));
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLElement) el.focus?.();
    });
  }, []);

  // Is a step "done"? For the field steps, every required control in that
  // step's container must be valid; the signature step needs both pads drawn.
  const isStepComplete = useCallback((index: number): boolean => {
    if (index === LAST_STEP) {
      return Boolean(
        customerSigRef.current?.getDataUrl() && installerSigRef.current?.getDataUrl()
      );
    }
    const container = stepRefs.current[index];
    if (!container) return false;
    const controls = container.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input[required], select[required], textarea[required]");
    for (const c of controls) {
      if (!c.value.trim() || !c.checkValidity()) return false;
    }
    return true;
  }, []);

  const recompute = useCallback(() => {
    setCompleted(STEPS.map((_, i) => isStepComplete(i)));
  }, [isStepComplete]);

  const updateDuration = useCallback(() => {
    const a = (document.getElementById("arrivalTime") as HTMLInputElement | null)?.value ?? "";
    const d = (document.getElementById("departureTime") as HTMLInputElement | null)?.value ?? "";
    setDuration(durationLabel(a, d));
  }, []);

  // Offline awareness: block submitting while there's no connection (the
  // draft keeps the entry safe until the worker is back online).
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  // Offer to restore a saved draft on mount.
  useEffect(() => {
    if (!draftKey) return;
    let cancelled = false;
    getDraft<Partial<WorkRecordFormValues>>(draftKey).then((d) => {
      if (!cancelled && d && draftHasContent(d)) setPendingDraft(d);
    });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // After the form (re)mounts - initial render or a draft restore that bumped
  // formKey - sync the derived readouts from the freshly-seeded DOM. Deferred a
  // frame so it reads settled DOM and doesn't cascade a render mid-effect.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      updateDuration();
      recompute();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  const snapshotDraft = useCallback(() => {
    if (!draftKey || !formRef.current) return;
    const fd = new FormData(formRef.current);
    const snap: WorkRecordFormValues = {
      date: (fd.get("date") as string) ?? "",
      jobNumber: (fd.get("jobNumber") as string) ?? "",
      projectId: (fd.get("projectId") as string) ?? "",
      leadInstallerName: (fd.get("leadInstallerName") as string) ?? "",
      helperName: (fd.get("helperName") as string) ?? "",
      customerName: (fd.get("customerName") as string) ?? "",
      customerAddress: (fd.get("customerAddress") as string) ?? "",
      customerPhone: (fd.get("customerPhone") as string) ?? "",
      customerEmail: (fd.get("customerEmail") as string) ?? "",
      arrivalTime: (fd.get("arrivalTime") as string) ?? "",
      departureTime: (fd.get("departureTime") as string) ?? "",
      typeOfWork: (fd.get("typeOfWork") as string) ?? "",
      workPerformedNotes: (fd.get("workPerformedNotes") as string) ?? "",
      leadInstallerPay: (fd.get("leadInstallerPay") as string) ?? "",
      helperPay: (fd.get("helperPay") as string) ?? "",
      customerSignature: customerSigRef.current?.getDataUrl() ?? "",
      installerSignature: installerSigRef.current?.getDataUrl() ?? "",
      photos: fd
        .getAll("photos")
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    };
    if (draftHasContent(snap)) setDraft(draftKey, snap);
  }, [draftKey]);

  function scheduleSave() {
    if (!draftKey) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(snapshotDraft, 800);
  }

  // Warn before a full page unload (reload / closing the app) when editing a
  // record with unsaved edits. In-app cancel is guarded by the Cancel button.
  useEffect(() => {
    if (!guardUnsaved || !dirty || pending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [guardUnsaved, dirty, pending]);

  // Cheap live updates on every input/tap: keep the step checks and the
  // duration readout fresh, and (debounced) persist the draft.
  function handleFormInput() {
    if (guardUnsaved) setDirty(true);
    scheduleSave();
    recompute();
  }
  function handleFormPointerUp() {
    scheduleSave();
    recompute();
  }

  function resumeDraft() {
    if (!pendingDraft) return;
    setValues(pendingDraft);
    setFormKey((k) => k + 1);
    setPendingDraft(null);
    setStep(0);
  }

  function discardDraft() {
    setPendingDraft(null);
    if (draftKey) clearDraft(draftKey);
  }

  // Selecting a project that already has a customer fills the customer fields,
  // so the worker doesn't retype what the office already knows.
  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const proj = projects.find((p) => p.id === e.target.value);
    const c = proj?.customer;
    if (!c) return;
    customerNameRef.current?.setName(c.name);
    const set = (id: string, val: string | null) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el && val != null) el.value = val;
    };
    set("customerAddress", c.address);
    set("customerPhone", c.phone);
    set("customerEmail", c.email);
    scheduleSave();
    requestAnimationFrame(recompute);
  }

  // Move to the next step, but only once the current step validates - this is
  // what makes each step's completion check meaningful.
  function goNext() {
    const container = stepRefs.current[step];
    if (container) {
      const controls = container.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >("input, select, textarea");
      for (const c of controls) {
        if (!c.checkValidity()) {
          c.reportValidity();
          return;
        }
      }
    }
    recompute();
    setStep((s) => Math.min(s + 1, LAST_STEP));
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function goStep(index: number) {
    setStep(index);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // After a failed server validation, jump to the step holding the first
  // offending field and bring it into view (the form spans several steps).
  useEffect(() => {
    if (!state?.fieldErrors) return;
    const first = Object.keys(state.fieldErrors).find(
      (name) => state.fieldErrors?.[name]?.length
    );
    if (!first) return;
    const id = requestAnimationFrame(() => focusField(first));
    return () => cancelAnimationFrame(id);
  }, [state, focusField]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSigErrors({});

    // The offline banner and the disabled Save button already explain why a
    // submit can't go through, so just bail out quietly here.
    if (offline) return;

    const customerSignature = customerSigRef.current?.getDataUrl();
    const installerSignature = installerSigRef.current?.getDataUrl();

    if (!customerSignature || !installerSignature) {
      const next = {
        customer: customerSignature ? undefined : "Customer signature is required.",
        installer: installerSignature ? undefined : "Installer signature is required.",
      };
      setSigErrors(next);
      focusField(next.customer ? "sig-customer" : "sig-installer");
      return;
    }

    const formData = new FormData(formRef.current!);
    formData.set("customerSignature", customerSignature);
    formData.set("installerSignature", installerSignature);
    // The draft is deliberately NOT cleared here: if the request never
    // reaches the server (offline flip mid-submit, server error, timeout),
    // clearing it now would lose the signature/photos with no way back.
    // It's cleared once we land on the post-save page, which only happens
    // on a confirmed success (see ClearDraftOnMount on /records?saved=1).
    startTransition(() => {
      formAction(formData);
    });
  }

  const current = STEPS[step];

  return (
    <div className="flex flex-col gap-4">
      {pendingDraft && (
        <Alert variant="info">
          <div className="flex flex-col gap-2">
            <span>You have an unsaved draft from earlier. Resume it?</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={resumeDraft}>
                Resume draft
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={discardDraft}
              >
                Discard
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Stepper: tappable dots (with completion checks) + a slim progress bar
          + the current step's title. Sticky so it stays as the worker scrolls
          a long step. */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 px-4 pb-3 pt-3 backdrop-blur native:pt-[calc(0.75rem+env(safe-area-inset-top))] sm:static sm:mx-0 sm:rounded-xl sm:border sm:pt-3">
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((s, i) => {
            const active = i === step;
            const done = completed[i] && !active;
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => goStep(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    active
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : done
                        ? "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                        : "border-neutral-200 text-neutral-400 dark:border-neutral-700 dark:text-neutral-500"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </button>
                {i < LAST_STEP && (
                  <span
                    className={cn(
                      "h-px flex-1",
                      completed[i]
                        ? "bg-neutral-300 dark:bg-neutral-600"
                        : "bg-neutral-200 dark:bg-neutral-800"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {current.title === "Sign" ? "Signatures" : current.title === "Pay" ? "Payment" : current.title === "Time" ? "Time & Work" : current.title === "Job" ? "Job Details" : current.title}
          </span>
          <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>

      <form
        key={formKey}
        ref={formRef}
        onSubmit={handleSubmit}
        onInput={handleFormInput}
        onPointerUp={handleFormPointerUp}
        className="flex flex-col gap-4"
      >
        {(errorSummary.length > 0 || state?.error) && (
          <Alert variant="error">
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                {state?.error ?? "Please fix the following before submitting:"}
              </span>
              {errorSummary.length > 0 && (
                <ul className="ml-4 list-disc">
                  {errorSummary.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="underline underline-offset-2"
                        onClick={(ev) => {
                          ev.preventDefault();
                          focusField(item.id);
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Alert>
        )}

        {/* Step 1 - Job Details */}
        <div ref={(el) => { stepRefs.current[0] = el; }} hidden={step !== 0}>
          <FormSection icon={Briefcase} title="Job Details">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date" required>Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={values?.date ?? todayIsoDate()}
                aria-invalid={invalid("date")}
                aria-describedby={describedBy("date")}
              />
              <FieldError id="date-error" message={fieldError("date")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="jobNumber" required>Job #</Label>
              <Input
                id="jobNumber"
                name="jobNumber"
                required
                defaultValue={values?.jobNumber}
                aria-invalid={invalid("jobNumber")}
                aria-describedby={describedBy("jobNumber")}
              />
              <FieldError id="jobNumber-error" message={fieldError("jobNumber")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="leadInstallerName" required>Lead Installer</Label>
              <Input
                id="leadInstallerName"
                name="leadInstallerName"
                required
                defaultValue={values?.leadInstallerName}
                aria-invalid={invalid("leadInstallerName")}
                aria-describedby={describedBy("leadInstallerName")}
              />
              <FieldError
                id="leadInstallerName-error"
                message={fieldError("leadInstallerName")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="helperName">Helper <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
              <Input
                id="helperName"
                name="helperName"
                defaultValue={values?.helperName}
                aria-invalid={invalid("helperName")}
                aria-describedby={describedBy("helperName")}
              />
              <FieldError id="helperName-error" message={fieldError("helperName")} />
            </div>
            {projects.length > 0 && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="projectId">
                  Project{" "}
                  <span className="font-normal text-neutral-400 dark:text-neutral-500">
                    (optional)
                  </span>
                </Label>
                <Select
                  id="projectId"
                  name="projectId"
                  defaultValue={values?.projectId ?? ""}
                  onChange={handleProjectChange}
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </FormSection>
        </div>

        {/* Step 2 - Customer */}
        <div ref={(el) => { stepRefs.current[1] = el; }} hidden={step !== 1}>
          <FormSection icon={User} title="Customer">
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerName" required>Customer Name</Label>
              <CustomerAutocomplete
                ref={customerNameRef}
                defaultValue={values?.customerName}
                addressInputId="customerAddress"
                phoneInputId="customerPhone"
                emailInputId="customerEmail"
                invalid={invalid("customerName")}
                describedBy={describedBy("customerName")}
              />
              <FieldError
                id="customerName-error"
                message={fieldError("customerName")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerAddress" required>Customer Address</Label>
              <Input
                id="customerAddress"
                name="customerAddress"
                required
                autoComplete="street-address"
                defaultValue={values?.customerAddress}
                aria-invalid={invalid("customerAddress")}
                aria-describedby={describedBy("customerAddress")}
              />
              <FieldError
                id="customerAddress-error"
                message={fieldError("customerAddress")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerPhone">Customer Phone (optional)</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={values?.customerPhone}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="customerEmail">Customer Email (optional)</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                defaultValue={values?.customerEmail}
              />
            </div>
          </FormSection>
        </div>

        {/* Step 3 - Time & Work */}
        <div ref={(el) => { stepRefs.current[2] = el; }} hidden={step !== 2}>
          <FormSection icon={Clock} title="Time & Work">
            <div className="flex flex-col gap-2">
              <Label htmlFor="arrivalTime" required>Arrival Time</Label>
              <Input
                id="arrivalTime"
                name="arrivalTime"
                type="time"
                required
                defaultValue={values?.arrivalTime}
                onChange={updateDuration}
                aria-invalid={invalid("arrivalTime")}
                aria-describedby={describedBy("arrivalTime")}
              />
              <FieldError
                id="arrivalTime-error"
                message={fieldError("arrivalTime")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="departureTime" required>Departure Time</Label>
              <Input
                id="departureTime"
                name="departureTime"
                type="time"
                required
                defaultValue={values?.departureTime}
                onChange={updateDuration}
                aria-invalid={invalid("departureTime")}
                aria-describedby={describedBy("departureTime")}
              />
              <FieldError
                id="departureTime-error"
                message={fieldError("departureTime")}
              />
            </div>
            {duration && (
              <div className="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 sm:col-span-2">
                <Clock className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                <span>
                  Time on site: <span className="font-semibold tabular-nums">{duration}</span>
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="typeOfWork" required>Type of Work</Label>
              <TypeOfWorkField
                defaultValue={values?.typeOfWork}
                invalid={invalid("typeOfWork")}
                groups={workTypeGroups}
              />
              <FieldError
                id="typeOfWork-error"
                message={fieldError("typeOfWork")}
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="workPerformedNotes" required>Work Performed / Notes</Label>
              <Textarea
                id="workPerformedNotes"
                name="workPerformedNotes"
                required
                rows={5}
                defaultValue={values?.workPerformedNotes}
                aria-invalid={invalid("workPerformedNotes")}
                aria-describedby={describedBy("workPerformedNotes")}
              />
              <FieldError
                id="workPerformedNotes-error"
                message={fieldError("workPerformedNotes")}
              />
            </div>
          </FormSection>
        </div>

        {/* Step 4 - Payment */}
        <div ref={(el) => { stepRefs.current[3] = el; }} hidden={step !== 3}>
          <FormSection icon={DollarSign} title="Payment">
            <div className="flex flex-col gap-2">
              <Label htmlFor="leadInstallerPay" required>Lead Installer Pay ($)</Label>
              <Input
                id="leadInstallerPay"
                name="leadInstallerPay"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                defaultValue={values?.leadInstallerPay}
                aria-invalid={invalid("leadInstallerPay")}
                aria-describedby={describedBy("leadInstallerPay")}
              />
              <FieldError
                id="leadInstallerPay-error"
                message={fieldError("leadInstallerPay")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="helperPay">Helper Pay ($) <span className="font-normal text-neutral-400 dark:text-neutral-500">(optional)</span></Label>
              <Input
                id="helperPay"
                name="helperPay"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue={values?.helperPay}
                aria-invalid={invalid("helperPay")}
                aria-describedby={describedBy("helperPay")}
              />
              <FieldError id="helperPay-error" message={fieldError("helperPay")} />
            </div>
          </FormSection>
        </div>

        {/* Step 5 - Photos */}
        <div ref={(el) => { stepRefs.current[4] = el; }} hidden={step !== 4}>
          <FormSection
            icon={Camera}
            title={requirePhoto ? "Photos (required)" : "Photos (optional)"}
            emphasis="subtle"
          >
            {requirePhoto && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Your company requires at least one photo to submit this record.
              </p>
            )}
            <PhotoField defaultPhotos={values?.photos} />
            <FieldError id="photos-error" message={fieldError("photos")} />
          </FormSection>
        </div>

        {/* Step 6 - Signatures */}
        <div ref={(el) => { stepRefs.current[5] = el; }} hidden={step !== 5}>
          <FormSection icon={PenTool} title="Signatures" emphasis="critical">
            <SignaturePad
              id="sig-customer"
              ref={customerSigRef}
              label="Customer Signature"
              defaultValue={values?.customerSignature}
              error={sigErrors.customer}
            />
            <SignaturePad
              id="sig-installer"
              ref={installerSigRef}
              label="Installer Signature"
              defaultValue={values?.installerSignature}
              error={sigErrors.installer}
            />
          </FormSection>
        </div>

        {offline && (
          <Alert variant="warning">
            <span className="font-medium">You&apos;re offline.</span> Your entry
            is saved on this device. Reconnect to submit it.
          </Alert>
        )}

        {/* Spacer so the fixed mobile action bar doesn't cover the last section */}
        <div className="h-[calc(4rem+env(safe-area-inset-bottom))] sm:hidden" />

        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0">
          {step === 0 ? (
            guardUnsaved && dirty ? (
              <ConfirmDialog
                title="Discard changes?"
                description="You have unsaved edits. Leaving now will lose them."
                confirmLabel="Discard"
                trigger={
                  <Button type="button" variant="outline" size="lg">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                }
                onConfirm={() => router.back()}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.back()}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => goStep(step - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {step < LAST_STEP ? (
            <Button type="button" size="lg" className="flex-1" onClick={goNext}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={pending || offline}
            >
              {offline ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {offline ? "Offline" : pending ? "Saving..." : submitLabel}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
