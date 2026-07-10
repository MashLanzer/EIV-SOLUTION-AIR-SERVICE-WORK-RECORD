import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadProjectPhoto } from "@/lib/blob";

export const runtime = "nodejs";

// Upload a jobsite photo to a project. The client sends a compressed JPEG
// (multipart) plus optional GPS. Org-scoped: you can only add photos to a
// project in your own company.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = session.user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const lat = Number(form.get("latitude"));
  const lng = Number(form.get("longitude"));

  let url: string;
  try {
    url = await uploadProjectPhoto(
      organizationId,
      projectId,
      file,
      file.type || "image/jpeg"
    );
  } catch {
    return NextResponse.json(
      { error: "Photo storage isn't configured. Ask your admin to enable it." },
      { status: 500 }
    );
  }

  const photo = await prisma.photo.create({
    data: {
      organizationId,
      projectId,
      url,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      takenById: session.user.id || null,
    },
    select: { id: true, url: true, takenAt: true },
  });

  return NextResponse.json({ photo });
}
