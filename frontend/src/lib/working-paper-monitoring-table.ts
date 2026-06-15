import type { WorkingPaperRiskData, WorkingPaperRiskLink } from "@/types/working-paper";

export const WORKING_PAPER_MONITORING_COLUMNS = [
  { key: "code", label: "Kode" },
  { key: "risk", label: "Risiko" },
  { key: "score", label: "Skor Awal -> Aktual" },
  { key: "trend", label: "Tren" },
  { key: "progress", label: "Progres Mitigasi" },
  { key: "effectiveness", label: "Efektivitas" },
  { key: "condition", label: "Kondisi/Hasil Monitoring" },
  { key: "obstacles", label: "Hambatan" },
  { key: "followUp", label: "Tindak Lanjut" },
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
  sourceVersionNumber?: number;
  resultVersionNumber?: number;
  sourceScore: number;
  observedScore: number | null;
  observedLevelLabel: string;
  trend: "up" | "down" | "stable" | null;
  trendLabel: string;
  progressPercent: number | null;
  progressSummary: string;
  effectiveness: string;
  condition: string;
  obstacles: string;
  followUp: string;
  status: "draft" | "finalized" | "unmonitored";
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

function textOrDash(value?: string | null) {
  const normalized = value?.trim();
  return normalized || "-";
}

function normalizeScore(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value);
}

function combineNarrative(...values: Array<string | undefined>) {
  const present = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return present.length > 0 ? present.join("\n") : "-";
}

function baselineScore(risk: WorkingPaperRiskData) {
  if (risk.monitoring?.sourceNilai != null) {
    return normalizeScore(risk.monitoring.sourceNilai);
  }
  if (typeof risk.inherentScore === "number" && risk.inherentScore > 0) {
    return risk.inherentScore;
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
  if (link.source_risk_id) {
    row.sourceVersionNumber = link.risk.versionNumber;
  }
  if (link.roster_status) {
    row.rosterStatus = link.roster_status;
  }
  if (link.monitoring_id && !link.risk.monitoring) {
    row.status = "unmonitored";
    row.statusLabel = "Data tidak konsisten";
  }
  return row;
}

function buildActionItems(risk: WorkingPaperRiskData): WorkingPaperMonitoringAction[] {
  const monitoringHref =
    risk.monitoring?.status === "finalized" ? `/risk/assessment/${risk.id}` : null;
  return [
    {
      label: "Detail Risiko Awal",
      href: risk.previousRiskId ? `/risk/register/${risk.previousRiskId}` : null,
    },
    {
      label: "Hasil Pemantauan",
      href: monitoringHref,
    },
    {
      label: "Detail Risiko Akhir",
      href: `/risk/register/${risk.id}`,
    },
  ];
}

export function buildWorkingPaperMonitoringRow(
  risk: WorkingPaperRiskData,
): WorkingPaperMonitoringRow {
  const monitoring = risk.monitoring;
  const finalizedMonitoring = monitoring?.status === "finalized" ? monitoring : null;
  if (!monitoring) {
    return {
      id: risk.id,
      code: risk.code || "-",
      title: risk.title || "-",
      versionNumber: risk.versionNumber,
      sourceScore: baselineScore(risk),
      observedScore: null,
      observedLevelLabel: "-",
      trend: null,
      trendLabel: "-",
      progressPercent: null,
      progressSummary: "-",
      effectiveness: "-",
      condition: "-",
      obstacles: "-",
      followUp: "-",
      status: "unmonitored",
      statusLabel: "Belum Dimonitor",
      actionItems: buildActionItems(risk),
    };
  }

  const trendLabels = {
    up: "Meningkat",
    down: "Menurun",
    stable: "Tetap",
  } as const;

  const rowObservedScore = observedScore(risk);

  return {
    id: risk.id,
    code: risk.code || "-",
    title: risk.title || "-",
    versionNumber: risk.versionNumber,
    sourceScore: baselineScore(risk),
    observedScore: rowObservedScore,
    observedLevelLabel: observedLevelLabel(monitoring.observedLevel),
    trend: monitoring.trend === "up" || monitoring.trend === "down" || monitoring.trend === "stable"
      ? monitoring.trend
      : null,
    trendLabel:
      monitoring.trend === "up" || monitoring.trend === "down" || monitoring.trend === "stable"
        ? trendLabels[monitoring.trend]
        : "-",
    progressPercent:
      finalizedMonitoring && typeof finalizedMonitoring.mitigationCompletionPercent === "number"
        ? finalizedMonitoring.mitigationCompletionPercent
        : null,
    progressSummary: textOrDash(finalizedMonitoring?.mitigationProgressSummary),
    effectiveness: textOrDash(monitoring.effectivenessConclusion),
    condition: combineNarrative(
      monitoring.conditionSummary,
      monitoring.eventSummary,
    ),
    obstacles: textOrDash(monitoring.mitigationObstacles),
    followUp: textOrDash(
      monitoring.mitigationFollowUp || monitoring.followUpNote,
    ),
    status: monitoring.status,
    statusLabel: monitoring.status === "draft" ? "Draft" : "Final",
    actionItems: buildActionItems(risk),
  };
}
