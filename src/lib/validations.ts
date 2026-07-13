import { z } from "zod";

export const TYPE_OF_WORK_OPTIONS = [
  "Installation",
  "Repair",
  "Maintenance",
  "Inspection",
  "Ductos",
  "Mini Split",
  "Other",
] as const;

export const MAX_PHOTOS = 4;

// "HH:mm" (native <input type="time"> format) to minutes since midnight.
function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export const workRecordSchema = z
  .object({
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
    // Required-ness is enforced per-org at the app level (see
    // requireCustomerSignature) so it can be turned off for unattended jobs;
    // the schema only bounds the size.
    customerSignature: z
      .string()
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
  })
  .refine(
    (data) => timeToMinutes(data.departureTime) > timeToMinutes(data.arrivalTime),
    {
      message: "Departure time must be after arrival time",
      path: ["departureTime"],
    }
  );

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
});

export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED"] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatusValue, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(120),
  address: z.string().max(200).optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES).default("ACTIVE"),
});

export const teamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(80),
  color: z.string().max(20).optional(),
});

export const createWorkerSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["ADMIN", "WORKER"]),
});

export const updateWorkerEmailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const updateWorkerRoleSchema = z.object({
  role: z.enum(["ADMIN", "WORKER"]),
});

export const updateProfileNameSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
});

export const updateProfilePhoneSchema = z.object({
  phone: z
    .string()
    .max(40, "Phone number is too long")
    .optional()
    .or(z.literal("")),
});

export const saveStoredSignatureSchema = z.object({
  signature: z.string().min(1, "Signature is required").max(300_000, "Signature image is too large"),
});

export const addSkillSchema = z.object({
  name: z.string().trim().min(1, "Skill name is required").max(60, "Skill name is too long"),
});

export const SCHEDULED_JOB_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "DONE",
  "CANCELED",
] as const;
export type ScheduledJobStatusValue = (typeof SCHEDULED_JOB_STATUSES)[number];

// A planned visit on the calendar. Times are optional (some jobs are just
// "sometime that day"); when both are given, end must be after start.
export const scheduledJobSchema = z
  .object({
    title: z.string().trim().min(1, "A title is required").max(120, "Title is too long"),
    scheduledFor: z.string().min(1, "A date is required"),
    startTime: z.string().optional().or(z.literal("")),
    endTime: z.string().optional().or(z.literal("")),
    requiredSkill: z.string().trim().max(60, "Skill is too long").optional().or(z.literal("")),
    notes: z.string().max(2000, "Notes are too long").optional().or(z.literal("")),
  })
  .refine(
    (d) =>
      !d.startTime ||
      !d.endTime ||
      timeToMinutes(d.endTime) > timeToMinutes(d.startTime),
    { message: "End time must be after start time", path: ["endTime"] }
  );

export const updateOrganizationNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(120, "Company name is too long"),
});
