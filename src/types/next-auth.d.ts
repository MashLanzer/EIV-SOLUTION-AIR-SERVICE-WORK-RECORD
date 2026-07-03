import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "WORKER";

declare module "next-auth" {
  interface User {
    id: string;
    role: AppRole;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
  }
}
