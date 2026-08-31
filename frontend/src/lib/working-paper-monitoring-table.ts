import type { WorkingPaperRiskData, WorkingPaperRiskLink } from "@/types/working-paper";

export const WORKING_PAPER_MONITORING_COLUMNS = [
  { key: "code", label: "Kode" },
  { key: "version", label: "Versi" },
  { key: "risk", label: "Risiko" },
  { key: "score", label: "Perubahan Skor" },
  { key: "status", label: "Status" },
  { key: "action", label: "Aksi" },
] as const;

export type WorkingPaperMonitoringAction = {
  label: string;
  href: string | null;
};

export type WorkingPaperMonitoringRow = {
  id: string;
  code: string;
  title: string;
  versionNumber?: number;
  sourceScore: number;
  observedScore: number | null;
  observedLevelLabel: string;
  status: "draft" | "final" | "unmonitored";
  statusLabel: string;
  actionItems: WorkingPaperMonitoringAction[];
  rosterStatus?: string;
};

const levelLabels: Record<string, string> = {
  sangat_rendah: "Sangat Rendah",
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  sangat_tinggi: "Sangat Tinggi",
};

function normalizeScore(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value);
}

function baselineScore(risk: WorkingPaperRiskData) {
  if (risk.monitoring?.sourceNilai != null) {
    return normalizeScore(risk.monitoring.sourceNilai);
  }
  return normalizeScore(risk.nilai);
}

function observedScore(risk: WorkingPaperRiskData) {
  if (risk.monitoring?.observedNilai == null) {
    return null;
  }
  return normalizeScore(risk.monitoring.observedNilai);
}

function observedLevelLabel(value?: string | null) {
  if (!value) {
    return "-";
  }
  return levelLabels[value.trim().toLowerCase()] || value;
}

export function buildWorkingPaperMonitoringRowFromLink(
  link: WorkingPaperRiskLink,
): WorkingPaperMonitoringRow {
  const row = buildWorkingPaperMonitoringRow(link.risk);
  row.actionItems = buildActionItems(link.risk, link);
  if (link.roster_status) {
    row.rosterStatus = link.roster_status;
  }
  if (link.monitoring_id && !link.risk.monitoring) {
    row.status = "unmonitored";
    row.statusLabel = "Data tidak konsisten";
  }
  return row;
}

function buildActionItems(risk: WorkingPaperRiskData, link?: WorkingPaperRiskLink): WorkingPaperMonitoringAction[] {
  const monitoringId = link?.monitoring_id || risk.monitoring?.id;
  const sourceRiskId = link?.source_risk_id || risk.previousRiskId;
  const monitoringHref = monitoringId
    ? `/risk/monitoring/${monitoringId}`
    : null;
  const monitoringAction = risk.monitoring
    ? risk.monitoring.status === "final"
      ? { label: "Lihat Hasil Pemantauan", href: monitoringHref }
      : { label: "Lanjutkan Pemantauan", href: monitoringHref }
    : {
        label: "Mulai Pemantauan",
        href: sourceRiskId ? `/risk/register/${sourceRiskId}` : null,
      };
  return [
    {
      label: "Detail Risiko Awal",
      href: sourceRiskId ? `/risk/register/${sourceRiskId}` : `/risk/register/${risk.id}`,
    },
    {
      ...monitoringAction,
    },
  ];
}

export function buildWorkingPaperMonitoringRow(
  risk: WorkingPaperRiskData,
): WorkingPaperMonitoringRow {
  const monitoring = risk.monitoring;
  if (!monitoring) {
    return {
      id: risk.id,
      code: risk.code || "-",
      title: risk.title || "-",
      versionNumber: risk.versionNumber,
      sourceScore: baselineScore(risk),
      observedScore: null,
      observedLevelLabel: "-",
      status: "unmonitored",
      statusLabel: "Belum Dimulai",
      actionItems: buildActionItems(risk),
    };
  }

  const rowObservedScore = observedScore(risk);
  const rowSourceScore = baselineScore(risk);

  return {
    id: risk.id,
    code: risk.code || "-",
    title: risk.title || "-",
    versionNumber: risk.versionNumber,
    sourceScore: rowSourceScore,
    observedScore: rowObservedScore,
    observedLevelLabel: observedLevelLabel(monitoring.observedLevel),
    status: monitoring.status,
    statusLabel: monitoring.status === "draft" ? "Sedang Berjalan" : "Selesai",
    actionItems: buildActionItems(risk),
  };
}
