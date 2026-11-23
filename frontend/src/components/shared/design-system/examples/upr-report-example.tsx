"use client";

import { FinalReportFields } from "@/components/upr/final-report-fields";
import type { SemesterSnapshot } from "@/lib/api/upr-workflow";

const snapshot: SemesterSnapshot = {
  cutoff: "2026-06-30",
  profile: {
    id: "example-profile-v2",
    version: 2,
    finalizedAt: "2026-07-17T03:00:00Z",
    finalizedBy: "example-actor",
  },
  reason: "Koreksi skor berdasarkan bukti per 30 Juni.",
  periods: [
    { id: "example-period-1", period: "2026-Q1", label: "Triwulan I", profileId: "example-profile-v1", profileVersion: 1 },
    { id: "example-period-2", period: "2026-Q2", label: "Triwulan II", profileId: "example-profile-v1", profileVersion: 1 },
  ],
  corrections: [{
    groupId: "example-risk",
    riskId: "example-assessment-v2",
    riskCode: "R-002",
    period: "2026-Q2",
    profileId: "example-profile-v2",
    profileVersion: 2,
    effectiveFrom: "2026-06-30",
    reason: "Koreksi skor berdasarkan penilaian akhir Juni.",
  }],
  risks: [
    {
      riskId: "example-assessment-v2",
      groupId: "example-risk",
      code: "R-002",
      title: "Keterlambatan validasi data",
      objective: "Validasi data tepat waktu",
      score: 15,
      targetScore: 6,
      effectiveFrom: "2026-06-30",
      changeReason: "Bukti penilaian Juni diperbarui.",
      mitigations: [
        {
          id: "example-plan",
          action: "Tinjau jadwal validasi",
          owner: "Tim pengelola data",
          due_date: "2026-06-20",
        },
      ],
      monitoring: [
        {
          id: "example-q1",
          period: "2026-Q1",
          score: 13,
          conclusion: "Proses validasi mulai membaik.",
          mitigationProgress: "Reviu jadwal selesai.",
          mitigationCompletion: 80,
        },
        {
          id: "example-q2",
          period: "2026-Q2",
          score: 12,
          conclusion: "Pemeriksaan data dilakukan setiap pekan.",
          mitigationProgress: "Jadwal baru berjalan.",
          mitigationCompletion: 100,
        },
      ],
    },
  ],
  supporting: [
    {
      kind: "working_paper",
      period: "2026-Q1",
      sourceId: "example-kk1",
      code: "KK-001",
      finalizedAt: "2026-04-05T03:00:00Z",
      profileId: "example-profile-v1",
      profileVersion: 1,
    },
    {
      kind: "working_paper",
      period: "2026-Q2",
      sourceId: "example-kk2",
      code: "KK-002",
      finalizedAt: "2026-07-02T03:00:00Z",
      profileId: "example-profile-v1",
      profileVersion: 1,
    },
    {
      kind: "evaluation",
      period: "2026-H1",
      sourceId: "example-evaluation",
      code: "EV-001",
      finalizedAt: "2026-07-03T03:00:00Z",
    },
  ],
};

export function UPRReportExample() {
  return <FinalReportFields report={{ title: "Laporan Semester I 2026", period: "2026-H1", snapshot }} />;
}
