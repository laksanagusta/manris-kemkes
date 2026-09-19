"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { listRiskEvents } from "@/lib/api/risk-events";
import type { RiskEvent, RiskEventSeverity } from "@/types/risk-event";
import { RiskEventFormDialog } from "./_components/risk-event-form-sheet";
import {
  AccentButton, ActionButton, CollectionEmptyState, CollectionErrorState, CollectionLoadingState,
  CollectionSearchField, CollectionStatusBadge, CollectionTableCard,
  CollectionTableHead, CollectionTableHeader, CollectionTableHeaderRow, CollectionToolbar, PageStack,
} from "@/components/shared/design-system";
import { Plus } from "@/components/ui/icons";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const severityLabel: Record<RiskEventSeverity, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", extreme: "Ekstrem" };
const severityTone: Record<RiskEventSeverity, "success" | "warning" | "danger"> = { low: "success", medium: "warning", high: "danger", extreme: "danger" };

export default function RiskEventsPage() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const initialRiskId = searchParams.get("riskId") || undefined;
  const [items, setItems] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(Boolean(initialRiskId));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError("");
    try { setItems(await listRiskEvents(token)); }
    catch { setError("Tidak dapat memuat kejadian risiko. Coba lagi."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return items.filter((item) => !value || `${item.code} ${item.description} ${item.actualImpact} ${item.linkedRisks.map((risk) => `${risk.code} ${risk.title}`).join(" ")}`.toLowerCase().includes(value));
  }, [items, query]);

  if (loading) return <PageStack><CollectionLoadingState message="Memuat kejadian risiko…" /></PageStack>;
  if (error) return <PageStack><CollectionErrorState title="Tidak dapat memuat kejadian risiko" message={error} onReload={() => void load()} /></PageStack>;

  return (
    <PageStack>
      <CollectionToolbar leading={<CollectionSearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode, kejadian, atau risiko" aria-label="Cari kejadian atau risiko" />} actions={<AccentButton icon={<Plus className="size-3.5" />} onClick={() => setFormOpen(true)}>Catat Kejadian</AccentButton>} />
      {filtered.length === 0 ? (
        <CollectionEmptyState
          title={query ? `Tidak ada hasil untuk “${query}”.` : "Belum ada kejadian risiko"}
          description={query ? "Periksa ejaan atau hapus kata kunci untuk melihat semua kejadian." : "Catat kejadian pertama untuk mulai mengisi daftar kejadian risiko."}
          action={query ? <ActionButton type="button" variant="outline" onClick={() => setQuery("")}>Hapus pencarian</ActionButton> : undefined}
        />
      ) : (
        <CollectionTableCard>
          <Table className="min-w-[1180px] table-fixed">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[30%]" />
              <col className="w-[11%]" />
              <col className="w-[21%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow className="h-9 hover:bg-transparent">
                <CollectionTableHead className="px-3">Kode</CollectionTableHead>
                <CollectionTableHead className="px-3">Kejadian</CollectionTableHead>
                <CollectionTableHead className="px-3">Tingkat</CollectionTableHead>
                <CollectionTableHead className="px-3">Risiko terkait</CollectionTableHead>
                <CollectionTableHead className="px-3">Dicatat oleh</CollectionTableHead>
                <CollectionTableHead className="px-3">Waktu</CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="group border-0 hover:bg-transparent">
                  <TableCell className="px-3 py-2 align-middle">
                    <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle">
                    <Link href={`/risk-events/${item.id}`} className="line-clamp-2 text-sm font-semibold leading-5 text-foreground transition-colors hover:text-primary">
                      {item.description}
                    </Link>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.actualImpact}</span>
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle">
                    <CollectionStatusBadge tone={severityTone[item.severity]}>{severityLabel[item.severity]}</CollectionStatusBadge>
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle text-sm">
                    {item.linkedRisks.length ? item.linkedRisks.map((risk) => risk.code || risk.title).join(", ") : <CollectionStatusBadge variant="secondary">Belum dipetakan</CollectionStatusBadge>}
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle text-sm text-secondary-foreground">{item.createdByName || "-"}</TableCell>
                  <TableCell className="px-3 py-2 align-middle text-sm text-secondary-foreground">
                    {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.occurredAt))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CollectionTableCard>
      )}
      {token ? <RiskEventFormDialog open={formOpen} onOpenChange={setFormOpen} token={token} organizationId={user?.organizationId ?? undefined} initialRiskId={initialRiskId} onCreated={(event) => setItems((current) => [event, ...current])} /> : null}
    </PageStack>
  );
}
