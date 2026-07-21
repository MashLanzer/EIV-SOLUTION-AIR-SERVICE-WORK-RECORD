import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "SUPERVISOR" | "WORKER";
// Effective app-access level: which app the user enters. Derived from the base
// role and any assigned Position, so an office Position grants ADMIN access even
// to a WORKER-role user. Used by the Edge middleware gate (it can't hit the DB).
type AppAccessLevel = "ADMIN" | "WORKER";

declare module "next-auth" {
  interface User {
    id: string;
    role: AppRole;
    accessLevel: AppAccessLevel;
    organizationId: string | null;
    phone: string | null;
    storedSignature: string | null;
    avatarUrl: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      accessLevel: AppAccessLevel;
      organizationId: string | null;
      phone: string | null;
      storedSignature: string | null;
      avatarUrl: string | null;
      // Set only while a platform owner is in "support mode" for a company.
      // The org/role above are overridden to that company for the request; id
      // and email stay the real owner's. readOnly maps to supervisor-level
      // access; expiresAt is an ISO string for the banner countdown.
      impersonating?: {
        orgId: string;
        name: string;
        readOnly: boolean;
        expiresAt: string;
        // Set when viewing as a specific user (their name); null for
        // whole-company support.
        asUser?: string | null;
      } | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    accessLevel: AppAccessLevel;
    organizationId: string | null;
    phone: string | null;
    storedSignature: string | null;
    avatarUrl: string | null;
  }
}
