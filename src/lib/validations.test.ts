import { describe, expect, it } from "vitest";

import {
  createWorkerSchema,
  customerSchema,
  MAX_PHOTOS,
  workRecordSchema,
} from "@/lib/validations";

const validPhoto = `data:image/jpeg;base64,${"a".repeat(100)}`;

function baseRecord() {
  return {
    date: "2026-07-05",
    jobNumber: "123",
    leadInstallerName: "Alex",
    customerName: "Acme Corp",
    customerAddress: "123 Main St",
    arrivalTime: "09:00",
    departureTime: "11:00",
    typeOfWork: "Repair",
    workPerformedNotes: "Replaced the compressor",
    leadInstallerPay: "150",
    customerSignature: "data:image/png;base64,aaa",
    installerSignature: "data:image/png;base64,bbb",
  };
}

describe("workRecordSchema", () => {
  it("accepts a minimal valid record", () => {
    const result = workRecordSchema.safeParse(baseRecord());
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const rest = baseRecord();
    delete (rest as Partial<typeof rest>).jobNumber;
    const result = workRecordSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects a negative pay amount", () => {
    const result = workRecordSchema.safeParse({
      ...baseRecord(),
      leadInstallerPay: "-5",
    });
    expect(result.success).toBe(false);
  });

  it("allows helper pay to be omitted", () => {
    const result = workRecordSchema.safeParse({
      ...baseRecord(),
      helperPay: "",
    });
    expect(result.success).toBe(true);
  });

  it(`caps photos at ${MAX_PHOTOS}`, () => {
    const result = workRecordSchema.safeParse({
      ...baseRecord(),
      photos: Array(MAX_PHOTOS + 1).fill(validPhoto),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a photo that isn't a data: image URL", () => {
    const result = workRecordSchema.safeParse({
      ...baseRecord(),
      photos: ["not-a-data-url"],
    });
    expect(result.success).toBe(false);
  });
});

describe("customerSchema", () => {
  it("requires name and address but not phone/email", () => {
    expect(
      customerSchema.safeParse({ name: "Acme", address: "1 Main St" }).success
    ).toBe(true);
  });

  it("rejects an invalid email when one is provided", () => {
    expect(
      customerSchema.safeParse({
        name: "Acme",
        address: "1 Main St",
        email: "not-an-email",
      }).success
    ).toBe(false);
  });
});

describe("createWorkerSchema", () => {
  it("accepts a valid worker", () => {
    expect(
      createWorkerSchema.safeParse({
        email: "worker@example.com",
        name: "Jamie",
        role: "WORKER",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid role", () => {
    expect(
      createWorkerSchema.safeParse({
        email: "worker@example.com",
        name: "Jamie",
        role: "SUPERUSER",
      }).success
    ).toBe(false);
  });
});
