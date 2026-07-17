import type { Prisma } from "@prisma/client";

// Quick filters for the customer list, shared by the list page and the CSV
// export so "what you see is what you export".
export type CustomerFilter = "upcoming" | "nocontact";

export function normalizeCustomerFilter(value?: string | null): CustomerFilter | undefined {
  return value === "upcoming" || value === "nocontact" ? value : undefined;
}

// Free-text search across the fields the list searches on.
export function customerSearchWhere(query?: string): Prisma.CustomerWhereInput {
  if (!query) return {};
  return {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { address: { contains: query, mode: "insensitive" } },
      { phone: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ],
  };
}

// The predicate for a quick filter. "upcoming" = has a future, non-canceled
// scheduled visit; "nocontact" = no phone and no email on file (null or "").
export function customerFilterWhere(
  filter: CustomerFilter | undefined,
  today: Date
): Prisma.CustomerWhereInput {
  if (filter === "upcoming") {
    return {
      scheduledJobs: {
        some: { scheduledFor: { gte: today }, status: { not: "CANCELED" } },
      },
    };
  }
  if (filter === "nocontact") {
    return {
      AND: [
        { OR: [{ phone: null }, { phone: "" }] },
        { OR: [{ email: null }, { email: "" }] },
      ],
    };
  }
  return {};
}
