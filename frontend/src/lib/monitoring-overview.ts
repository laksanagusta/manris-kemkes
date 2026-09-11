import type { OrganizationListItem } from "./api/organizations";
import type { RiskMonitoringDetail } from "../types/risk-monitoring";

export type MonitoringRosterStatus =
  | "in_progress"
  | "finalized";

export type MonitoringStatusFilter = "all" | MonitoringRosterStatus;

export type MonitoringOverviewRow = {
  id: string;
  versionGroupId: string;
  code: string;
  title: string;
  organizationId: string;
  organizationName: string;
  assessmentCycle: string;
  sourceRiskId: string;
  monitoringId: string | null;
  status: MonitoringRosterStatus;
  sourceScore: number | null;
  sourceLevel: string;
  observedScore: number | null;
  observedLevel: string;
  finalizedAt: string | null;
};

export type MonitoringOrganizationSummary = {
  id: string;
  name: string;
  total: number;
  inProgress: number;
  finalized: number;
};

export type MonitoringQueryState = {
  search: string;
  status: MonitoringStatusFilter;
  cycle: string;
  organizationId: string;
  page: number;
  limit: number;
};

const STATUS_ORDER: Record<MonitoringRosterStatus, number> = {
  in_progress: 0,
  finalized: 1,
};

const STATUS_LABELS: Record<MonitoringRosterStatus, string> = {
  in_progress: "Berlangsung",
  finalized: "Final",
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  sangat_rendah: "Sangat Rendah",
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
  sangat_tinggi: "Sangat Tinggi",
};

function finiteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstPositive(...values: Array<number | null | undefined>) {
  for (const value of values) {
    const normalized = finiteNumber(value);
    if (normalized !== null && normalized > 0) {
      return normalized;
    }
  }

  return null;
}

export function getMonitoringStatusLabel(status: MonitoringRosterStatus) {
  return STATUS_LABELS[status];
}

export function getMonitoringStatusOrder(status: MonitoringRosterStatus) {
  return STATUS_ORDER[status];
}

export function getMonitoringRiskLevelLabel(level?: string | null) {
  const normalized = level?.trim().toLowerCase().replace(/\s+/g, "_");
  return normalized ? RISK_LEVEL_LABELS[normalized] ?? level ?? "-" : "-";
}

export function buildMonitoringTransactionRows(
  monitorings: RiskMonitoringDetail[],
  organizations: OrganizationListItem[],
): MonitoringOverviewRow[] {
  const organizationNames = new Map(
    organizations.map((organization) => [organization.id, organization.name]),
  );

  return monitorings.map((monitoring) => {
    const sourceRisk = monitoring.sourceRisk;
    const resultRisk = monitoring.resultRisk;
    const organizationId =
      sourceRisk?.organizationId ?? resultRisk?.organizationId ?? "";
    const organizationName =
      sourceRisk?.orgName ||
      resultRisk?.orgName ||
      organizationNames.get(organizationId) ||
      "Organisasi tidak diketahui";

    return {
      id: monitoring.id,
      versionGroupId:
        monitoring.versionGroupId || sourceRisk?.versionGroupId || "",
      code: sourceRisk?.code || resultRisk?.code || "-",
      title: sourceRisk?.title || monitoring.draftTitle || resultRisk?.title || "-",
      organizationId,
      organizationName,
      assessmentCycle: monitoring.assessmentCycle || "-",
      sourceRiskId: monitoring.sourceRiskId,
      monitoringId: monitoring.id,
      status:
        monitoring.status === "final" ? "finalized" : "in_progress",
      sourceScore: firstPositive(
        monitoring.sourceNilai,
        sourceRisk?.inherentScore,
        sourceRisk?.nilai,
      ),
      sourceLevel: getMonitoringRiskLevelLabel(monitoring.sourceLevel),
      observedScore: firstPositive(monitoring.observedNilai),
      observedLevel: getMonitoringRiskLevelLabel(monitoring.observedLevel),
      finalizedAt: monitoring.finalizedAt ?? null,
    } satisfies MonitoringOverviewRow;
  });
}

export function getOrganizationScopeIds(
  organizations: OrganizationListItem[],
  selectedOrganizationId: string,
) {
  if (selectedOrganizationId === "all") {
    return new Set(organizations.map((organization) => organization.id));
  }

  const scope = new Set([selectedOrganizationId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const organization of organizations) {
      if (organization.parentId && scope.has(organization.parentId) && !scope.has(organization.id)) {
        scope.add(organization.id);
        changed = true;
      }
    }
  }

  return scope;
}

export function buildMonitoringOrganizationSummaries(
  rows: MonitoringOverviewRow[],
  organizations: OrganizationListItem[],
  selectedOrganizationId: string,
): MonitoringOrganizationSummary[] {
  const scopeIds = getOrganizationScopeIds(organizations, selectedOrganizationId);
  return organizations
    .filter((organization) => scopeIds.has(organization.id))
    .map((organization) => {
      const summaryRows = rows.filter(
        (row) => row.organizationId === organization.id,
      );

      return {
        id: organization.id,
        name: organization.name,
        total: summaryRows.length,
        inProgress: summaryRows.filter((row) => row.status === "in_progress").length,
        finalized: summaryRows.filter((row) => row.status === "finalized").length,
      };
    })
    .sort((left, right) => {
      return left.name.localeCompare(right.name, "id");
    });
}

export function filterMonitoringRows(
  rows: MonitoringOverviewRow[],
  selectedOrganizationId: string,
  organizations: OrganizationListItem[],
  search: string,
  status: MonitoringStatusFilter,
) {
  const scopeIds = getOrganizationScopeIds(organizations, selectedOrganizationId);
  const normalizedSearch = search.trim().toLowerCase();

  return rows
    .filter((row) => scopeIds.has(row.organizationId))
    .filter((row) => status === "all" || row.status === status)
    .filter((row) => {
      if (!normalizedSearch) return true;
      return [row.code, row.title, row.organizationName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((left, right) => {
      const statusOrder =
        getMonitoringStatusOrder(left.status) - getMonitoringStatusOrder(right.status);
      if (statusOrder !== 0) return statusOrder;

      const leftScore = left.observedScore ?? left.sourceScore ?? -1;
      const rightScore = right.observedScore ?? right.sourceScore ?? -1;
      if (leftScore !== rightScore) return rightScore - leftScore;

      return `${left.organizationName} ${left.code} ${left.title}`.localeCompare(
        `${right.organizationName} ${right.code} ${right.title}`,
        "id",
      );
    });
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function parseMonitoringQueryState(
  searchParams: URLSearchParams,
  currentCycle: string,
): MonitoringQueryState {
  const rawStatus = searchParams.get("status");
  const status: MonitoringStatusFilter =
    rawStatus === "in_progress" || rawStatus === "finalized"
      ? rawStatus
      : "all";

  return {
    search: searchParams.get("q") ?? "",
    status,
    cycle: searchParams.get("cycle") || currentCycle,
    organizationId: searchParams.get("org_id") || "all",
    page: parsePositiveInt(searchParams.get("page"), 1),
    limit: parsePositiveInt(searchParams.get("limit"), 25),
  };
}

export function buildMonitoringQueryString(
  state: MonitoringQueryState,
  currentCycle: string,
) {
  const query = new URLSearchParams();
  const normalizedSearch = state.search.trim();

  if (normalizedSearch) query.set("q", normalizedSearch);
  if (state.status !== "all") query.set("status", state.status);
  if (state.cycle !== currentCycle) query.set("cycle", state.cycle);
  if (state.organizationId !== "all") query.set("org_id", state.organizationId);
  if (state.page !== 1) query.set("page", state.page.toString());
  if (state.limit !== 25) query.set("limit", state.limit.toString());

  return query.toString();
}
