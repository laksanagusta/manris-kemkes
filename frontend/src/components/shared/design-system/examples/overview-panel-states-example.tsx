import { OverviewPanelState, StandardCard } from "@/components/shared/design-system";

export function OverviewPanelStatesExample() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StandardCard title="Loading State" contentClassName="p-4 pt-0">
        <OverviewPanelState state="loading" message="Memuat data dashboard..." />
      </StandardCard>
      <StandardCard title="Error State" contentClassName="p-4 pt-0">
        <OverviewPanelState state="error" message="Data tidak dapat dimuat." />
      </StandardCard>
      <StandardCard title="Empty State" contentClassName="p-4 pt-0">
        <OverviewPanelState state="empty" message="Belum ada data pada periode ini." />
      </StandardCard>
    </div>
  );
}
