// Which capability each admin destination needs. Undefined = visible to anyone
// in the office app (dashboard and the records list are the baseline). Used to
// hide nav sections a position can't use; the pages themselves also guard with
// requirePermission, so hiding is cosmetic, not the security boundary.
export const NAV_PERMISSION: Record<string, string | undefined> = {
  "/admin": undefined,
  "/admin/records": undefined,
  "/admin/review": "records.review",
  "/admin/schedule": "schedule.manage",
  "/admin/projects": "projects.manage",
  "/admin/projects/new": "projects.manage",
  "/admin/photos": "projects.manage",
  "/admin/teams/new": "teams.manage",
  "/admin/workers": "workers.manage",
  "/admin/workers/new": "workers.manage",
  "/admin/customers": "customers.manage",
  "/admin/estimates": "estimates.manage",
  "/admin/invoices": "invoices.manage",
  "/admin/financials": "financials.view",
  "/admin/payments": "payments.manage",
  "/admin/reports": "reports.view",
  "/admin/checklists": "checklists.manage",
  "/admin/roles": "settings.manage",
  "/admin/audit": "settings.manage",
};

export function canSeeHref(href: string, permissions: readonly string[]): boolean {
  const req = NAV_PERMISSION[href];
  return !req || permissions.includes(req);
}
