import type { RiskRegisterListItem } from "@/lib/api/risk-register";

const numberFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMonitoringNilai(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }

  return numberFormatter.format(value);
}

export function getMonitoringTransactionHref(
  risk: Pick<RiskRegisterListItem, "id">,
) {
  return `/risk/assessment/${risk.id}`;
}

export function getMonitoringTransactionActionLabel(
  status?: RiskRegisterListItem["status"],
) {
  if (status === "assessment_draft" || status === "assessment_in_review") {
    return "Lanjutkan Pemantauan";
  }

  return "Lihat Hasil";
}
