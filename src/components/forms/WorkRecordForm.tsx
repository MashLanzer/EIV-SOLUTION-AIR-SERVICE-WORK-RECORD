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
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerAutocomplete } from "@/components/forms/CustomerAutocomplete";
import { FormSection } from "@/components/forms/FormSection";
import { PhotoField } from "@/components/forms/PhotoField";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/forms/SignaturePad";
import { TypeOfWorkField } from "@/components/forms/TypeOfWorkField";
import { clearDraft, getDraft, setDraft } from "@/lib/draftStore";
import type { RecordFormState } from "@/actions/records";

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
  projects?: { id: string; name: string }[];
}

function todayIsoDate() {
  // Local calendar day - toISOString() alone is UTC and can be off by a
  // day for evening use in the Americas.
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
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

  function focusField(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLElement) el.focus?.();
  }

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

  function resumeDraft() {
    if (!pendingDraft) return;
    setValues(pendingDraft);
    setFormKey((k) => k + 1);
    setPendingDraft(null);
  }

  function discardDraft() {
    setPendingDraft(null);
    if (draftKey) clearDraft(draftKey);
  }

  // After a failed server validation, bring the first offending field
  // into view (the form is long on phones).
  useEffect(() => {
    if (!state?.fieldErrors) return;
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector('[aria-invalid="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [state]);

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
      requestAnimationFrame(() =>
        focusField(next.customer ? "sig-customer" : "sig-installer")
      );
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

      <form
        key={formKey}
        ref={formRef}
        onSubmit={handleSubmit}
        onInput={scheduleSave}
        onPointerUp={scheduleSave}
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

        <FormSection
          icon={Briefcase}
          title="Job Details"
          className="animate-fade-up"
          style={{ animationDelay: "0ms" }}
        >
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
            <div className="flex flex-col gap-2">
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

        <FormSection
          icon={User}
          title="Customer"
          className="animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="customerName" required>Customer Name</Label>
            <CustomerAutocomplete
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

        <FormSection
          icon={Clock}
          title="Time & Work"
          className="animate-fade-up"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="arrivalTime" required>Arrival Time</Label>
            <Input
              id="arrivalTime"
              name="arrivalTime"
              type="time"
              required
              defaultValue={values?.arrivalTime}
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
              aria-invalid={invalid("departureTime")}
              aria-describedby={describedBy("departureTime")}
            />
            <FieldError
              id="departureTime-error"
              message={fieldError("departureTime")}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="typeOfWork" required>Type of Work</Label>
            <TypeOfWorkField
              defaultValue={values?.typeOfWork}
              invalid={invalid("typeOfWork")}
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

        <FormSection
          icon={DollarSign}
          title="Payment"
          className="animate-fade-up"
          style={{ animationDelay: "180ms" }}
        >
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

        <FormSection
          icon={Camera}
          title="Photos (optional)"
          emphasis="subtle"
          className="animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <PhotoField defaultPhotos={values?.photos} />
          <FieldError id="photos-error" message={fieldError("photos")} />
        </FormSection>

        <FormSection
          icon={PenTool}
          title="Signatures"
          emphasis="critical"
          className="animate-fade-up"
          style={{ animationDelay: "300ms" }}
        >
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

        {offline && (
          <Alert variant="warning">
            <span className="font-medium">You&apos;re offline.</span> Your entry
            is saved on this device. Reconnect to submit it.
          </Alert>
        )}

        {/* Spacer so the fixed mobile action bar doesn't cover the last section */}
        <div className="h-[calc(4rem+env(safe-area-inset-bottom))] sm:hidden" />

        <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0">
          <Button type="submit" size="lg" disabled={pending || offline}>
            {offline ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {offline ? "Offline" : pending ? "Saving..." : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
