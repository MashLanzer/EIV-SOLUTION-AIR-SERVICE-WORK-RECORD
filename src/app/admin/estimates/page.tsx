import { redirect } from "next/navigation";

// Estimates now live inside the unified Sales page (Estimates + Invoices behind
// one money sub-nav tab). Keep this path working for bookmarks and the many
// deep links (e.g. from Financials) by forwarding the filter to ?view=estimates.
export default async function AdminEstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const p = new URLSearchParams({ view: "estimates" });
  if (q?.trim()) p.set("q", q.trim());
  if (status) p.set("status", status);
  redirect(`/admin/sales?${p.toString()}`);
}
