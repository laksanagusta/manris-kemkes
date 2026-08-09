"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  listOrganizationGroups,
  type OrganizationGroupListItem,
} from "@/lib/api/organization-groups";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
} from "@/lib/report-scope";
import {
  copyReportsFilterScope,
  resolveDefaultReportsFilterScope,
  resolveReportsFilterScopeOrgIds,
  type ReportsFilterScope,
} from "@/lib/reports-filter-sheet";
import { ReportsFilterSheet } from "../_components/report-filter-sheet";
import { OverdueMitigationTimeline } from "../_components/overdue-mitigation-timeline";
import { UnitResponseTimeChart } from "../_components/unit-response-time";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type {
  OverdueMitigationTimelineItem,
  UnitResponseTime,
} from "@/types/risk";
import { CollectionToolbar } from "@/components/shared/design-system";
import { PageStack } from "@/components/shared/design-system";
import {
  ReportEmptyState,
  ReportGrid,
} from "@/components/shared/design-system";

const EMPTY_REPORT_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};

export default function ComplianceMonitoringPage() {
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [organizationGroups, setOrganizationGroups] = useState<
    OrganizationGroupListItem[]
  >([]);
  const [appliedScope, setAppliedScope] = useState<ReportsFilterScope>(() =>
    copyReportsFilterScope(EMPTY_REPORT_SCOPE),
  );
  const [draftScope, setDraftScope] = useState<ReportsFilterScope>(() =>
    copyReportsFilterScope(EMPTY_REPORT_SCOPE),
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const scopeInitializedForTokenRef = useRef<string | null>(null);
  const [overdueTimelineData, setOverdueTimelineData] = useState<
    OverdueMitigationTimelineItem[]
  >([]);
  const [responseTimeData, setResponseTimeData] = useState<UnitResponseTime[]>(
    [],
  );

  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);
  const appliedScopeOrgIds = useMemo(
    () => resolveReportsFilterScopeOrgIds(appliedScope, organizationGroups),
    [appliedScope, organizationGroups],
  );
  const hasAppliedScope =
    appliedScopeOrgIds.length > 0 || Boolean(appliedScope.organizationGroupId);
  const requiresScopeSelection =
    requiresOrganizationSelection && !hasAppliedScope;
  const filteredOverdueTimelineData = useMemo(() => {
    if (!requiresScopeSelection && appliedScopeOrgIds.length === 0) {
      return overdueTimelineData;
    }
    if (appliedScopeOrgIds.length === 0) {
      return [];
    }
    return overdueTimelineData.filter((item) =>
      appliedScopeOrgIds.includes(item.orgId),
    );
  }, [appliedScopeOrgIds, overdueTimelineData, requiresScopeSelection]);
  const filteredResponseTimeData = useMemo(() => {
    if (!requiresScopeSelection && appliedScopeOrgIds.length === 0) {
      return responseTimeData;
    }
    if (appliedScopeOrgIds.length === 0) {
      return [];
    }
    return responseTimeData.filter((item) =>
      appliedScopeOrgIds.includes(item.orgId),
    );
  }, [appliedScopeOrgIds, requiresScopeSelection, responseTimeData]);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      listAllOrganizations(token),
      listOrganizationGroups(token, {
        ownerOrganizationId: user?.isGlobal
          ? undefined
          : user?.organizationId ?? undefined,
        includeMembers: true,
        limit: 100,
        page: 1,
      }),
    ])
      .then(([items, groupsResponse]) => {
        const selectableOrganizations = buildSelectableReportOrganizations(
          user,
          items,
        );
        const selectableGroups = buildSelectableReportOrganizationGroups(
          user,
          groupsResponse.data ?? [],
        );
        setOrganizations(selectableOrganizations);
        setOrganizationGroups(selectableGroups);

        const scopeInitKey = `${token}:${user?.isGlobal ? "1" : "0"}:${user?.organizationId ?? ""}`;
        if (scopeInitializedForTokenRef.current !== scopeInitKey) {
          const defaultScope = resolveDefaultReportsFilterScope(
            user,
            selectableOrganizations,
          );
          setAppliedScope(defaultScope);
          setDraftScope(copyReportsFilterScope(defaultScope));
          scopeInitializedForTokenRef.current = scopeInitKey;
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [token, user]);

  const handleFilterOpenChange = (open: boolean) => {
    setFilterOpen(open);
    if (open) {
      setDraftScope(copyReportsFilterScope(appliedScope));
    }
  };

  const handleCancelFilter = () => {
    setDraftScope(copyReportsFilterScope(appliedScope));
    setFilterOpen(false);
  };

  const handleResetFilter = () => {
    setDraftScope(resolveDefaultReportsFilterScope(user, organizations));
  };

  const handleApplyFilter = () => {
    setAppliedScope(copyReportsFilterScope(draftScope));
    setFilterOpen(false);
  };

  useEffect(() => {
    if (!token) return;

    if (requiresScopeSelection) {
      return;
    }

    Promise.all([
      api.get<OverdueMitigationTimelineItem[]>(
        "/dashboard/overdue-mitigation-timeline",
        token,
      ),
      api.get<UnitResponseTime[]>("/dashboard/unit-response-time", token),
    ])
      .then(([overdueResult, responseResult]) => {
        setOverdueTimelineData(overdueResult);
        setResponseTimeData(responseResult);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [requiresScopeSelection, token]);

  return (
    <PageStack>
      <CollectionToolbar
        title="Monitoring Kepatuhan"
        description="Ringkasan overdue mitigasi dan waktu respons unit dalam satu halaman."
        actions={
          <ReportsFilterSheet
            open={filterOpen}
            onOpenChange={handleFilterOpenChange}
            activeUnitCount={appliedScopeOrgIds.length}
            disabled={organizations.length === 0 && organizationGroups.length === 0}
            title="Filter Monitoring"
            description="Atur group dan unit untuk membatasi data monitoring. Perubahan baru diterapkan setelah menekan Terapkan Filter."
            draftScope={draftScope}
            onDraftScopeChange={setDraftScope}
            organizations={organizations}
            organizationGroups={organizationGroups}
            onReset={handleResetFilter}
            onCancel={handleCancelFilter}
            onApply={handleApplyFilter}
          />
        }
      />

      {requiresScopeSelection ? (
        <ReportEmptyState
          title="Pilih grup atau unit terlebih dahulu."
          description="Monitoring kepatuhan akan mengikuti scope yang Anda pilih pada filter."
        />
      ) : null}

      <ReportGrid>
        <OverdueMitigationTimeline data={filteredOverdueTimelineData} />
        <UnitResponseTimeChart data={filteredResponseTimeData} />
      </ReportGrid>
    </PageStack>
  );
}
