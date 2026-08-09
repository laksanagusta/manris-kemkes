import { SemesterIndicator } from "@/components/shared/design-system";

export function SemesterIndicatorExample() {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-1">
        <SemesterIndicator label="H1" status="complete" statusLabel="H1 selesai" />
        <SemesterIndicator label="H2" status="draft" statusLabel="H2 draf" />
      </div>
      <div className="flex items-center gap-1">
        <SemesterIndicator label="H1" status="empty" statusLabel="H1 belum tersedia" />
        <SemesterIndicator label="H2" status="error" statusLabel="H2 bermasalah" />
      </div>
    </div>
  );
}
