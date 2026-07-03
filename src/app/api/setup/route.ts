import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword, generateTempPassword } from "@/lib/password";

export const runtime = "nodejs";

// One-time production bootstrap: creates the first admin account when the
// database has no users yet. Gated by SETUP_SECRET so it can't be triggered
// by anyone who doesn't have it, and it refuses to run once any user exists.
// Remove this route (and the SETUP_SECRET env var) after first use.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!process.env.SETUP_SECRET || key !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    return NextResponse.json({ error: "Already initialized" }, { status: 409 });
  }

  const username = searchParams.get("username") || "admin";
  const name = searchParams.get("name") || "Admin";
  const password = generateTempPassword();

  await prisma.user.create({
    data: {
      username,
      name,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      mustChangePassword: true,
    },
  });

  return NextResponse.json({ username, password });
}
