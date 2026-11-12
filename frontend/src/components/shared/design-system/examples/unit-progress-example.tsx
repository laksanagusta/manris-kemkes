"use client";

import { UnitProgressTables } from "../domain/unit-progress-tables";
import type { UnitProgressReport } from "@/types/unit-progress";

const common = { organizationId: "unit-a", updatedAt: "2026-10-02T05:30:00Z" };

const exampleReport: UnitProgressReport = {
  cycle: "2026-Q3",
  monitoringAvailable: true,
  organizations: [
    { id: "unit-a", name: "Direktorat Surveilans" },
    { id: "unit-b", name: "Sekretariat" },
  ],
  risks: [
    { ...common, id: "risk-1", code: "R-001", title: "Keterlambatan pengadaan", status: "final",
      monitoringStatus: "draft", monitoringId: "monitoring-1", profileChanged: true },
    { ...common, id: "risk-2", code: "R-002", title: "Data pelaporan tidak lengkap", status: "final",
      monitoringStatus: "final", monitoringId: "monitoring-2", profileChanged: false },
    { ...common, id: "risk-3", code: "R-003", title: "Gangguan sinkronisasi data", status: "final", profileChanged: false },
    { ...common, id: "risk-4", code: "R-004", title: "Keterlambatan verifikasi", status: "draft", profileChanged: false },
  ],
  workingPapers: [
    { ...common, id: "paper-1", code: "KK-2026-Q3-1", title: "Kertas Kerja Triwulan III", status: "signing",
      signed: 2, signers: 3, nextSigner: "Kepala Unit", tteSkipped: false },
  ],
  evaluations: [
    { ...common, id: "evaluation-1", code: "EV-2026-Q3-1", title: "Evaluasi Manajemen Risiko", status: "final" },
  ],
  mitigations: [
    { ...common, id: "task-1", code: "R-001", title: "Tinjau jadwal pengadaan", status: "reported",
      riskTitle: "Keterlambatan pengadaan", owner: "Tim Pengadaan", dueDate: "2026-09-30", overdue: false, reportedLate: false },
    { ...common, id: "task-2", code: "R-002", title: "Validasi data pelaporan", status: "overdue",
      riskTitle: "Data pelaporan tidak lengkap", owner: "Tim Surveilans", dueDate: "2026-09-30", overdue: true, reportedLate: false },
  ],
};

export function UnitProgressExample() {
  return <UnitProgressTables report={exampleReport} example scopeFields={[{
    id: "period", label: "Periode", required: true, value: exampleReport.cycle,
    options: [{ value: exampleReport.cycle, label: exampleReport.cycle }],
    onChange: () => {},
  }]} />;
}
