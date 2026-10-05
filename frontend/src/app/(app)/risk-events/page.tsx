"use client";

import Link from "next/link";
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
  CollectionSearchField, CollectionTableCard, PopoverSelectField,
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
  const [formOpen, setFormOpen] = useState(Boolean(initialRiskId));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try { setItems((await listRiskEvents(token)).map(normalizeRiskEvent)); }
    catch { setError("Tidak dapat memuat kejadian risiko. Coba lagi."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !value || `${item.code} ${item.description} ${item.actualImpact} ${item.linkedRisks.map((risk) => `${risk.code} ${risk.title}`).join(" ")}`.toLowerCase().includes(value);
      const matchesSeverity = severityFilter === "all" || item.severity === severityFilter;
      return matchesQuery && matchesSeverity;
    });
  }, [items, query, severityFilter]);
  const hasActiveFilters = Boolean(query.trim()) || severityFilter !== "all";

  if (loading) return <PageStack><CollectionLoadingState message="Memuat kejadian risiko…" /></PageStack>;
  if (error) return <PageStack><CollectionErrorState title="Tidak dapat memuat kejadian risiko" message={error} onReload={() => void load()} /></PageStack>;

  return (
    <PageStack>
      <div className="space-y-4">
        <CollectionToolbar
          leading={
            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <CollectionSearchField
                containerClassName="w-full sm:w-80 sm:flex-none"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari kode, kejadian, atau risiko"
                aria-label="Cari kejadian atau risiko"
              />
              <div className="w-full sm:w-fit">
                <PopoverSelectField
                  fitContent
                  value={severityFilter}
                  onValueChange={(value) =>
                    setSeverityFilter(value as RiskEventSeverity | "all")
                  }
                  options={[
                    { value: "all", label: "Semua Tingkat" },
                    { value: "low", label: severityLabel.low },
                    { value: "medium", label: severityLabel.medium },
                    { value: "high", label: severityLabel.high },
                    { value: "extreme", label: severityLabel.extreme },
                  ]}
                  placeholder="Tingkat"
                  ariaLabel="Filter tingkat kejadian risiko"
                  triggerClassName="h-8 rounded-lg bg-card text-sm"
                />
              </div>
            </div>
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
        <CollectionTableCard>
          <Table className="min-w-[1180px] table-fixed">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[11%]" />
            <col className="w-[21%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow className="h-9 hover:bg-transparent">
              <CollectionTableHead className="">Kejadian</CollectionTableHead>
              <CollectionTableHead >Tingkat</CollectionTableHead>
              <CollectionTableHead >Risiko terkait</CollectionTableHead>
              <CollectionTableHead >Dicatat oleh</CollectionTableHead>
              <CollectionTableHead >Tanggal</CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="">
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
              filtered.map((item) => (
                <TableRow key={item.id} className="group hover:bg-transparent">
                  <TableCell className="align-middle">
                    <Link href={`/risk-events/${item.id}`} className="line-clamp-2 text-sm font-medium leading-5 text-foreground transition-colors hover:text-primary">
                      {item.description}
                    </Link>
                    <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{item.code}</span>
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge variant={severityTone[item.severity]} className={getStatusBadgeClassName(item.severity)}>{severityLabel[item.severity]}</Badge>
                  </TableCell>
                  <TableCell className="align-middle text-muted-foreground">
                    {item.linkedRisks.length ? item.linkedRisks.map((risk) => risk.code || risk.title).join(", ") : <Badge variant="secondary">Belum dipetakan</Badge>}
                  </TableCell>
                  <TableCell className="align-middle text-muted-foreground">{item.createdByName || "-"}</TableCell>
                  <TableCell className="align-middle text-muted-foreground">
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.occurredAt))}
                  </TableCell>
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
