import { prisma } from "@/lib/prisma";

// The org's curated skill catalog (id + name), sorted for display.
export async function getOrgSkills(organizationId: string) {
  return prisma.orgSkill.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// The single source for skill autocomplete: the curated catalog first, then any
// free-text skills workers already entered that aren't in the catalog yet.
// Deduped case-insensitively (catalog casing wins) so "HVAC"/"hvac" collapse.
export async function getSkillSuggestions(organizationId: string): Promise<string[]> {
  const [catalog, used] = await Promise.all([
    prisma.orgSkill.findMany({
      where: { organizationId },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.userSkill.findMany({
      where: { user: { organizationId } },
      distinct: ["name"],
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const { name } of [...catalog, ...used]) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result.sort((a, b) => a.localeCompare(b));
}
