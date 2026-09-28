"use client";

import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "@/components/shared/icons";
import {
  CollapsibleCard,
  CollectionEmptyState,
  CollectionLoadingState,
  CollectionTableSurface,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  PopoverSelectField,
} from "@/components/shared/design-system";
import { buildLatestOrganizationProgressData } from "@/lib/dashboard-insights";
import type { LatestOrganizationProgressDatum } from "@/lib/dashboard-insights";
import type { WorkingPaper } from "@/types/working-paper";

type WorkingPaperProgressCollapsibleProps = {
  workingPapers: WorkingPaper[];
  loading: boolean;
  exportingPaperId?: string | null;
  onExport: (workingPaper: WorkingPaper) => void;
};

function normalizeProgressPeriod(value?: string) {
  const match = value?.trim().match(/^(\d{4})-(Q[1-4]|H[12])$/i);
  if (!match) return null;

  const period = match[2].toUpperCase();
  const quarter = period === "H1" ? "Q2" : period === "H2" ? "Q4" : period;
  return `${match[1]}-${quarter}`;
}

function resolveProgressPeriod(
  workingPaper: Pick<WorkingPaper, "assessment_cycle" | "created_at">,
) {
  const assessmentPeriod = normalizeProgressPeriod(
    workingPaper.assessment_cycle,
  );
  if (assessmentPeriod) return assessmentPeriod;

  const createdAt = new Date(workingPaper.created_at ?? "");
  if (Number.isNaN(createdAt.getTime())) return null;

  return `${createdAt.getFullYear()}-Q${Math.floor(createdAt.getMonth() / 3) + 1}`;
}

function resolveWorkingPaperOrganization(workingPaper: WorkingPaper) {
  return (
    workingPaper.risks
      ?.map((item) => item.risk?.org_name?.trim())
      .find(Boolean) ||
    workingPaper.org_id?.trim() ||
    "Tanpa Unit"
  );
}

function findWorkingPaperForProgressRow(
  row: LatestOrganizationProgressDatum,
  workingPapers: WorkingPaper[],
) {
  return workingPapers
    .filter(
      (workingPaper) =>
        resolveWorkingPaperOrganization(workingPaper) === row.orgName &&
        resolveProgressPeriod(workingPaper) === row.period,
    )
    .sort((left, right) => {
      const leftCreatedAt = new Date(left.created_at ?? "").getTime();
      const rightCreatedAt = new Date(right.created_at ?? "").getTime();
      return rightCreatedAt - leftCreatedAt;
    })[0];
}

function periodSortValue(period: string) {
  const [year, quarter] = period.split("-");
  return Number(year) * 4 + Number(quarter.slice(1));
}

export function WorkingPaperProgressCollapsible({
  workingPapers,
  loading,
  exportingPaperId,
  onExport,
}: WorkingPaperProgressCollapsibleProps) {
  const [periodFilter, setPeriodFilter] = useState("all");
  const periodOptions = useMemo(() => {
    const periods = new Set(
      workingPapers
        .map(resolveProgressPeriod)
        .filter((period): period is string => Boolean(period)),
    );

    return [...periods].sort(
      (left, right) => periodSortValue(right) - periodSortValue(left),
    ).map((period) => ({ value: period, label: period }));
  }, [workingPapers]);

  const activePeriodFilter =
    periodFilter === "all" ||
    periodOptions.some((option) => option.value === periodFilter)
      ? periodFilter
      : "all";
  const filteredWorkingPapers = useMemo(
    () =>
      activePeriodFilter === "all"
        ? workingPapers
        : workingPapers.filter(
            (workingPaper) =>
              resolveProgressPeriod(workingPaper) === activePeriodFilter,
          ),
    [activePeriodFilter, workingPapers],
  );
  const progressData = useMemo(
    () => buildLatestOrganizationProgressData(filteredWorkingPapers),
    [filteredWorkingPapers],
  );

  return (
    <CollapsibleCard.Root defaultOpen={false}>
      <div className="flex min-w-0 items-center">
        <CollapsibleCard.Trigger className="min-w-0 flex-1 justify-start hover:bg-card">
          <CollapsibleCard.Header className="min-w-0 flex-1">
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
        <CollapsibleCard.Actions className="pr-4">
          <PopoverSelectField
            value={activePeriodFilter}
            onValueChange={setPeriodFilter}
            options={[
              { value: "all", label: "Semua periode" },
              ...periodOptions,
            ]}
            placeholder="Semua periode"
            ariaLabel="Filter periode progress kertas kerja"
            triggerClassName="h-8 w-[140px] px-2 text-xs sm:w-[160px]"
          />
        </CollapsibleCard.Actions>
      </div>

      <CollapsibleCard.Content>
        <CollapsibleCard.Body className="px-0">
          {loading ? (
            <CollectionLoadingState message="Memuat progress kertas kerja..." />
          ) : progressData.length === 0 ? (
            <CollectionEmptyState
              title="Belum ada progress risiko"
              description={
                activePeriodFilter === "all"
                  ? "Belum ada progress pada hasil saat ini."
                  : `Belum ada progress untuk periode ${activePeriodFilter}.`
              }
              className="min-h-40"
            />
          ) : (
            <LatestProgressTable
              data={progressData}
              workingPapers={filteredWorkingPapers}
              exportingPaperId={exportingPaperId}
              onExport={onExport}
            />
          )}
        </CollapsibleCard.Body>
      </CollapsibleCard.Content>
    </CollapsibleCard.Root>
  );
}

function LatestProgressTable({
  data,
  workingPapers,
  exportingPaperId,
  onExport,
}: {
  data: LatestOrganizationProgressDatum[];
  workingPapers: WorkingPaper[];
  exportingPaperId?: string | null;
  onExport: (workingPaper: WorkingPaper) => void;
}) {
  return (
    <CollectionTableSurface viewportClassName="max-h-[300px] overflow-y-auto">
      <Table className="min-w-[640px] table-fixed">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[16%]" />
          <col className="w-[34%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
        </colgroup>
        <CollectionTableHeader density="compact">
          <CollectionTableHeaderRow>
            <CollectionTableHead className="px-24">
              Organisasi
            </CollectionTableHead>
            <CollectionTableHead >Periode</CollectionTableHead>
            <CollectionTableHead >Progress</CollectionTableHead>
            <CollectionTableHead className="text-right">
              Final
            </CollectionTableHead>
            <CollectionTableHead className="text-right">
              <span className="sr-only">Aksi</span>
            </CollectionTableHead>
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>
          {data.map((row) => {
            const workingPaper = findWorkingPaperForProgressRow(row, workingPapers);
            const isExporting = workingPaper?.id === exportingPaperId;

            return (
              <TableRow
                key={`${row.orgName}-${row.period}`}
                className="h-12 transition-colors hover:bg-muted/70"
              >
              <TableCell
                className="truncate px-24"
                title={row.orgName}
              >
                {row.orgName}
              </TableCell>
              <TableCell className="">
                {row.period}
              </TableCell>
              <TableCell className="">
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
              <TableCell className="text-right tabular-nums">
                {row.progressCount}/{row.totalCount}
              </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    disabled={!workingPaper || isExporting}
                    aria-label={
                      workingPaper
                        ? `Download ${workingPaper.title || workingPaper.code}`
                        : `Download kertas kerja ${row.orgName}`
                    }
                    title="Download kertas kerja"
                    onClick={() => {
                      if (workingPaper) onExport(workingPaper);
                    }}
                  >
                    {isExporting ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </CollectionTableSurface>
  );
}
