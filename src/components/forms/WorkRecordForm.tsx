"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  return new Date().toISOString().slice(0, 10);
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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaultValues?.date ?? todayIsoDate()}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jobNumber">Job #</Label>
          <Input
            id="jobNumber"
            name="jobNumber"
            required
            defaultValue={defaultValues?.jobNumber}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="leadInstallerName">Lead Installer</Label>
          <Input
            id="leadInstallerName"
            name="leadInstallerName"
            required
            defaultValue={defaultValues?.leadInstallerName}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="helperName">Helper</Label>
          <Input
            id="helperName"
            name="helperName"
            defaultValue={defaultValues?.helperName}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            name="customerName"
            required
            defaultValue={defaultValues?.customerName}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerAddress">Customer Address</Label>
          <Input
            id="customerAddress"
            name="customerAddress"
            required
            defaultValue={defaultValues?.customerAddress}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="arrivalTime">Arrival Time</Label>
          <Input
            id="arrivalTime"
            name="arrivalTime"
            type="time"
            required
            defaultValue={defaultValues?.arrivalTime}
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
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label>Type of Work</Label>
          <TypeOfWorkField defaultValue={defaultValues?.typeOfWork} />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="workPerformedNotes">Work Performed / Notes</Label>
          <Textarea
            id="workPerformedNotes"
            name="workPerformedNotes"
            required
            rows={5}
            defaultValue={defaultValues?.workPerformedNotes}
          />
        </div>
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
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      {(signatureError || state?.error) && (
        <p className="text-sm text-red-600" role="alert">
          {signatureError ?? state?.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
