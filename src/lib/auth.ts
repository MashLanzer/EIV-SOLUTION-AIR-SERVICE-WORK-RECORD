import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      // Force Google's account picker every time instead of silently
      // continuing with whatever Google account already has an active
      // session in the system browser - otherwise a device with multiple
      // Google accounts can never switch, and an unauthorized account gets
      // silently rejected with no visible chance to pick a different one.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const dbUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      });
      // A pre-approved account that's been deactivated stays blocked. An
      // unknown email is now allowed through so the person can create or join
      // a company on the onboarding screen (they get no data access until
      // they do - see the jwt callback and requireOrgId).
      if (dbUser && !dbUser.active) return false;
      return true;
    },
    async jwt({ token, user }) {
      // Runs on every request that reads the session (not just sign-in), so
      // this re-checks `active`/role/name against the DB instead of trusting
      // whatever was baked into the token weeks ago. Returning null drops
      // the session immediately - deactivating someone takes effect soon
      // after, not just their next sign-in.
      //
      // `checkedAt` lets a fresh-enough, already-onboarded token skip the DB
      // round-trip. A not-yet-onboarded token (no id) always re-checks, so a
      // company created/joined on the onboarding screen is picked up on the
      // very next request instead of after the staleness window.
      const email = (user?.email ?? (token.email as string | undefined))?.toLowerCase();
      if (!email) return token;
      token.email = email;

      const STALE_AFTER_MS = 5 * 60 * 1000;
      const checkedAt = token.checkedAt as number | undefined;
      if (!user && token.id && checkedAt && Date.now() - checkedAt < STALE_AFTER_MS) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser) {
        if (!dbUser.active) return null;
        token.id = dbUser.id;
        token.role = dbUser.role;
        token.name = dbUser.name;
        token.organizationId = dbUser.organizationId;
        token.checkedAt = Date.now();
        return token;
      }

      // Signed in with Google but not part of any company yet: keep a minimal
      // session so /onboarding can create or join one. Empty id + null org
      // means every org-scoped page bounces them to onboarding.
      token.id = "";
      token.role = "WORKER";
      token.organizationId = null;
      token.checkedAt = Date.now();
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN" | "WORKER";
      session.user.organizationId =
        (token.organizationId as string | null) ?? null;
      return session;
    },
  },
});
