import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORARY diagnostic endpoint. Reports whether the *running* deployment has
// the env vars wired up, which commit is live, and whether the caller's own
// email counts as a platform owner — without ever exposing secret values (only
// booleans, counts, the live commit SHA, and the caller's own email). Used to
// tell apart "env var not set" from "deploy not live". Remove once resolved.
export async function GET() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  const superRaw = process.env.SUPER_ADMIN_EMAILS ?? "";
  const superCount = superRaw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean).length;

  // Live end-to-end Blob test: proves the token actually works (not just that
  // the env var string exists) and surfaces the real error if it doesn't.
  let blobWrite: { ok: boolean; error?: string } = { ok: false, error: "no token" };
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put, del } = await import("@vercel/blob");
      const b = await put(`diag/${crypto.randomUUID()}.txt`, "ok", {
        access: "public",
        contentType: "text/plain",
      });
      blobWrite = { ok: true };
      try {
        await del(b.url);
      } catch {
        // ignore cleanup failure
      }
    } catch (e) {
      blobWrite = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json({
    liveCommit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    liveBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    blobWriteWorks: blobWrite.ok,
    blobWriteError: blobWrite.error ?? null,
    superAdminEmailsConfigured: Boolean(superRaw),
    superAdminEmailCount: superCount,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    yourEmail: email,
    youAreSignedIn: Boolean(session?.user),
    youAreSuperAdmin: isSuperAdminEmail(email),
  });
}
