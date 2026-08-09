import { VersionTimeline } from "@/components/shared/design-system";

const items = [
  { id: "v2", title: "v2 — H1 2026", description: "11 Juli 2026" },
  { id: "v1", title: "v1 — H2 2025", description: "15 Januari 2026" },
];

export function VersionTimelineExample() {
  return <VersionTimeline items={items} activeId="v2" />;
}
