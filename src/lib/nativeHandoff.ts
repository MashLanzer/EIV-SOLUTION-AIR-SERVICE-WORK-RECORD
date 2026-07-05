import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 60_000;

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
