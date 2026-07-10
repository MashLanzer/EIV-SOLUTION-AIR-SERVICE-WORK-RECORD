import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "WORKER";

declare module "next-auth" {
  interface User {
    id: string;
    role: AppRole;
    organizationId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      organizationId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
    organizationId: string | null;
  }
}
