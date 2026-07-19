import { SectionTabsBar } from "@/components/layout/SectionTabsBar";
import { getT } from "@/lib/i18n/server";

// The worker-side sub-nav for the Projects area: Projects | Teams. Mirrors the
// admin "structure" SectionTabs (same segmented pill), but with only the two
// destinations a worker can reach. Rendered at the top of both list pages; the
// active segment is derived from the URL by SectionTabsBar.
export async function WorkerProjectsTabs() {
  const dict = await getT();
  return (
    <SectionTabsBar
      ariaLabel={dict.nav.sections}
      items={[
        { href: "/records/projects", label: dict.teams.tabProjects },
        { href: "/records/teams", label: dict.teams.tabTeams },
      ]}
    />
  );
}
