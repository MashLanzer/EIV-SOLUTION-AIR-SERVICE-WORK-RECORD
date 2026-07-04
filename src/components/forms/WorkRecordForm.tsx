"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, User, Clock, DollarSign, PenTool, Save, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSection } from "@/components/forms/FormSection";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/forms/SignaturePad";
import { TypeOfWorkField } from "@/components/forms/TypeOfWorkField";
import type { RecordFormState } from "@/actions/records";

export interface WorkRecordFormValues {
  date: string;
  jobNumber: string;
  leadInstallerName: string;
  helperName: string;
  customerName: string;
  customerAddress: string;
  arrivalTime: string;
  departureTime: string;
  typeOfWork: string;
  workPerformedNotes: string;
  leadInstallerPay: string;
  helperPay: string;
  customerSignature: string;
  installerSignature: string;
}

interface WorkRecordFormProps {
  action: (
    prevState: RecordFormState,
    formData: FormData
  ) => Promise<RecordFormState>;
  defaultValues?: Partial<WorkRecordFormValues>;
  submitLabel?: string;
}

function todayIsoDate() {
  // Local calendar day - toISOString() alone is UTC and can be off by a
  // day for evening use in the Americas.
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function WorkRecordForm({
  action,
  defaultValues,
  submitLabel = "Submit",
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
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const fieldError = (name: string) => state?.fieldErrors?.[name]?.[0];
  const invalid = (name: string) => (fieldError(name) ? true : undefined);
  const describedBy = (name: string) =>
    fieldError(name) ? `${name}-error` : undefined;

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
    setSignatureError(null);

    const customerSignature = customerSigRef.current?.getDataUrl();
    const installerSignature = installerSigRef.current?.getDataUrl();

    if (!customerSignature) {
      setSignatureError("Customer signature is required.");
      return;
    }
    if (!installerSignature) {
      setSignatureError("Installer signature is required.");
      return;
    }

    const formData = new FormData(formRef.current!);
    formData.set("customerSignature", customerSignature);
    formData.set("installerSignature", installerSignature);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormSection icon={Briefcase} title="Job Details">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaultValues?.date ?? todayIsoDate()}
            aria-invalid={invalid("date")}
            aria-describedby={describedBy("date")}
          />
          <FieldError id="date-error" message={fieldError("date")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jobNumber">Job #</Label>
          <Input
            id="jobNumber"
            name="jobNumber"
            required
            defaultValue={defaultValues?.jobNumber}
            aria-invalid={invalid("jobNumber")}
            aria-describedby={describedBy("jobNumber")}
          />
          <FieldError id="jobNumber-error" message={fieldError("jobNumber")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="leadInstallerName">Lead Installer</Label>
          <Input
            id="leadInstallerName"
            name="leadInstallerName"
            required
            defaultValue={defaultValues?.leadInstallerName}
            aria-invalid={invalid("leadInstallerName")}
            aria-describedby={describedBy("leadInstallerName")}
          />
          <FieldError
            id="leadInstallerName-error"
            message={fieldError("leadInstallerName")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="helperName">Helper</Label>
          <Input
            id="helperName"
            name="helperName"
            defaultValue={defaultValues?.helperName}
            aria-invalid={invalid("helperName")}
            aria-describedby={describedBy("helperName")}
          />
          <FieldError id="helperName-error" message={fieldError("helperName")} />
        </div>
      </FormSection>

      <FormSection icon={User} title="Customer">
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            name="customerName"
            required
            defaultValue={defaultValues?.customerName}
            aria-invalid={invalid("customerName")}
            aria-describedby={describedBy("customerName")}
          />
          <FieldError
            id="customerName-error"
            message={fieldError("customerName")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerAddress">Customer Address</Label>
          <Input
            id="customerAddress"
            name="customerAddress"
            required
            defaultValue={defaultValues?.customerAddress}
            aria-invalid={invalid("customerAddress")}
            aria-describedby={describedBy("customerAddress")}
          />
          <FieldError
            id="customerAddress-error"
            message={fieldError("customerAddress")}
          />
        </div>
      </FormSection>

      <FormSection icon={Clock} title="Time & Work">
        <div className="flex flex-col gap-2">
          <Label htmlFor="arrivalTime">Arrival Time</Label>
          <Input
            id="arrivalTime"
            name="arrivalTime"
            type="time"
            required
            defaultValue={defaultValues?.arrivalTime}
            aria-invalid={invalid("arrivalTime")}
            aria-describedby={describedBy("arrivalTime")}
          />
          <FieldError
            id="arrivalTime-error"
            message={fieldError("arrivalTime")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="departureTime">Departure Time</Label>
          <Input
            id="departureTime"
            name="departureTime"
            type="time"
            required
            defaultValue={defaultValues?.departureTime}
            aria-invalid={invalid("departureTime")}
            aria-describedby={describedBy("departureTime")}
          />
          <FieldError
            id="departureTime-error"
            message={fieldError("departureTime")}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Type of Work</Label>
          <TypeOfWorkField
            defaultValue={defaultValues?.typeOfWork}
            invalid={invalid("typeOfWork")}
          />
          <FieldError
            id="typeOfWork-error"
            message={fieldError("typeOfWork")}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="workPerformedNotes">Work Performed / Notes</Label>
          <Textarea
            id="workPerformedNotes"
            name="workPerformedNotes"
            required
            rows={5}
            defaultValue={defaultValues?.workPerformedNotes}
            aria-invalid={invalid("workPerformedNotes")}
            aria-describedby={describedBy("workPerformedNotes")}
          />
          <FieldError
            id="workPerformedNotes-error"
            message={fieldError("workPerformedNotes")}
          />
        </div>
      </FormSection>

      <FormSection icon={DollarSign} title="Payment">
        <div className="flex flex-col gap-2">
          <Label htmlFor="leadInstallerPay">Lead Installer Pay ($)</Label>
          <Input
            id="leadInstallerPay"
            name="leadInstallerPay"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultValues?.leadInstallerPay}
            aria-invalid={invalid("leadInstallerPay")}
            aria-describedby={describedBy("leadInstallerPay")}
          />
          <FieldError
            id="leadInstallerPay-error"
            message={fieldError("leadInstallerPay")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="helperPay">Helper Pay ($)</Label>
          <Input
            id="helperPay"
            name="helperPay"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.helperPay}
            aria-invalid={invalid("helperPay")}
            aria-describedby={describedBy("helperPay")}
          />
          <FieldError id="helperPay-error" message={fieldError("helperPay")} />
        </div>
      </FormSection>

      <FormSection icon={PenTool} title="Signatures">
        <SignaturePad
          ref={customerSigRef}
          label="Customer Signature"
          defaultValue={defaultValues?.customerSignature}
        />
        <SignaturePad
          ref={installerSigRef}
          label="Installer Signature"
          defaultValue={defaultValues?.installerSignature}
        />
      </FormSection>

      {(signatureError || state?.error) && (
        <Alert variant="error">{signatureError ?? state?.error}</Alert>
      )}

      {/* Spacer so the fixed mobile action bar doesn't cover the last section */}
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] sm:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-3 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="submit" size="lg" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Saving..." : submitLabel}
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
  );
}
