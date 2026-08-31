"use client";

import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  CollapsibleCard,
  CollectionLoadingState,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import { buildLatestOrganizationProgressData } from "@/lib/dashboard-insights";
import type { LatestOrganizationProgressDatum } from "@/lib/dashboard-insights";
import type { WorkingPaper } from "@/types/working-paper";

type WorkingPaperProgressCollapsibleProps = {
  workingPapers: WorkingPaper[];
  loading: boolean;
};

export function WorkingPaperProgressCollapsible({
  workingPapers,
  loading,
}: WorkingPaperProgressCollapsibleProps) {
  const progressData = useMemo(
    () => buildLatestOrganizationProgressData(workingPapers),
    [workingPapers],
  );

  return (
    <CollapsibleCard.Root defaultOpen={false}>
      <CollapsibleCard.Trigger>
        <CollapsibleCard.Header>
          <CollapsibleCard.Icon />
          <CollapsibleCard.Text>
            <CollapsibleCard.Title>
              Progress Kertas Kerja
            </CollapsibleCard.Title>
            <CollapsibleCard.Description>
              Persentase risiko final pada kertas kerja yang sedang ditampilkan.
            </CollapsibleCard.Description>
          </CollapsibleCard.Text>
        </CollapsibleCard.Header>
      </CollapsibleCard.Trigger>

      <CollapsibleCard.Content>
        <CollapsibleCard.Body className="p-4">
          {loading ? (
            <CollectionLoadingState message="Memuat progress kertas kerja..." />
          ) : progressData.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Belum ada progress risiko pada hasil saat ini.
            </div>
          ) : (
            <LatestProgressTable data={progressData} />
          )}
        </CollapsibleCard.Body>
      </CollapsibleCard.Content>
    </CollapsibleCard.Root>
  );
}

function LatestProgressTable({
  data,
}: {
  data: LatestOrganizationProgressDatum[];
}) {
  return (
    <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/60">
      <Table className="min-w-[640px] table-fixed">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[18%]" />
          <col className="w-[38%]" />
          <col className="w-[14%]" />
        </colgroup>
        <CollectionTableHeader density="compact">
          <CollectionTableHeaderRow>
            <CollectionTableHead className="pl-4 pr-3">
              Organisasi
            </CollectionTableHead>
            <CollectionTableHead className="px-3">Periode</CollectionTableHead>
            <CollectionTableHead className="px-3">Progress</CollectionTableHead>
            <CollectionTableHead className="px-4 text-right">
              Final
            </CollectionTableHead>
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={`${row.orgName}-${row.period}`}
              className="h-12"
            >
              <TableCell
                className="truncate py-2 pl-4 pr-3 text-sm font-medium"
                title={row.orgName}
              >
                {row.orgName}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm text-muted-foreground">
                {row.period}
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Progress
                    value={row.progressPercent}
                    aria-label={`Progress ${row.orgName} ${row.progressPercent}%`}
                    className="h-2"
                  />
                  <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {row.progressPercent}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="px-4 py-2 text-right font-mono text-sm tabular-nums text-muted-foreground">
                {row.progressCount}/{row.totalCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
