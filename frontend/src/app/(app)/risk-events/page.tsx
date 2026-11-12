"use client";

import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { useCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { sortDate } from "@/lib/collection-sort";
import { newestCreatedFirst } from "@/lib/collection-created-at";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import Link from "next/link";
import { RiskTableIdentity } from "@/components/shared/design-system/domain/risk-table-identity";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { listRiskEvents } from "@/lib/api/risk-events";
import { getStatusBadgeClassName } from "@/lib/badge-variant";
import type { RiskEvent, RiskEventSeverity } from "@/types/risk-event";
import { RiskEventFormDialog } from "./_components/risk-event-form-sheet";
import { Badge } from "@/components/ui/badge";
import {
  AccentButton, ActionButton, CollectionEmptyState, CollectionErrorState, CollectionLoadingState,
  CollectionSearchField, CollectionTableCard, DynamicTableFilters,
  CollectionTableHead, CollectionTableHeader, CollectionTableHeaderRow, CollectionToolbar, PageStack,
} from "@/components/shared/design-system";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { Plus } from "@/components/shared/icons";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const severityLabel: Record<RiskEventSeverity, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", extreme: "Ekstrem" };
const severityTone: Record<RiskEventSeverity, "default" | "outline" | "destructive"> = { low: "default", medium: "default", high: "destructive", extreme: "destructive" };

function normalizeRiskEvent(event: RiskEvent): RiskEvent {
  return {
    ...event,
    linkedRisks: Array.isArray(event.linkedRisks) ? event.linkedRisks : [],
  };
}

export default function RiskEventsPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const initialRiskId = searchParams.get("riskId") || undefined;
  const [items, setItems] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<RiskEventSeverity | "all">("all");
  const [formOpen, setFormOpen] = useState(Boolean(initialRiskId) || searchParams.get("create") === "1");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try { setItems((await listRiskEvents(token)).map(normalizeRiskEvent).sort(newestCreatedFirst)); }
    catch { setError("Tidak dapat memuat kejadian risiko. Coba lagi."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !value || `${item.code} ${item.description} ${item.linkedRisks.map((risk) => `${risk.code} ${risk.title}`).join(" ")}`.toLowerCase().includes(value);
      const matchesSeverity = severityFilter === "all" || item.severity === severityFilter;
      return matchesQuery && matchesSeverity;
    });
  }, [items, query, severityFilter]);
  const hasActiveFilters = Boolean(query.trim()) || severityFilter !== "all";

  const collectionSort = useCollectionSorting(filtered, {"Kejadian": r => r.description, "Tingkat": r => ({low:1,medium:2,high:3,extreme:4})[r.severity], "Dicatat oleh": r => r.createdByName, "Tanggal": r => sortDate(r.occurredAt)});
  if (loading) return <PageStack><CollectionLoadingState message="Memuat kejadian risiko…" /></PageStack>;
  if (error) return <PageStack><CollectionErrorState title="Tidak dapat memuat kejadian risiko" message={error} onReload={() => void load()} /></PageStack>;

  return (
    <PageStack>
      <div className="space-y-4">
        <CollectionToolbar
          leading={
            <DynamicTableFilters
              search={
                <CollectionSearchField
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari kode, kejadian, atau risiko"
                  aria-label="Cari kejadian atau risiko"
                />
              }
              fields={[
                {
                  id: "severity",
                  label: "Tingkat",
                  value: severityFilter,
                  onChange: (value) => setSeverityFilter(value as RiskEventSeverity | "all"),
                  options: [
                    { value: "all", label: "Semua tingkat" },
                    { value: "low", label: severityLabel.low },
                    { value: "medium", label: severityLabel.medium },
                    { value: "high", label: severityLabel.high },
                    { value: "extreme", label: severityLabel.extreme },
                  ],
                },
              ]}
            />
          }
          actions={
            <>
            {!isAIFeaturesDisabled() ? <ActionButton variant="outline" asChild><Link href="/risk-events/impor">Ekstrak dokumen</Link></ActionButton> : null}
            <AccentButton
              icon={<Plus className="size-3.5" />}
              onClick={() => setFormOpen(true)}
            >
              Catat Kejadian
            </AccentButton>
            </>
          }
        />
        <CollectionTableCard sorting={collectionSort.controls}>
          <Table className="min-w-[1228px] table-fixed">
          <colgroup>
            <col style={{ width: 132 }} />
            <col style={{ width: 430 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 162 }} />
            <col style={{ width: 156 }} />
            <col style={{ width: 208 }} />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow className="h-9 hover:bg-transparent">
              <CollectionTableHead>Kode kejadian</CollectionTableHead>
              <CollectionTableHead className="">Kejadian</CollectionTableHead>
              <CollectionTableHead >Tingkat</CollectionTableHead>
              <CollectionTableHead >Dicatat oleh</CollectionTableHead>
              <CollectionTableHead >Tanggal</CollectionTableHead>
            <CreatedAtHead />
</CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="">
                  <CollectionEmptyState
                    align="center"
                    title={
                      hasActiveFilters
                        ? query && severityFilter === "all"
                          ? `Tidak ada hasil untuk “${query}”.`
                          : "Tidak ada kejadian sesuai filter"
                        : "Belum ada kejadian risiko"
                    }
                    description={
                      hasActiveFilters
                        ? "Ubah kata kunci atau tingkat kejadian untuk melihat hasil lain."
                        : "Catat kejadian pertama untuk mulai mengisi daftar kejadian risiko."
                    }
                    action={
                      hasActiveFilters ? (
                        <ActionButton
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setQuery("");
                            setSeverityFilter("all");
                          }}
                        >
                          Reset filter
                        </ActionButton>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              collectionSort.rows.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell><CollectionCode code={item.code} href={`/risk-events/${item.id}`} /></TableCell>
                  <TableCell className="align-middle">
                    <RiskTableIdentity
                      title={item.description}
                      href={`/risk-events/${item.id}`}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge variant={severityTone[item.severity]} className={getStatusBadgeClassName(item.severity)}>{severityLabel[item.severity]}</Badge>
                  </TableCell>
                  <TableCell className="align-middle">{item.createdByName || "-"}</TableCell>
                  <TableCell className="align-middle">
                    <span data-date-time="">{createDisplayDateFormatter("id-ID", { dateStyle: "medium" }).format(new Date(item.occurredAt))}</span>
                  </TableCell>
                <CreatedAtCell record={item} />
</TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </CollectionTableCard>
      </div>
      {token ? <RiskEventFormDialog open={formOpen} onOpenChange={setFormOpen} token={token} organizationId={user?.organizationId ?? undefined} initialRiskId={initialRiskId} onCreated={(event) => setItems((current) => [normalizeRiskEvent(event), ...current])} /> : null}
    </PageStack>
  );
}
