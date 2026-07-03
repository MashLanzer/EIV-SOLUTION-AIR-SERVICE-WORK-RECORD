import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hashPassword, generateTempPassword } from "@/lib/password";

export const runtime = "nodejs";

// Temporary production diagnostic/reset endpoint, gated by SETUP_SECRET.
// Resets the given username's password to a fresh temp password and forces
// a password change on next login. Remove this route (and the SETUP_SECRET
// env var) once done troubleshooting.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!process.env.SETUP_SECRET || key !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const username = (searchParams.get("username") || "admin").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "User not found", username }, { status: 404 });
  }

  const password = generateTempPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      active: true,
    },
  });

  return NextResponse.json({
    username: user.username,
    password,
    role: user.role,
    active: true,
    mustChangePassword: true,
  });
}
