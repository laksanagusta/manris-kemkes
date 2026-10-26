import type { AgentRiskDetail, AgentWidget } from "@/types/agent";

const snapshotAt = "2026-10-24T08:00:00+07:00";
const risk: AgentRiskDetail = {
  id: "illustrative-risk", organizationId: "illustrative-unit", code: "R-241", title: "Keterlambatan distribusi bahan pemeriksaan",
  score: 20, level: "sangat_tinggi", status: "final", cycle: "2026-Q4", href: "/risk/register",
  causes: ["Jadwal pengadaan belum selaras dengan kebutuhan unit."], impacts: ["Pelaksanaan pemeriksaan berpotensi tertunda."],
  control: "Tinjauan persediaan mingguan.", mitigations: [{ action: "Tinjau jadwal distribusi bersama unit terkait", owner: "PIC contoh", dueDate: "2026-10-10" }],
  actions: [
    { label: "Lihat mitigasi", prompt: "Lihat mitigasi risiko contoh R-241", skills: ["risks", "mitigations"] },
    { label: "Telusuri kejadian", prompt: "Telusuri kejadian terkait risiko contoh R-241", skills: ["incidents"] },
    { label: "Susun tindak lanjut", prompt: "Siapkan usulan tindak lanjut untuk risiko contoh R-241", skills: ["risks", "mitigations"] },
  ],
};

// Explicit illustrative data; these examples never submit to the production API.
export const agentResponseExamples: AgentWidget[] = [
  { id: "risk-detail-example", type: "risk_detail", title: "Profil risiko ilustratif", snapshotAt, risk },
  { id: "priority-example", type: "priority_list", title: "Prioritas tindak lanjut ilustratif", description: "2 dari 7 risiko · 2026-Q4 · halaman 1. Urutan skor tertinggi, lalu keterlambatan terlama.", snapshotAt,
    priorities: { cycle: "2026-Q4", total: 7, page: 1, limit: 2, items: [
      { risk, overdueDays: 14, overdueCount: 1, tasks: [{ id: "example-task", action: "Tinjau jadwal distribusi bersama unit terkait", owner: "PIC contoh", dueDate: "2026-10-10", href: "/risk/monitoring" }] },
      { risk: { ...risk, id: "second-example", code: "R-242", title: "Kelengkapan pencatatan pemeriksaan", score: 15, level: "tinggi", actions: risk.actions.map((action) => ({ ...action, prompt: action.prompt.replace("R-241", "R-242") })) }, overdueDays: 0, overdueCount: 0, tasks: [] },
    ] }, actions: [{ label: "Lihat lebih banyak", prompt: "Tampilkan halaman berikutnya untuk prioritas contoh", skills: ["risks", "mitigations"] }] },
  { id: "comparison-example", type: "period_comparison", title: "Perbandingan periode ilustratif", snapshotAt,
    description: "Ringkasan unit contoh. Selisih menunjukkan perubahan jumlah.", comparison: { cycle: "2026-Q3", comparisonCycle: "2026-Q2", href: "/reports", rows: [
      { label: "Profil risiko", current: 24, previous: 21, delta: 3 },
      { label: "Risiko tinggi dan sangat tinggi", current: 7, previous: 9, delta: -2 },
      { label: "Tugas mitigasi terlambat", current: 0, previous: 3, delta: -3 },
    ] } },
  { id: "comparison-unavailable-example", type: "period_comparison", title: "Contoh data belum lengkap", snapshotAt,
    comparison: { cycle: "2026-Q3", comparisonCycle: "2026-Q2", href: "/reports", warnings: ["Sebagian profil belum mempunyai nilai risiko; jumlah risiko tinggi belum tersedia lengkap."], rows: [
      { label: "Risiko tinggi dan sangat tinggi", current: null, previous: 9, delta: null },
    ] } },
];
