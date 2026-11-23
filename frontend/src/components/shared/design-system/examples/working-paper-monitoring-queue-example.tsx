"use client";

import { useState } from "react";
import { WorkingPaperMonitoringQueue } from "@/components/shared/design-system/domain/working-paper-monitoring-queue";
import type { WorkingPaperQueueRow } from "@/lib/working-paper-monitoring-queue";

const sampleRows: WorkingPaperQueueRow[] = [
  {
    id: "sample-1", code: "R-258", title: "Keterlambatan verifikasi laporan surveilans", versionNumber: 2,
    status: "unmonitored", sourceScore: 18, observedScore: null, observedLevelLabel: "-",
    action: { label: "Mulai pemantauan", riskId: "sample-1" },
  },
  {
    id: "sample-2", code: "R-259", title: "Ketidaksesuaian stok logistik pemeriksaan", versionNumber: 1,
    status: "draft", sourceScore: 25, observedScore: null, observedLevelLabel: "-",
  },
  {
    id: "sample-3", code: "R-260", title: "Keterlambatan distribusi bahan pemeriksaan", versionNumber: 2,
    status: "final", sourceScore: 18, observedScore: 6, observedLevelLabel: "Rendah", observedAt: "2027-06-01",
    action: { label: "Lihat hasil", href: "#antrean-pemantauan-kk" },
  },
];

export function WorkingPaperMonitoringQueueExample() {
  const [rows, setRows] = useState(sampleRows);
  const remaining = rows.filter(({ status }) => status !== "final").length;

  return (
    <WorkingPaperMonitoringQueue
      rows={rows}
      readiness={`${remaining} risiko perlu finalisasi sebelum tanda tangan.`}
      onStart={(riskId) => setRows((current) => current.map((row) => row.id === riskId
        ? { ...row, status: "draft", action: undefined }
        : row))}
    />
  );
}
