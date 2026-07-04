import { z } from "zod";

export const TYPE_OF_WORK_OPTIONS = [
  "Installation",
  "Repair",
  "Maintenance",
  "Inspection",
  "Other",
] as const;

export const MAX_PHOTOS = 4;

export const workRecordSchema = z.object({
  date: z.string().min(1, "Date is required"),
  jobNumber: z.string().min(1, "Job # is required"),
  leadInstallerName: z.string().min(1, "Lead installer is required"),
  helperName: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerAddress: z.string().min(1, "Customer address is required"),
  arrivalTime: z.string().min(1, "Arrival time is required"),
  departureTime: z.string().min(1, "Departure time is required"),
  typeOfWork: z.string().min(1, "Type of work is required"),
  workPerformedNotes: z.string().min(1, "Please describe the work performed"),
  leadInstallerPay: z.coerce.number().min(0, "Must be 0 or greater"),
  helperPay: z.coerce.number().min(0).optional().or(z.literal("")),
  customerSignature: z
    .string()
    .min(1, "Customer signature is required")
    .max(300_000, "Signature image is too large"),
  installerSignature: z
    .string()
    .min(1, "Installer signature is required")
    .max(300_000, "Signature image is too large"),
  photos: z
    .array(
      z
        .string()
        .regex(/^data:image\/(jpeg|png|webp);base64,/, "Invalid photo format")
        .max(700_000, "A photo is too large")
    )
    .max(MAX_PHOTOS, `At most ${MAX_PHOTOS} photos per record`)
    .optional(),
});

export const createWorkerSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["ADMIN", "WORKER"]),
});

export const updateWorkerEmailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
