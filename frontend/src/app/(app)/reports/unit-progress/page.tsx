"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RefreshCw } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { UnitProgressTables, type UnitProgressDocumentTab } from "@/components/shared/design-system/domain/unit-progress-tables";
import {
  CollectionErrorState, CollectionLoadingState, PageStack, ReportEmptyState, type TableFilterField,
} from "@/components/shared/design-system";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { downloadEvaluationPdf } from "@/lib/api/evaluations";
import { listAllOrganizations } from "@/lib/api/organizations";
import { listOrganizationGroups, type OrganizationGroupListItem } from "@/lib/api/organization-groups";
import { getWorkingPaper } from "@/lib/api/working-papers";
import { completedReportCycle, reportQuarterOptions } from "@/lib/quarterly-report";
import { reportErrorMessage } from "@/lib/report-feedback";
import { buildSelectableReportOrganizationGroups, buildSelectableReportOrganizations } from "@/lib/report-scope";
import { resolveDefaultReportsFilterScope, type ReportsFilterScope } from "@/lib/reports-filter-sheet";
import type { UnitProgressReport } from "@/types/unit-progress";

const EMPTY_SCOPE: ReportsFilterScope = { organizationId: "", organizationGroupId: "", organizationIds: [] };

export default function UnitProgressPage() {
  const { token, user } = useAuth();
  return (
    <PageStack>
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
  const [downloadingDocuments, setDownloadingDocuments] = useState<ReadonlySet<string>>(() => new Set());
  const [result, setResult] = useState<{ token: string; key: string; data?: UnitProgressReport; error?: string }>();
  const ready = metadata?.token === token;
  const organizations = metadata?.organizations ?? [];
  const groups = metadata?.groups ?? [];
  const group = groups.find(({ id }) => id === scope.organizationGroupId);
  const groupMembers = new Set(group?.members?.map(({ id }) => id));
  const selectableUnits = group ? organizations.filter(({ id }) => groupMembers.has(id)) : organizations;
  const orgIds = scope.organizationIds.length ? scope.organizationIds : group ? selectableUnits.map(({ id }) => id) : [];
  const needsSelection = orgIds.length === 0 && (!user.isGlobal || Boolean(group));
  const params = new URLSearchParams({ cycle });
  if (orgIds.length) params.set("org_id", [...orgIds].sort().join(","));
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

  const scopeFields: TableFilterField[] = [
    {
      id: "period", label: "Periode", required: true, value: cycle, onChange: setCycle,
      options: reportQuarterOptions(),
    },
    {
      id: "group", label: "Grup", value: scope.organizationGroupId, defaultValue: "",
      options: groups.map(({ id, name }) => ({ value: id, label: name })),
      onChange: (id) => setScope(id
        ? { ...EMPTY_SCOPE, organizationGroupId: id }
        : resolveDefaultReportsFilterScope(user, organizations)),
    },
    {
      id: "organization", label: "Unit", type: "multi-select",
      value: scope.organizationIds.join(","), required: !user.isGlobal && !group,
      options: selectableUnits.map(({ id, name }) => ({ value: id, label: name })),
      onChange: (value) => setScope((previous) => ({
        ...previous,
        organizationIds: value ? value.split(",") : previous.organizationGroupId
          ? [] : resolveDefaultReportsFilterScope(user, organizations).organizationIds,
      })),
    },
  ];
  const fields = scopeFields.filter(({ id }) => id !== "group" || groups.length > 0);

  async function downloadDocument(tab: UnitProgressDocumentTab, id: string) {
    const key = `${tab}:${id}`;
    if (downloadingDocuments.has(key)) return;
    setDownloadingDocuments((documents) => new Set(documents).add(key));
    try {
      if (tab === "evaluations") {
        await downloadEvaluationPdf(token, id, `evaluasi-mr-${cycle}.pdf`);
        toast.success("PDF evaluasi sedang diunduh.");
      } else {
        const [paper, { exportWorkingPaper }] = await Promise.all([
          getWorkingPaper(id, token),
          import("@/lib/working-paper-export"),
        ]);
        await exportWorkingPaper(paper);
        toast.success("Kertas kerja berhasil diunduh.");
      }
    } catch (error) {
      toast.error(reportErrorMessage(error, tab === "evaluations" ? "Gagal mengunduh PDF evaluasi." : "Gagal mengunduh kertas kerja."));
    } finally {
      setDownloadingDocuments((documents) => {
        const next = new Set(documents);
        next.delete(key);
        return next;
      });
    }
  }

  if (!ready) {
    return metadataError
      ? <CollectionErrorState title="Pilihan filter gagal dimuat" message={metadataError}
          onReload={() => { setMetadataError(""); setMetadataRetry((value) => value + 1); }} />
      : <CollectionLoadingState message="Memuat pilihan unit dan grup…" />;
  }

  return (
    <UnitProgressTables
      report={active?.data}
      loading={loading}
      scopeFields={fields}
      onDownloadDocument={(tab, id) => void downloadDocument(tab, id)}
      isDownloadingDocument={(tab, id) => downloadingDocuments.has(`${tab}:${id}`)}
      reloadAction={
        <Button variant="outline" size="icon" aria-label="Muat ulang" title="Muat ulang" disabled={loading || needsSelection}
          onClick={() => setRetry((value) => value + 1)}>
          <RefreshCw aria-hidden="true" />
        </Button>
      }
      feedback={needsSelection ? (
        <ReportEmptyState title={group ? "Grup belum memiliki unit yang dapat diakses" : "Pilih unit laporan"}
          description={group ? "Ubah filter Grup untuk melihat progres." : "Pilih satu atau beberapa unit untuk melihat progres."} />
      ) : active?.error ? (
        <CollectionErrorState title="Progres unit gagal dimuat" message={active.error} onReload={() => setRetry((value) => value + 1)} />
      ) : null}
    />
  );
}
