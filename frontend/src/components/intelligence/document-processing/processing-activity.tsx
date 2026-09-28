"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import type { ProcessingJob, ProcessingTask, ProcessingTaskStatus } from "@/types/document-processing";

function taskMeta(status: ProcessingTaskStatus) {
  switch (status) {
    case "completed":
      return { label: "Selesai", tone: "success" as const, icon: CheckCircle2 };
    case "warning":
      return { label: "Perlu perhatian", tone: "warning" as const, icon: AlertTriangle };
    case "failed":
      return { label: "Gagal", tone: "danger" as const, icon: XCircle };
    case "running":
      return { label: "Berjalan", tone: "progress" as const, icon: Loader2 };
    default:
      return { label: "Dalam antrean", tone: "progress" as const, icon: Clock };
  }
}

function TaskRow({ task, onRetry }: { task: ProcessingTask; onRetry?: () => void }) {
  const meta = taskMeta(task.status);
  const Icon = meta.icon;
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
      <Badge variant={toBadgeVariant(meta.tone)} className={getStatusBadgeClassName(meta.tone)}>
        <Icon className={cn("size-3.5", task.status === "running" && "motion-safe:animate-pulse motion-reduce:animate-none")} />
      </Badge>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">{task.label}</span>
          <Badge variant={toBadgeVariant(meta.tone)} className={getStatusBadgeClassName(meta.tone)}>{meta.label}</Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{task.description}</p>
        {task.status === "running" ? <p className="mt-1 text-xs text-primary/80">Terhubung ke {task.documentIds.length} dokumen</p> : null}
        {task.error ? <p className="mt-1 text-xs leading-5 text-destructive">{task.error}</p> : null}
      </div>
      {task.status === "failed" && task.retryable && onRetry ? (
        <Button type="button" variant="outline" size="xs" className="shrink-0 active:scale-[0.96]" onClick={onRetry}>
          <RefreshCw className="size-3" />
          Coba lagi
        </Button>
      ) : null}
      </CardContent>
    </Card>
  );
}

export function TaskLanes({ job, onRetryTask }: { job: ProcessingJob; onRetryTask: (taskId: string) => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const completed = job.tasks.filter((task) => task.status === "completed" || task.status === "warning").length;
  const processing = job.status === "processing" || job.status === "queued";
  return (
    <Card role="region" aria-labelledby="parallel-work-title" aria-busy={processing}>
      <p className="sr-only" role="status" aria-live="polite">
        {completed} dari {job.tasks.length} tugas selesai. Progres {job.progress} persen.
      </p>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle><h2 id="parallel-work-title">Pemrosesan paralel</h2></CardTitle>
            <Badge variant="secondary" className="tabular-nums">{completed}/{job.tasks.length} tugas selesai</Badge>
          </div>
          <CardDescription>Beberapa pekerjaan berjalan bersamaan; detail teknis tetap diringkas di bawah agar status mudah dipindai.</CardDescription>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{job.progress}%</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progres pemrosesan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress}>
        <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${job.progress}%` }} transition={reduceMotion ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0 }} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {job.tasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onRetry={() => onRetryTask(task.id)} />)}
      </div>
      <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)} className="mt-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <span className="inline-flex items-center gap-2"><CircleDot className="size-3.5 text-muted-foreground" />Lihat detail pemrosesan</span>
        </summary>
        {detailsOpen ? <div className="mt-3 grid gap-2 md:grid-cols-2">{job.tasks.slice(4).map((task) => <TaskRow key={task.id} task={task} onRetry={() => onRetryTask(task.id)} />)}</div> : null}
      </details>
      </CardContent>
    </Card>
  );
}

export function ActivityTimeline({ job }: { job: ProcessingJob }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLLIElement | null>(null);
  const previousLengthRef = useRef(job.events.length);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (job.events.length <= previousLengthRef.current) return;
    previousLengthRef.current = job.events.length;
    const container = scrollRef.current;
    if (!container) return;
    const closeToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 72;
    if (closeToBottom) endRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [job.events.length, reduceMotion]);

  return (
    <Card role="region" aria-labelledby="activity-title">
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle><h2 id="activity-title">Linimasa aktivitas</h2></CardTitle>
          <Badge variant="outline" className="tabular-nums">{job.events.length} peristiwa</Badge>
        </div>
        <span className="font-mono text-xs text-muted-foreground">gulir otomatis</span>
      </CardHeader>
      <CardContent ref={scrollRef} className="max-h-64 overflow-auto pr-1">
        <ol className="relative space-y-4 pl-5" role="log" aria-live="polite" aria-relevant="additions text">
          <span className="absolute bottom-1 left-[7px] top-1 w-px bg-border/80" aria-hidden="true" />
          {job.events.map((event, index) => (
            <li key={event.id} ref={index === job.events.length - 1 ? endRef : undefined} className="relative">
              <span className={cn("absolute -left-5 top-0.5 flex size-3.5 items-center justify-center rounded-full border-2 border-card", event.tone === "success" ? "bg-success" : event.tone === "warning" ? "bg-warning" : event.tone === "danger" ? "bg-destructive" : "bg-muted-foreground")} aria-hidden="true" />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-medium text-foreground">{event.label}</span>
                <time className="font-mono text-xs text-muted-foreground">{event.relativeTime}</time>
              </div>
              {event.detail ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{event.detail}</p> : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
