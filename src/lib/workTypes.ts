import { prisma } from "@/lib/prisma";

// A category with its work types, ready for the settings manager and the
// record form's picker.
export interface WorkTypeGroup {
  id: string;
  name: string;
  items: { id: string; name: string }[];
}

// The org's work-type taxonomy, grouped by category and ordered (position,
// then name) so the picker and manager read consistently.
export async function getWorkTypeGroups(
  organizationId: string
): Promise<WorkTypeGroup[]> {
  const categories = await prisma.workTypeCategory.findMany({
    where: { organizationId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      workTypes: {
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      },
    },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: c.workTypes.map((w) => ({ id: w.id, name: w.name })),
  }));
}

// Industry starter packs. Applying one seeds the org's list so an admin
// isn't staring at a blank taxonomy; every entry stays fully editable and
// packs can be mixed. Deliberately broad so the app fits many trades, not
// just HVAC.
export interface StarterPack {
  id: string;
  label: string;
  categories: { name: string; items: string[] }[];
}

export const STARTER_PACKS: StarterPack[] = [
  {
    id: "hvac",
    label: "HVAC",
    categories: [
      {
        name: "Installation",
        items: ["Furnace install", "AC install", "Heat pump install", "Ductwork", "Thermostat install"],
      },
      {
        name: "Service",
        items: ["Diagnostic", "Repair", "Tune-up", "Refrigerant recharge", "Filter change"],
      },
      { name: "Maintenance", items: ["Seasonal maintenance", "Inspection", "Coil cleaning"] },
    ],
  },
  {
    id: "plumbing",
    label: "Plumbing",
    categories: [
      { name: "Installation", items: ["Water heater install", "Fixture install", "Repipe", "Sump pump install"] },
      { name: "Repair", items: ["Leak repair", "Drain cleaning", "Toilet repair", "Faucet repair"] },
      { name: "Inspection", items: ["Camera inspection", "Backflow test"] },
    ],
  },
  {
    id: "electrical",
    label: "Electrical",
    categories: [
      { name: "Installation", items: ["Panel install", "Outlet/switch install", "Lighting install", "EV charger install"] },
      { name: "Service", items: ["Troubleshooting", "Wiring repair", "Panel upgrade"] },
      { name: "Inspection", items: ["Safety inspection", "Code inspection"] },
    ],
  },
  {
    id: "landscaping",
    label: "Landscaping",
    categories: [
      { name: "Maintenance", items: ["Mowing", "Trimming", "Cleanup", "Fertilization"] },
      { name: "Installation", items: ["Planting", "Irrigation install", "Sod install", "Hardscape"] },
      { name: "Seasonal", items: ["Leaf removal", "Snow removal", "Spring cleanup"] },
    ],
  },
  {
    id: "general",
    label: "General",
    categories: [
      { name: "Work", items: ["Installation", "Service", "Repair", "Maintenance", "Inspection", "Consultation"] },
    ],
  },
];
