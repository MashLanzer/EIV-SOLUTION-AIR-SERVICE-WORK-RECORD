import type { DefaultSession } from "next-auth";

type AppRole = "ADMIN" | "WORKER";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: AppRole;
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: AppRole;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: AppRole;
    mustChangePassword: boolean;
  }
}
