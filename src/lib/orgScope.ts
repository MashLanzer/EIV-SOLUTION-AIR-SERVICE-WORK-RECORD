import { redirect } from "next/navigation";
import type { Session } from "next-auth";

// The single source of truth for tenant scoping. EVERY query that touches
// company-scoped data (users, customers, records, and - later - projects,
// photos, teams) must filter by this id, so one company can never read or
// write another's data. Centralizing it here means the org filter is one
// import to add, not a rule to remember at each call site.
//
// A signed-in account with no organization yet (a brand-new Google account
// that hasn't created or joined a company) is sent to onboarding; today the
// sign-in gate still requires a pre-authorized User row, so every real
// session already has an org and this redirect is just a safety net until
// the create/join-a-company flow ships.
export function requireOrgId(session: Session): string {
  const id = session.user.organizationId;
  if (!id) redirect("/onboarding");
  return id;
}
