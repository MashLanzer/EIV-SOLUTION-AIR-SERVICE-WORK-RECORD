import { del, put } from "@vercel/blob";

// Object storage for jobsite photos (Vercel Blob). Keys are namespaced by
// org + project so they're easy to reason about; access is public (the URL
// is unguessable and only exposed to authorized users through the app).
export async function uploadProjectPhoto(
  organizationId: string,
  projectId: string,
  body: Blob | ArrayBuffer | Buffer,
  contentType = "image/jpeg"
): Promise<string> {
  const key = `orgs/${organizationId}/projects/${projectId}/${crypto.randomUUID()}.jpg`;
  const blob = await put(key, body, { access: "public", contentType });
  return blob.url;
}

export async function deleteProjectPhoto(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // Best-effort: if the blob is already gone, the DB row still gets removed.
  }
}

// The company logo shown on the work-record PDF. One per org, so the key is
// stable-ish (still randomized to bust CDN caches on replace).
export async function uploadCompanyLogo(
  organizationId: string,
  body: Blob | ArrayBuffer | Buffer,
  contentType = "image/png"
): Promise<string> {
  const key = `orgs/${organizationId}/logo/${crypto.randomUUID()}`;
  const blob = await put(key, body, { access: "public", contentType });
  return blob.url;
}

// A user's profile photo. Keyed per user (randomized to bust CDN caches on
// replace); the old blob is deleted by the caller after the row updates.
export async function uploadUserAvatar(
  userId: string,
  body: Blob | ArrayBuffer | Buffer,
  contentType = "image/jpeg"
): Promise<string> {
  const key = `users/${userId}/avatar/${crypto.randomUUID()}`;
  const blob = await put(key, body, { access: "public", contentType });
  return blob.url;
}
