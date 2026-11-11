"use client";

import { useEffect, useState } from "react";

import { ReportFilterPanel } from "@/components/report/report-filter-panel";
import { UnitProgressTables } from "@/components/shared/design-system/domain/unit-progress-tables";
import {
  CollectionErrorState, CollectionLoadingState, CollectionPageHeader, PageStack, ReportEmptyState,
} from "@/components/shared/design-system";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { listAllOrganizations } from "@/lib/api/organizations";
import { listOrganizationGroups, type OrganizationGroupListItem } from "@/lib/api/organization-groups";
import { completedReportCycle } from "@/lib/quarterly-report";
import { reportErrorMessage } from "@/lib/report-feedback";
import { buildSelectableReportOrganizationGroups, buildSelectableReportOrganizations } from "@/lib/report-scope";
import { resolveDefaultReportsFilterScope, type ReportsFilterScope } from "@/lib/reports-filter-sheet";
import type { UnitProgressReport } from "@/types/unit-progress";

const EMPTY_SCOPE: ReportsFilterScope = { organizationId: "", organizationGroupId: "", organizationIds: [] };

export default function UnitProgressPage() {
  const { token, user } = useAuth();
  return (
    <PageStack>
      <CollectionPageHeader title="Progres per Unit" showTitle />
      {token && user ? (
        <UnitProgressContent key={`${user.id}:${user.organizationId ?? "global"}:${user.accessibleOrgIds.join(",")}`} token={token} user={user} />
      ) : <CollectionLoadingState message="Memuat akses laporan…" />}
    </PageStack>
  );
}

function UnitProgressContent({ token, user }: {
  token: string;
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
  const [cycle, setCycle] = useState(completedReportCycle);
  const [scope, setScope] = useState(EMPTY_SCOPE);
  const [metadata, setMetadata] = useState<{
    token: string;
    organizations: Awaited<ReturnType<typeof listAllOrganizations>>;
    groups: OrganizationGroupListItem[];
  } | null>(null);
  const [metadataError, setMetadataError] = useState("");
  const [metadataRetry, setMetadataRetry] = useState(0);
  const [retry, setRetry] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [result, setResult] = useState<{ token: string; key: string; data?: UnitProgressReport; error?: string }>();
  const ready = metadata?.token === token;
  const needsSelection = scope.organizationIds.length === 0 && (!user.isGlobal || Boolean(scope.organizationGroupId));
  const params = new URLSearchParams({ cycle });
  if (scope.organizationIds.length) params.set("org_id", scope.organizationIds.join(","));
  const query = params.toString();
  const requestKey = `${retry}:${query}`;
  const active = ready && !needsSelection && result?.token === token && result.key === requestKey ? result : undefined;
  const loading = ready && !needsSelection && !active;
  const { isGlobal, organizationId } = user;

  useEffect(() => {
    let current = true;
    async function loadGroups() {
      const groups: OrganizationGroupListItem[] = [];
      for (let page = 1; ; page++) {
        const response = await listOrganizationGroups(token, {
          ownerOrganizationId: isGlobal ? undefined : organizationId ?? undefined,
          includeMembers: true,
          limit: 100,
          page,
        });
        groups.push(...response.data);
        if (!response.data.length || groups.length >= response.total) return groups;
      }
    }

    Promise.all([listAllOrganizations(token), loadGroups()])
      .then(([items, groups]) => {
        if (!current) return;
        const organizations = buildSelectableReportOrganizations(user, items);
        setScope(resolveDefaultReportsFilterScope(user, organizations));
        setMetadata({ token, organizations, groups: buildSelectableReportOrganizationGroups(user, groups) });
        setMetadataError("");
      })
      .catch((error: unknown) => {
        if (current) setMetadataError(reportErrorMessage(error, "Pilihan unit dan grup belum dapat dimuat."));
      });
    return () => { current = false; };
  }, [isGlobal, organizationId, metadataRetry, token, user]);

  useEffect(() => {
    if (!ready || needsSelection) return;
    let current = true;
    api.get<UnitProgressReport>(`/reports/unit-progress?${query}`, token)
      .then((data) => {
        if (current) setResult({ token, key: requestKey, data });
      })
      .catch((error: unknown) => {
        if (current) setResult({ token, key: requestKey, error: reportErrorMessage(error, "Progres unit belum dapat dimuat.") });
      });
    return () => { current = false; };
  }, [ready, needsSelection, query, requestKey, token]);

  function resetFilters() {
    setScope(resolveDefaultReportsFilterScope(user, metadata?.organizations ?? []));
    setCycle(completedReportCycle());
    setResetVersion((value) => value + 1);
  }

  return (
    <>
      <ReportFilterPanel
        cycle={cycle}
        onCycleChange={setCycle}
        scope={scope}
        onScopeChange={setScope}
        organizations={metadata?.organizations ?? []}
        groups={metadata?.groups ?? []}
        scopeSummary={scope.organizationIds.length ? `${scope.organizationIds.length} unit dipilih`
          : needsSelection ? "Belum ada unit yang dipilih" : "Semua unit yang dapat diakses"}
        scopeReady={ready}
        loading={loading}
        onReload={() => setRetry((value) => value + 1)}
        onReset={resetFilters}
      />
      {!ready ? (
        metadataError ? <CollectionErrorState title="Pilihan filter gagal dimuat" message={metadataError} onReload={() => { setMetadataError(""); setMetadataRetry((value) => value + 1); }} /> :
          <CollectionLoadingState message="Memuat pilihan unit dan grup…" />
      ) : needsSelection ? (
        <ReportEmptyState title="Pilih unit laporan" description="Pilih satu atau beberapa unit untuk melihat progres." />
      ) : active?.error ? (
        <CollectionErrorState title="Progres unit gagal dimuat" message={active.error} onReload={() => setRetry((value) => value + 1)} />
      ) : (
        <UnitProgressTables key={resetVersion} report={active?.data} loading={loading} />
      )}
    </>
  );
}
