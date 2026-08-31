import type { OrganizationListItem } from "./api/organizations";
import type {
  WorkingPaper,
  WorkingPaperRiskLink,
} from "../types/working-paper";

export type MonitoringRosterStatus =
  | "not_started"
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
  workingPaperId: string;
  workingPaperCode: string;
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
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
  isAggregate: boolean;
  total: number;
  notStarted: number;
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
  not_started: 0,
  in_progress: 1,
  finalized: 2,
};

const STATUS_LABELS: Record<MonitoringRosterStatus, string> = {
  not_started: "Belum Dimulai",
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

function resolveMonitoringStatus(
  link: WorkingPaperRiskLink,
): MonitoringRosterStatus {
  const rawStatus = link.risk.monitoring?.status?.trim().toLowerCase();

  if (rawStatus === "final" || rawStatus === "finalized") {
    return "finalized";
  }

  if (rawStatus === "draft" || link.monitoring_id || link.risk.monitoring?.id) {
    return "in_progress";
  }

  return "not_started";
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

export function buildMonitoringRosterRows(
  workingPapers: WorkingPaper[],
  organizations: OrganizationListItem[],
): MonitoringOverviewRow[] {
  const organizationNames = new Map(
    organizations.map((organization) => [organization.id, organization.name]),
  );

  return workingPapers
    .filter((workingPaper) => workingPaper.status !== "cancelled")
    .flatMap((workingPaper) =>
      (workingPaper.risks ?? []).map((link) => {
        const monitoring = link.risk.monitoring;
        const organizationName =
          link.risk.org_name ||
          organizationNames.get(workingPaper.org_id) ||
          "Organisasi tidak diketahui";
        const sourceScore = firstPositive(
          link.risk.inherentScore,
          link.risk.nilai,
        );
        const observedScore = monitoring
          ? firstPositive(monitoring.observedNilai)
          : null;

        return {
          id: `${workingPaper.id}:${link.id}`,
          versionGroupId: link.version_group_id ?? link.risk_id,
          code: link.risk.code || "-",
          title: link.risk.title || "-",
          organizationId: workingPaper.org_id,
          organizationName,
          workingPaperId: workingPaper.id,
          workingPaperCode: workingPaper.code,
          assessmentCycle:
            workingPaper.assessment_cycle || monitoring?.assessmentCycle || "-",
          sourceRiskId: link.source_risk_id ?? link.risk_id,
          monitoringId: link.monitoring_id ?? monitoring?.id ?? null,
          status: resolveMonitoringStatus(link),
          sourceScore,
          sourceLevel: getMonitoringRiskLevelLabel(
            link.risk.tingkat_risiko_display || link.risk.tingkat_risiko,
          ),
          observedScore,
          observedLevel: getMonitoringRiskLevelLabel(
            monitoring?.observedLevel || link.risk.monitoring_tingkat_risiko_display,
          ),
          finalizedAt: monitoring?.finalizedAt ?? null,
        } satisfies MonitoringOverviewRow;
      }),
    );
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

function getOrganizationDepth(
  organizationId: string,
  organizationsById: Map<string, OrganizationListItem>,
) {
  let depth = 0;
  let current = organizationsById.get(organizationId);
  const visited = new Set<string>();

  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    depth += 1;
    current = organizationsById.get(current.parentId);
  }

  return depth;
}

export function buildMonitoringOrganizationSummaries(
  rows: MonitoringOverviewRow[],
  organizations: OrganizationListItem[],
  selectedOrganizationId: string,
): MonitoringOrganizationSummary[] {
  const scopeIds = getOrganizationScopeIds(organizations, selectedOrganizationId);
  const organizationsById = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );
  return organizations
    .filter((organization) => scopeIds.has(organization.id))
    .map((organization) => {
      const descendantIds = getOrganizationScopeIds(organizations, organization.id);
      const summaryRows = rows.filter((row) => descendantIds.has(row.organizationId));

      return {
        id: organization.id,
        name: organization.name,
        parentId: organization.parentId ?? null,
        depth: getOrganizationDepth(organization.id, organizationsById),
        hasChildren: organizations.some(
          (candidate) => candidate.parentId === organization.id,
        ),
        isAggregate: organizations.some(
          (candidate) => candidate.parentId === organization.id,
        ),
        total: summaryRows.length,
        notStarted: summaryRows.filter((row) => row.status === "not_started").length,
        inProgress: summaryRows.filter((row) => row.status === "in_progress").length,
        finalized: summaryRows.filter((row) => row.status === "finalized").length,
      };
    })
    .sort((left, right) => {
      if (left.depth !== right.depth) return left.depth - right.depth;
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
    rawStatus === "not_started" || rawStatus === "in_progress" || rawStatus === "finalized"
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
