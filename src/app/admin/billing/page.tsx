import { redirect } from "next/navigation";

// Billing moved under Settings. Keep the old path working for bookmarks and
// any external links by redirecting to its new home.
export default function BillingRedirectPage() {
  redirect("/admin/settings/billing");
}
