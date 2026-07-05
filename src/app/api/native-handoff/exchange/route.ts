import { NextResponse } from "next/server";

import { consumeNativeHandoffCode } from "@/lib/nativeHandoff";

export const runtime = "nodejs";

// Called by the native app (unauthenticated - it has no session yet) right
// after receiving the eivsolutionair://auth-callback deep link. Trades the
// short-lived, single-use code from that link for the actual session token,
// so the token itself never has to travel through the deep link.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : null;
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const result = await consumeNativeHandoffCode(code);
  if (!result) {
    return NextResponse.json(
      { error: "Code is invalid, expired, or already used" },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
