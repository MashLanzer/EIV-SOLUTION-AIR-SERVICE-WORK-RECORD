"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/session";
import { workRecordSchema } from "@/lib/validations";

export type RecordFormState = { error?: string } | undefined;

function parseRecordForm(formData: FormData) {
  return workRecordSchema.safeParse({
    date: formData.get("date"),
    jobNumber: formData.get("jobNumber"),
    leadInstallerName: formData.get("leadInstallerName"),
    helperName: formData.get("helperName") || undefined,
    customerName: formData.get("customerName"),
    customerAddress: formData.get("customerAddress"),
    arrivalTime: formData.get("arrivalTime"),
    departureTime: formData.get("departureTime"),
    typeOfWork: formData.get("typeOfWork"),
    workPerformedNotes: formData.get("workPerformedNotes"),
    leadInstallerPay: formData.get("leadInstallerPay"),
    helperPay: formData.get("helperPay") || undefined,
    customerSignature: formData.get("customerSignature"),
    installerSignature: formData.get("installerSignature"),
  });
}

export async function createRecordAction(
  _prevState: RecordFormState,
  formData: FormData
): Promise<RecordFormState> {
  const session = await requireAuth();

  const parsed = parseRecordForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  await prisma.workRecord.create({
    data: {
      date: new Date(data.date),
      jobNumber: data.jobNumber,
      leadInstallerName: data.leadInstallerName,
      helperName: data.helperName || null,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      arrivalTime: data.arrivalTime,
      departureTime: data.departureTime,
      typeOfWork: data.typeOfWork,
      workPerformedNotes: data.workPerformedNotes,
      leadInstallerPay: data.leadInstallerPay,
      helperPay: data.helperPay === "" || data.helperPay == null ? null : data.helperPay,
      customerSignature: data.customerSignature,
      installerSignature: data.installerSignature,
      submittedById: session.user.id,
    },
  });

  revalidatePath("/records");
  redirect("/records");
}

export async function updateRecordAction(
  recordId: string,
  _prevState: RecordFormState,
  formData: FormData
): Promise<RecordFormState> {
  const session = await requireAuth();

  const record = await prisma.workRecord.findUnique({ where: { id: recordId } });
  if (!record) return { error: "Record not found" };
  if (session.user.role !== "ADMIN" && record.submittedById !== session.user.id) {
    return { error: "You do not have permission to edit this record" };
  }

  const parsed = parseRecordForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  await prisma.workRecord.update({
    where: { id: recordId },
    data: {
      date: new Date(data.date),
      jobNumber: data.jobNumber,
      leadInstallerName: data.leadInstallerName,
      helperName: data.helperName || null,
      customerName: data.customerName,
      customerAddress: data.customerAddress,
      arrivalTime: data.arrivalTime,
      departureTime: data.departureTime,
      typeOfWork: data.typeOfWork,
      workPerformedNotes: data.workPerformedNotes,
      leadInstallerPay: data.leadInstallerPay,
      helperPay: data.helperPay === "" || data.helperPay == null ? null : data.helperPay,
      customerSignature: data.customerSignature,
      installerSignature: data.installerSignature,
    },
  });

  revalidatePath("/records");
  revalidatePath("/admin/records");
  redirect(session.user.role === "ADMIN" ? `/admin/records/${recordId}` : `/records/${recordId}`);
}

export async function deleteRecordAction(recordId: string) {
  await requireAdmin();
  await prisma.workRecord.delete({ where: { id: recordId } });
  revalidatePath("/admin/records");
  redirect("/admin/records");
}
