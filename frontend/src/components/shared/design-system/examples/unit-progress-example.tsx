"use client";

import { useState } from "react";
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
    { ...common, id: "paper-1", code: "KK-2026-Q3-1", title: "KK Pemantauan dan Reviu Triwulan III", status: "signing",
      signed: 2, signers: 3, nextSigner: "Kepala Unit", tteSkipped: false },
  ],
  evaluations: [
    { ...common, id: "evaluation-1", code: "EV-2026-Q3-1", title: "Evaluasi Manajemen Risiko", status: "final" },
  ],
  mitigations: [
    { ...common, id: "task-1", code: "R-001", title: "Tinjau jadwal pengadaan", status: "reported", executionStatus: "pending",
      riskTitle: "Keterlambatan pengadaan", owner: "Tim Pengadaan", dueDate: "2026-09-30", overdue: false, reportedLate: false },
    { ...common, id: "task-2", code: "R-002", title: "Validasi data pelaporan", status: "overdue",
      riskTitle: "Data pelaporan tidak lengkap", owner: "Tim Surveilans", dueDate: "2026-09-30", overdue: true, reportedLate: false },
  ],
};

export function UnitProgressExample() {
  const [profile, setProfile] = useState("quarterly");
  const periods = profile === "monthly" ? Array.from({ length: 12 }, (_, i) => `Bulan ${i + 1}`) : ["Triwulan I", "Triwulan II", "Triwulan III", "Triwulan IV"];
  const [period, setPeriod] = useState(periods[0]);
  return <UnitProgressTables report={exampleReport} example scopeFields={[{
    id: "profile", label: "Profil", required: true, value: profile,
    options: [{ value: "quarterly", label: "2026 · Triwulanan" }, { value: "monthly", label: "2026 · Bulanan" }],
    onChange: (value) => { setProfile(value); setPeriod(value === "monthly" ? "Bulan 1" : "Triwulan I"); },
  }, {
    id: "period", label: "Periode", required: true, value: period,
    options: periods.map((value) => ({ value, label: value })),
    onChange: setPeriod,
  }]} />;
}
