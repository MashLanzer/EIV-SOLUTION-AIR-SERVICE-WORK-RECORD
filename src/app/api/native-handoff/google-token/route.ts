import { NextResponse } from "next/server";

import { mintNativeSessionToken } from "@/lib/nativeHandoff";
import { prisma } from "@/lib/prisma";
import { verifyGoogleIdToken } from "@/lib/verifyGoogleIdToken";

export const runtime = "nodejs";

// Counterpart to /api/native-handoff/exchange for the Credential Manager
// flow: the native app already obtained a Google ID token directly from the
// OS account picker (no browser hop needed), so this just verifies it and
// mints the same session token shape the browser-based flow would.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : null;
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let email: string;
  let name: string | undefined;
  try {
    ({ email, name } = await verifyGoogleIdToken(idToken));
  } catch {
    return NextResponse.json({ error: "Invalid Google ID token" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!dbUser || !dbUser.active) {
    return NextResponse.json(
      { error: "This Google account isn't authorized" },
      { status: 403 }
    );
  }

  const result = await mintNativeSessionToken({
    id: dbUser.id,
    role: dbUser.role,
    name: dbUser.name ?? name,
    email: dbUser.email,
  });
  // Echo the resolved account back so the app can confirm on-device which
  // account it actually signed in as (the two-account mix-up is otherwise
  // invisible until you land inside the app).
  return NextResponse.json({ ...result, email: dbUser.email });
}
