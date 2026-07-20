import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { sessionCan } from "@/lib/authz";
import { uploadExpenseReceipt } from "@/lib/blob";

export const runtime = "nodejs";

// Upload a receipt image for an expense. The client sends a compressed JPEG;
// we return its blob URL, which the expense form stores in a hidden field.
// Guarded by the same capability as managing expenses.
export async function POST(request: Request) {
  const session = await auth();
  const organizationId = session?.user?.organizationId;
  if (!session?.user || !organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await sessionCan(session, "expenses.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo storage isn't configured. Ask your admin to enable it." },
      { status: 500 }
    );
  }

  try {
    const url = await uploadExpenseReceipt(organizationId, file, file.type || "image/jpeg");
    return NextResponse.json({ url });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: `Upload failed: ${detail}` }, { status: 500 });
  }
}
