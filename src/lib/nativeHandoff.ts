import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { encode } from "next-auth/jwt";

import { prisma } from "@/lib/prisma";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

// Single-use regardless of TTL (consumeNativeHandoffCode deletes it on
// first use), so a generous window just protects against a slow browser
// hop back to the app - it doesn't widen the actual attack surface.
const CODE_TTL_MS = 5 * 60_000;

// Shared by both native handoff paths: the browser-based OAuth flow
// (/native-handoff) and the direct Credential Manager flow
// (/api/native-handoff/google-token) both end up here once they've
// confirmed who's signing in, to mint the same session token shape
// next-auth's own cookie would hold.
export async function mintNativeSessionToken(user: {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
}) {
  const proto = (await headers()).get("x-forwarded-proto");
  const cookieName =
    proto === "https" ? "__Secure-authjs.session-token" : "authjs.session-token";

  const token = await encode({
    token: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      sub: user.id,
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    maxAge: THIRTY_DAYS,
  });

  return { token, cookieName };
}

export async function createNativeHandoffCode(token: string, cookieName: string) {
  const id = randomBytes(32).toString("base64url");
  await prisma.nativeHandoffCode.create({
    data: { id, token, cookieName, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  return id;
}

// Single-use: DELETE...RETURNING is atomic, so concurrent/replayed exchange
// calls for the same code can only ever have one winner.
export async function consumeNativeHandoffCode(code: string) {
  let record;
  try {
    record = await prisma.nativeHandoffCode.delete({ where: { id: code } });
  } catch {
    return null; // unknown code, or already consumed
  }

  // Best-effort cleanup of other codes left unused past their TTL.
  prisma.nativeHandoffCode
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  if (record.expiresAt < new Date()) return null;
  return { token: record.token, cookieName: record.cookieName };
}
