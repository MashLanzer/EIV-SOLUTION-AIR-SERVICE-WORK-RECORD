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
      return !!dbUser && dbUser.active;
    },
    async jwt({ token, user }) {
      // Runs on every request that reads the session (not just sign-in), so
      // this re-checks `active`/role/name against the DB instead of trusting
      // whatever was baked into the token weeks ago. Returning null drops
      // the session immediately - deactivating someone takes effect soon
      // after, not just their next sign-in.
      //
      // Checking on literally every request means one Prisma round-trip per
      // navigation for every signed-in user, which is unnecessary load for
      // something that only needs to change within a few minutes of an
      // admin flipping `active`. `checkedAt` lets a fresh-enough token skip
      // the DB call; sign-in (`user` present) always checks regardless.
      const email = (user?.email ?? (token.email as string | undefined))?.toLowerCase();
      if (!email) return token;

      const STALE_AFTER_MS = 5 * 60 * 1000;
      const checkedAt = token.checkedAt as number | undefined;
      if (!user && checkedAt && Date.now() - checkedAt < STALE_AFTER_MS) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (!dbUser || !dbUser.active) return null;

      token.id = dbUser.id;
      token.role = dbUser.role;
      token.name = dbUser.name;
      token.checkedAt = Date.now();
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN" | "WORKER";
      return session;
    },
  },
});
