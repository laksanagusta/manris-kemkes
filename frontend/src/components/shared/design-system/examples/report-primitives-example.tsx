import { Badge } from "@/components/ui/badge";
import {
  ReportEmptyState,
  ReportGrid,
  ReportLinkGrid,
  ReportPanel,
} from "@/components/shared/design-system";

export function ReportPrimitivesExample() {
  return (
    <div className="space-y-4">
      <ReportGrid>
        <div className="flex min-h-0 min-w-0 w-full md:h-[30rem] md:[&>*]:h-full [&>*]:w-full">
          <ReportPanel
            title="Paparan Risiko"
            actions={<Badge tone="neutral">2026-H1</Badge>}
          >
            <ReportEmptyState description="Belum ada data laporan pada scope ini." />
          </ReportPanel>
        </div>
        <div className="flex min-h-0 min-w-0 w-full md:h-[30rem] md:[&>*]:h-full [&>*]:w-full">
          <ReportPanel title="Tren Risiko">
            <div className="h-40 rounded-lg bg-muted/30" />
          </ReportPanel>
        </div>
      </ReportGrid>
      <ReportLinkGrid
        items={[
          {
            href: "/reports",
            title: "Laporan lanjutan",
          },
        ]}
      />
    </div>
  );
}
