// The fixed catalog of granular capabilities a Position can grant. It's the
// same for every company; each company's positions just turn individual keys
// on or off.
//
// IMPORTANT — two separate concepts:
//   • AccessLevel  → which app you see (office ADMIN vs field WORKER). This is a
//     hard security boundary and is NOT freely configurable per capability.
//   • Permissions  → what you can do *inside* the office app. Fully configurable
//     per position.
// A company can never lock itself out by editing permissions, because the app
// gate is AccessLevel, not the permission set.

export const ACCESS_LEVELS = ["ADMIN", "WORKER"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

// Legacy Role enum (User.role) still gates which app you enter. Positions layer
// on top; until a position is assigned we fall back to the role's defaults.
export type LegacyRole = "ADMIN" | "SUPERVISOR" | "WORKER";

export const PERMISSION_GROUPS = [
  "records",
  "people",
  "work",
  "customers",
  "money",
  "company",
] as const;
export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export interface PermissionDef {
  key: string;
  group: PermissionGroup;
  en: string;
  es: string;
}

// The catalog. Add new capabilities here; the roles UI reads this list.
export const PERMISSIONS = [
  { key: "records.review", group: "records", en: "Review records (approve / return)", es: "Revisar registros (aprobar / devolver)" },
  { key: "records.edit", group: "records", en: "Edit records", es: "Editar registros" },
  { key: "records.delete", group: "records", en: "Delete records", es: "Eliminar registros" },
  { key: "workers.manage", group: "people", en: "Manage workers", es: "Gestionar trabajadores" },
  { key: "teams.manage", group: "people", en: "Manage teams", es: "Gestionar equipos" },
  { key: "projects.manage", group: "work", en: "Manage projects", es: "Gestionar proyectos" },
  { key: "checklists.manage", group: "work", en: "Manage checklist templates", es: "Gestionar plantillas de checklist" },
  { key: "schedule.manage", group: "work", en: "Manage the schedule", es: "Gestionar la agenda" },
  { key: "customers.manage", group: "customers", en: "Manage customers", es: "Gestionar clientes" },
  { key: "invoices.manage", group: "money", en: "Manage invoices", es: "Gestionar facturas" },
  { key: "estimates.manage", group: "money", en: "Manage estimates", es: "Gestionar estimados" },
  { key: "payments.manage", group: "money", en: "Manage online payments", es: "Gestionar cobros en línea" },
  { key: "financials.view", group: "money", en: "View financials", es: "Ver finanzas" },
  { key: "reports.view", group: "money", en: "View pay reports", es: "Ver reportes de pago" },
  { key: "settings.manage", group: "company", en: "Manage company settings", es: "Gestionar configuración de la empresa" },
] as const satisfies readonly PermissionDef[];

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export function isPermissionKey(k: string): k is PermissionKey {
  return (ALL_PERMISSION_KEYS as string[]).includes(k);
}

// True if the granted set contains `key`. `granted` is stored as string[] on a
// Position; unknown keys (e.g. removed capabilities) are simply ignored.
export function hasPermission(granted: readonly string[], key: PermissionKey): boolean {
  return granted.includes(key);
}

// The three built-in positions seeded per company, mirroring the legacy
// ADMIN / SUPERVISOR / WORKER roles so behaviour is unchanged on day one. They
// can be edited but not deleted, so every company keeps a valid fallback.
export interface DefaultPosition {
  slug: "admin" | "supervisor" | "worker";
  legacyRole: LegacyRole;
  accessLevel: AccessLevel;
  en: string;
  es: string;
  permissions: PermissionKey[];
}

export const DEFAULT_POSITIONS: DefaultPosition[] = [
  {
    slug: "admin",
    legacyRole: "ADMIN",
    accessLevel: "ADMIN",
    en: "Administrator",
    es: "Administrador",
    permissions: [...ALL_PERMISSION_KEYS],
  },
  {
    slug: "supervisor",
    legacyRole: "SUPERVISOR",
    accessLevel: "ADMIN",
    // Matches today's supervisor: review records + see dashboard/reports, but
    // no management of workers/customers/teams/projects/settings.
    en: "Supervisor",
    es: "Supervisor",
    permissions: ["records.review", "reports.view"],
  },
  {
    slug: "worker",
    legacyRole: "WORKER",
    accessLevel: "WORKER",
    en: "Worker",
    es: "Trabajador",
    permissions: [],
  },
];

// Fallback permissions / access level for a user with no Position assigned yet,
// based on their legacy role — so enforcement can be introduced gradually,
// without a data backfill.
export function permissionsForLegacyRole(role: LegacyRole): PermissionKey[] {
  const p = DEFAULT_POSITIONS.find((d) => d.legacyRole === role);
  return p ? [...p.permissions] : [];
}

export function accessLevelForLegacyRole(role: LegacyRole): AccessLevel {
  return role === "WORKER" ? "WORKER" : "ADMIN";
}
