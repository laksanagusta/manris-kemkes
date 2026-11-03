"use client";
import { useEffect, useState } from "react";
import { listAllRiskMonitoringsForCycle } from "@/lib/api/risk-monitoring";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import {
  buildMonitoringOrganizationSummaries,
  buildMonitoringTransactionRows,
} from "@/lib/monitoring-overview";
import {
  CollapsibleCard,
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
function OrganizationSummaryTable({
  summaries,
}: {
  summaries: ReturnType<typeof buildMonitoringOrganizationSummaries>;
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-0 table-fixed">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[18%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
        </colgroup>
        <CollectionTableHeader density="compact">
          <CollectionTableHeaderRow>
            <CollectionTableHead className="">Organisasi</CollectionTableHead>
            <CollectionTableHead className="text-right">
              Total
            </CollectionTableHead>
            <CollectionTableHead className="text-right">
              Draf
            </CollectionTableHead>
            <CollectionTableHead className="text-right">
              Final
            </CollectionTableHead>
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>
          {summaries.map((summary) => (
            <TableRow key={summary.id}>
              <TableCell className="">
                <div className="flex items-center gap-2">
                  <span
                    className="truncate text-sm font-medium text-foreground"
                    title={summary.name}
                  >
                    {summary.name}
                  </span>
                  {summary.total === 0 ? (
                    <Badge variant="secondary" className="">
                      Belum Ada Data
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {summary.total}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {summary.inProgress}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {summary.finalized}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function MonitoringOrganizationSummaryCollapsible({
  cycle,
  loading,
  summaries,
  error,
  onRetry,
  onOpenChange,
}: {
  cycle: string;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenChange?: (open: boolean) => void;
  summaries: ReturnType<typeof buildMonitoringOrganizationSummaries>;
}) {
  return (
    <CollapsibleCard.Root defaultOpen={false} onOpenChange={onOpenChange}>
      <CollapsibleCard.Trigger>
        <CollapsibleCard.Header>
          <CollapsibleCard.Icon />
          <CollapsibleCard.Title>Rekap per Organisasi</CollapsibleCard.Title>
        </CollapsibleCard.Header>
        <CollapsibleCard.Actions>
          <Badge variant="secondary" className="">
            {cycle}
          </Badge>
        </CollapsibleCard.Actions>
      </CollapsibleCard.Trigger>

      <CollapsibleCard.Content>
        <CollapsibleCard.Body className="p-0">
          {error ? (
            <CollectionErrorState message={error} onReload={onRetry} />
          ) : loading ? (
            <CollectionLoadingState message="Memuat rekap organisasi..." />
          ) : summaries.length === 0 ? (
            <CollectionEmptyState
              title="Belum ada organisasi dalam scope"
              description="Scope organisasi yang dapat dibaca belum memiliki data untuk diringkas."
            />
          ) : (
            <>
              <p className="px-4 py-3 text-xs text-muted-foreground">
                Transaksi pemantauan pada periode dan unit laporan. Total
                mencakup seluruh status transaksi.
              </p>
              <OrganizationSummaryTable summaries={summaries} />
            </>
          )}
        </CollapsibleCard.Body>
      </CollapsibleCard.Content>
    </CollapsibleCard.Root>
  );
}

export function MonitoringOrganizationRecap({
  token,
  cycle,
  organizations,
}: {
  token: string | null;
  cycle: string;
  organizations: OrganizationListItem[];
}) {
  const [started, setStarted] = useState(false);
  const [monitorings, setMonitorings] = useState<RiskMonitoringDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!started || !token) return;
    let cancelled = false;
    listAllRiskMonitoringsForCycle(token, cycle)
      .then((result) => {
        if (!cancelled) setMonitorings(result);
      })
      .catch(() => {
        if (!cancelled) {
          setMonitorings([]);
          setError("Rekap organisasi belum berhasil dimuat. Coba lagi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [started, token, cycle, retry]);
  const rows = buildMonitoringTransactionRows(monitorings, organizations);
  const summaries = buildMonitoringOrganizationSummaries(
    rows,
    organizations,
    "all",
  );
  return (
    <MonitoringOrganizationSummaryCollapsible
      cycle={cycle}
      loading={loading}
      summaries={summaries}
      error={error}
      onRetry={() => {
        setLoading(true);
        setError(null);
        setRetry((value) => value + 1);
      }}
      onOpenChange={(open) => {
        if (open) setStarted(true);
      }}
    />
  );
}
