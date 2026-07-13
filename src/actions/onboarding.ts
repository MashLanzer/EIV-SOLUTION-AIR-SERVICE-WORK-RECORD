"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { generateJoinCode, normalizeJoinCode } from "@/lib/joinCode";

export type OnboardingState = { error?: string } | undefined;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "company"
  );
}

// Attach the signed-in Google account to an org as a User row (or move an
// existing row into the org). Uses the email/name already on the session.
async function attachCurrentUser(
  session: Awaited<ReturnType<typeof requireAuth>>,
  organizationId: string,
  role: "ADMIN" | "SUPERVISOR" | "WORKER"
) {
  const email = session.user.email?.toLowerCase();
  if (!email) throw new Error("Missing email on session");
  const name = session.user.name ?? email;
  await prisma.user.upsert({
    where: { email },
    update: { organizationId, role, active: true },
    create: { email, name, role, organizationId, active: true },
  });
}

export async function createOrganizationAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await requireAuth();
  // Already in a company - nothing to onboard.
  if (session.user.organizationId) redirect("/admin");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name || name.length < 2) {
    return { error: "Enter your company name (at least 2 characters)." };
  }
  if (name.length > 80) {
    return { error: "That company name is too long." };
  }

  // Unique slug + unique join code (retry a couple times on the tiny chance
  // of a collision).
  let organizationId: string | null = null;
  for (let attempt = 0; attempt < 5 && !organizationId; attempt++) {
    const slug =
      attempt === 0 ? slugify(name) : `${slugify(name)}-${generateJoinCode(4).toLowerCase()}`;
    try {
      const org = await prisma.organization.create({
        data: { name, slug, joinCode: generateJoinCode() },
        select: { id: true },
      });
      organizationId = org.id;
    } catch {
      // slug or joinCode collided - try again with a new slug/code.
    }
  }
  if (!organizationId) {
    return { error: "Couldn't create the company. Try a slightly different name." };
  }

  // The creator becomes the company's first admin.
  await attachCurrentUser(session, organizationId, "ADMIN");
  redirect("/admin");
}

export async function joinOrganizationAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await requireAuth();
  if (session.user.organizationId) redirect("/records");

  const code = normalizeJoinCode((formData.get("code") as string | null) ?? "");
  if (!code) {
    return { error: "Enter the invite code your company gave you." };
  }

  const org = await prisma.organization.findUnique({
    where: { joinCode: code },
    select: { id: true },
  });
  if (!org) {
    return { error: "That invite code isn't valid. Double-check it with your company." };
  }

  // New members join as workers; an admin can promote them later.
  await attachCurrentUser(session, org.id, "WORKER");
  redirect("/records");
}
