import { WorkingPaperDetailPanel } from "../domain/working-paper-detail-panel";
import type { WorkingPaperTimelineItem } from "@/lib/working-paper-detail-view-model";

const code = "KK-2027-06-01-1";
const timeline: WorkingPaperTimelineItem[] = [
  { state: "current", isActionOwner: true, label: "Giliran Anda", description: "", signatory: { id: "signer-1", working_paper_id: code, user_id: "sample-user-1", sequence_no: 1, status: "pending", created_at: "2026-11-22T01:05:00+07:00", signer_name: "Nadia Pratama", signer_jabatan: "Prakom", signer_pangkat: "IIIa" } },
  { state: "upcoming", isActionOwner: false, label: "Menunggu giliran", description: "", signatory: { id: "signer-2", working_paper_id: code, user_id: "sample-user-2", sequence_no: 2, status: "pending", created_at: "2026-11-22T01:05:00+07:00", signer_name: "Raka Wijaya", signer_jabatan: "Kepala Tim", signer_pangkat: "IVa" } },
];

export function WorkingPaperDetailPanelExample() {
  return (
    <div className="w-full max-w-[380px]">
      <WorkingPaperDetailPanel
        paper={{
          code,
          status: "draft",
          observation_cutoff: "2027-06-01",
          created_at: "2026-11-22T01:05:00+07:00",
          updated_at: "2026-11-22T01:05:00+07:00",
        }}
        timeline={timeline}
        periodDetails={
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Semester I · 2027</p>
            <p>Pengisian 01 Mei 2027–30 Juni 2027 WIB.</p>
          </div>
        }
      />
    </div>
  );
}
