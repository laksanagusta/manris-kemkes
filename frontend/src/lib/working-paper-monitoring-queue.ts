import type { WorkingPaper, WorkingPaperRiskLink } from "@/types/working-paper";
import { roundRiskScore } from "./risk.js";

export type WorkingPaperQueueAction =
  | { label: string; href: string }
  | { label: string; riskId: string };

export type WorkingPaperQueueRow = {
  id: string;
  code: string;
  title: string;
  versionNumber?: number;
  observedAt?: string;
  observedAtInferred?: boolean;
  sourceScore: number;
  observedScore: number | null;
  observedLevelLabel: string;
  status: "draft" | "final" | "unmonitored";
  riskHref?: string;
  sourceHref?: string;
  action?: WorkingPaperQueueAction;
  inconsistent?: boolean;
};

export function buildWorkingPaperQueueRows(
  paper: Pick<WorkingPaper, "id" | "risks" | "status" | "profile_version_id" | "assessment_cycle">,
  blockers: WorkingPaperRiskLink[],
): WorkingPaperQueueRow[] {
  const active = paper.status === "draft" || paper.status === "signing";
  const blockerIds = new Set(blockers.map(({ id }) => id));
  const returnTo = encodeURIComponent(`/risk/working-papers/${paper.id}`);

  return (paper.risks ?? []).map((link) => {
    const blocker = blockerIds.has(link.id);
    const { risk } = link;
    const recorded = risk.monitoring;
    const outsidePeriod = !paper.profile_version_id && recorded &&
      recorded.assessmentCycle !== paper.assessment_cycle && (link.source_mode === "roster" || blocker);
    const monitoring = outsidePeriod ? undefined : recorded;
    const inconsistent = Boolean(link.monitoring_id && !recorded);
    const status = monitoring?.status ?? "unmonitored";
    const sourceId = link.source_risk_id === "00000000-0000-0000-0000-000000000000"
      ? undefined : link.source_risk_id;
    const sourceRiskId = sourceId || link.risk.previousRiskId;
    const riskHref = risk.id ? `/risk/register/${encodeURIComponent(risk.id)}` : undefined;
    const sourceHref = sourceRiskId ? `/risk/register/${encodeURIComponent(sourceRiskId)}` : undefined;
    const monitoringId = outsidePeriod ? undefined : link.monitoring_id || monitoring?.id;
    let action: WorkingPaperQueueAction | undefined;

    if (monitoringId && (status === "final" || (active && status === "draft"))) {
      action = {
        label: status === "final" ? "Lihat hasil" : "Lanjutkan draf",
        href: `/risk/monitoring/${encodeURIComponent(monitoringId)}?returnTo=${returnTo}`,
      };
    } else if (active && status === "unmonitored" && !inconsistent) {
      if (blocker) action = { label: "Mulai pemantauan", riskId: sourceId || link.risk_id };
      else if (sourceHref) action = { label: "Mulai pemantauan", href: sourceHref };
    }

    return {
      id: link.id,
      code: risk.code || "-",
      title: risk.title || "-",
      versionNumber: risk.versionNumber,
      observedAt: monitoring?.observedAt,
      observedAtInferred: monitoring?.observedAtInferred,
      sourceScore: roundRiskScore(monitoring?.sourceNilai ?? risk.nilai) ?? 0,
      observedScore: roundRiskScore(monitoring?.observedNilai),
      observedLevelLabel: observedLevelLabel(monitoring?.observedLevel),
      status,
      riskHref,
      sourceHref: sourceHref === riskHref ? undefined : sourceHref,
      action,
      inconsistent,
    };
  });
}

const levelLabels: Record<string, string> = {
  sangat_rendah: "Sangat Rendah",
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  sangat_tinggi: "Sangat Tinggi",
};

function observedLevelLabel(value?: string | null) {
  if (!value) {
    return "-";
  }
  return levelLabels[value.trim().toLowerCase()] || value;
}
