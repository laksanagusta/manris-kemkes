"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/shared/design-system/actions/action-button";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { CollectionEmptyState } from "@/components/shared/design-system/collections/collection-empty-state";
import { ArrowRight, CheckCircle2, ChevronDown, Circle, ClipboardList, Clock } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDisplayDate } from "@/lib/display-date";
import { formatRiskScore } from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { WorkingPaperQueueRow } from "@/lib/working-paper-monitoring-queue";

const groups = [
  { status: "unmonitored", label: "Belum dimulai", Icon: Circle },
  { status: "draft", label: "Draf", Icon: Clock },
  { status: "final", label: "Final", Icon: CheckCircle2 },
] as const;

type StartMonitoring = (riskId: string, trigger: HTMLButtonElement) => void;

function QueueRisk({ row, starting, onStart }: {
  row: WorkingPaperQueueRow;
  starting?: boolean;
  onStart: StartMonitoring;
}) {
  const { action } = row;

  return (
    <li className="grid gap-x-4 gap-y-2 px-4 py-3 @min-[36rem]:grid-cols-[minmax(0,1fr)_9rem_9rem] @min-[36rem]:items-center">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold [overflow-wrap:anywhere]">{row.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <CollectionCode code={row.code} href={row.riskHref} />
            {row.versionNumber != null && <span>v{row.versionNumber}</span>}
          </span>
          {row.observedAt && (
            <span>
              {row.observedAtInferred ? "Tanggal perkiraan data lama" : "Diamati"}{" "}
              <time dateTime={row.observedAt}>
                {formatDisplayDate(new Date(`${row.observedAt}T00:00:00+07:00`), { dateStyle: "medium", timeZone: "Asia/Jakarta" })}
              </time>
            </span>
          )}
        </div>
        {row.inconsistent && <Badge variant="destructive">Data tidak konsisten</Badge>}
      </div>
      <dl className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 @min-[36rem]:block">
        <div className="flex items-baseline gap-2">
          <dt className="text-xs text-muted-foreground">Skor</dt>
          <dd className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
            <span className={row.observedScore != null ? "text-muted-foreground" : undefined}>
              {formatRiskScore(row.sourceScore)}
            </span>
            {row.observedScore != null && (
              <>
                <ArrowRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
                <span className="sr-only">menjadi</span>
                <span>{formatRiskScore(row.observedScore)}</span>
              </>
            )}
          </dd>
        </div>
        {row.observedScore != null && row.observedLevelLabel !== "-" && (
          <div>
            <dt className="sr-only">Tingkat risiko hasil pengamatan</dt>
            <dd className="text-xs leading-5 text-secondary-foreground">{row.observedLevelLabel}</dd>
          </div>
        )}
      </dl>
      {(row.sourceHref || action) && <div className="flex flex-wrap items-center gap-2 @min-[36rem]:justify-end">
        {row.sourceHref && (
          <ActionButton asChild size="sm" variant="ghost">
            <Link href={row.sourceHref} aria-label={`Detail risiko awal ${row.code}`}>Risiko awal</Link>
          </ActionButton>
        )}
        {action && ("href" in action ? (
          <ActionButton asChild size="sm" variant={row.status === "draft" ? "default" : "outline"}>
            <Link href={action.href} aria-label={`${action.label} ${row.code}`}>{action.label}</Link>
          </ActionButton>
        ) : (
          <ActionButton type="button" size="sm" variant="outline" disabled={starting} aria-label={`${action.label} ${row.code}`} onClick={(event) => onStart(action.riskId, event.currentTarget)}>
            {action.label}
          </ActionButton>
        ))}
      </div>}
    </li>
  );
}

export function WorkingPaperMonitoringQueue({ rows, readiness, starting, onStart }: {
  rows: WorkingPaperQueueRow[];
  readiness?: string;
  starting?: boolean;
  onStart: StartMonitoring;
}) {
  const id = useId();
  const [collapsed, setCollapsed] = useState<Partial<Record<WorkingPaperQueueRow["status"], boolean>>>({});
  const completed = rows.filter(({ status }) => status === "final").length;
  const percentage = rows.length ? Math.round(completed / rows.length * 100) : 0;
  const progressLabel = `${completed} dari ${rows.length} risiko selesai dipantau`;

  return (
    <section aria-labelledby={id} className="@container space-y-3">
      <Card>
        <CardContent className="grid items-center gap-4 @min-[34rem]:grid-cols-2">
          <div className="space-y-1">
            <h2 id={id} className="text-sm font-medium text-secondary-foreground">Progress Pemantauan</h2>
            {readiness && (
              <p role="status" className="flex items-start gap-2 text-sm text-secondary-foreground">
                <ClipboardList aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {readiness}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-secondary-foreground">{progressLabel}</span>
              <span className="font-medium tabular-nums">{percentage}%</span>
            </div>
            <Progress value={percentage} aria-label="Progres pemantauan" aria-valuetext={`${progressLabel} (${percentage}%)`} className="h-3 rounded-xs [&_[data-slot=progress-indicator]]:rounded-[inherit] [&_[data-slot=progress-indicator]]:bg-success [&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-200 [&_[data-slot=progress-indicator]]:ease-out motion-reduce:[&_[data-slot=progress-indicator]]:transition-none" />
          </div>
        </CardContent>
      </Card>
      {rows.length === 0 ? (
        <Card><CollectionEmptyState title="Belum ada risiko" description="Dokumen ini belum memuat risiko apa pun." /></Card>
      ) : groups.map(({ status, label, Icon }) => {
        const items = rows.filter((row) => row.status === status);
        const expanded = !collapsed[status];
        const groupId = `${id}-${status}`;
        return (
          <Card key={status} className="gap-0 py-0">
            <h3>
              <button type="button" aria-expanded={expanded} aria-controls={groupId} onClick={() => setCollapsed((current) => ({ ...current, [status]: !current[status] }))} className="flex min-h-12 w-full items-center gap-2.5 px-4 text-start text-sm font-semibold hover:bg-transparent dark:hover:bg-transparent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
                <Icon aria-hidden="true" className={cn("size-4 shrink-0", status === "final" ? "text-success" : "text-muted-foreground")} />
                {label}
                <Badge variant="secondary" className="tabular-nums">{items.length}</Badge>
                <ChevronDown aria-hidden="true" className={cn("ms-auto size-4 text-muted-foreground transition-transform duration-150 ease-out motion-reduce:transition-none", expanded && "rotate-180")} />
              </button>
            </h3>
            <div id={groupId} className="motion-panel" data-open={expanded} inert={!expanded}>
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-border">
                  {items.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">Belum ada risiko pada tahap ini.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {items.map((row) => <QueueRisk key={row.id} row={row} starting={starting} onStart={onStart} />)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
