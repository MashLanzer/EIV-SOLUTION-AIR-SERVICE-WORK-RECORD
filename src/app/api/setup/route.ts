import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// One-time production bootstrap endpoint, gated by SETUP_SECRET.
// Upserts a User by email so the very first admin can be authorized to
// sign in with Google before any admin exists to add them from the UI.
// Delete this route (and the SETUP_SECRET env var) once the first admin
// has confirmed they can sign in.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!process.env.SETUP_SECRET || key !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const name = searchParams.get("name") ?? "Admin";
  const role = searchParams.get("role") === "WORKER" ? "WORKER" : "ADMIN";

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, active: true },
    create: { email, name, role, active: true },
  });

  return NextResponse.json({
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
  });
}
