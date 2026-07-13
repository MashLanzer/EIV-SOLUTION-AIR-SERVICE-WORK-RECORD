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
