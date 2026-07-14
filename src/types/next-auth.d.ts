import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "SUPERVISOR" | "WORKER";

declare module "next-auth" {
  interface User {
    id: string;
    role: AppRole;
    organizationId: string | null;
    phone: string | null;
    storedSignature: string | null;
    avatarUrl: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      organizationId: string | null;
      phone: string | null;
      storedSignature: string | null;
      avatarUrl: string | null;
      // Set only while a platform owner is in "support mode" for a company.
      // The org/role above are overridden to that company for the request; id
      // and email stay the real owner's.
      impersonating?: { orgId: string; name: string } | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    organizationId: string | null;
    phone: string | null;
    storedSignature: string | null;
    avatarUrl: string | null;
  }
}
