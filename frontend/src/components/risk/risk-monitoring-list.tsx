"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listRiskMonitorings } from "@/lib/api/risk-monitoring";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import { Button } from "@/components/ui/button";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CollectionTableCard } from "@/components/shared/design-system/collections/collection-table-card";
import { CollectionEmptyState } from "@/components/shared/design-system/collections/collection-empty-state";
import { MitigationCollectionTable } from "@/components/shared/design-system/collections/mitigation-collection-table";

const columns = [
  { key: "period", label: "Periode", width: "25%" },
  { key: "status", label: "Status", width: "20%" },
  { key: "score", label: "Skor pemantauan", width: "20%" },
  { key: "date", label: "Diperbarui", width: "35%" },
];
export function RiskMonitoringTable({
  items,
}: {
  items: readonly RiskMonitoringDetail[];
}) {
  return (
    <CollectionTableCard>
      <MitigationCollectionTable columns={columns}>
        <TableBody>
          {items.length ? (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    className="font-medium hover:underline"
                    href={`/risk/monitoring/${item.id}`}
                  >
                    {item.assessmentCycle || "Lihat pemantauan"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={toBadgeVariant(item.status === "final" ? "success" : "neutral")}
                    className={getStatusBadgeClassName(item.status === "final" ? "success" : "neutral")}
                  >
                    {item.status === "final"
                      ? "Final"
                      : item.status === "superseded"
                        ? "Digantikan"
                        : "Draft"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.status === "final" ? item.observedNilai : "—"}
                </TableCell>
                <TableCell>
                  {item.updatedAt || item.startedAt
                    ? new Date(
                        item.updatedAt || item.startedAt,
                      ).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Jakarta",
                      })
                    : "—"}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <CollectionEmptyState
                  title="Belum ada pemantauan"
                  description="Pemantauan risiko yang sudah dimulai akan ditampilkan di sini."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </MitigationCollectionTable>
    </CollectionTableCard>
  );
}

export function RiskMonitoringList({
  riskId,
  riskCode,
  versionGroupId,
  token,
  active,
}: {
  riskId: string;
  riskCode: string;
  versionGroupId?: string;
  token: string;
  active: boolean;
}) {
  const [state, setState] = useState<{
    key: string;
    items: RiskMonitoringDetail[];
    error: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const key = `${riskId}:${riskCode}:${versionGroupId || ""}:${retry}`;
  useEffect(() => {
    if (!active || !riskId || !token) return;
    let cancelled = false;
    async function load() {
      const items: RiskMonitoringDetail[] = [];
      let page = 1;
      let total = Infinity;
      while (!cancelled && items.length < total) {
        const result = await listRiskMonitorings(token, {
          q: riskCode || undefined,
          lifecycle: "all",
          page,
          limit: 100,
        });
        items.push(...result.data);
        total = result.total;
        if (!result.data.length) break;
        page++;
      }
      const matching = items
        .filter(
          (item) =>
            item.sourceRiskId === riskId ||
            item.resultRiskId === riskId ||
            Boolean(
              versionGroupId &&
              (item.sourceRisk?.versionGroupId === versionGroupId ||
                item.resultRisk?.versionGroupId === versionGroupId),
            ),
        )
        .sort((a, b) => b.assessmentCycle.localeCompare(a.assessmentCycle));
      if (!cancelled) setState({ key, items: matching, error: false });
    }
    load().catch(() => {
      if (!cancelled) setState({ key, items: [], error: true });
    });
    return () => {
      cancelled = true;
    };
  }, [active, riskId, riskCode, versionGroupId, token, key, retry]);
  if (!state || state.key !== key)
    return (
      <p role="status" className="py-8 text-sm text-muted-foreground">
        Memuat pemantauan...
      </p>
    );
  if (state.error)
    return (
      <div role="alert" className="space-y-3 py-6">
        <p className="text-sm">Pemantauan belum dapat dimuat.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setRetry((value) => value + 1)}
        >
          Coba lagi
        </Button>
      </div>
    );
  return <RiskMonitoringTable items={state.items} />;
}
