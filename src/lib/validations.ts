import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const TYPE_OF_WORK_OPTIONS = [
  "Installation",
  "Repair",
  "Maintenance",
  "Inspection",
  "Other",
] as const;

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
});

export const createWorkerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9._-]+$/i, "Only letters, numbers, dots, dashes and underscores"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["ADMIN", "WORKER"]),
});
