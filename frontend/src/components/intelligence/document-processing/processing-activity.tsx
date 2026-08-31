"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessingJob, ProcessingTask, ProcessingTaskStatus } from "@/types/document-processing";

function taskMeta(status: ProcessingTaskStatus) {
  switch (status) {
    case "completed":
      return { label: "Completed", tone: "success" as const, icon: CheckCircle2 };
    case "warning":
      return { label: "Warning", tone: "warning" as const, icon: AlertTriangle };
    case "failed":
      return { label: "Failed", tone: "danger" as const, icon: XCircle };
    case "running":
      return { label: "Running", tone: "progress" as const, icon: Loader2 };
    default:
      return { label: "Queued", tone: "neutral" as const, icon: Clock };
  }
}

function TaskRow({ task, onRetry }: { task: ProcessingTask; onRetry?: () => void }) {
  const meta = taskMeta(task.status);
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-white/65 px-3 py-2.5">
      <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg", meta.tone === "success" ? "bg-emerald-50 text-emerald-700" : meta.tone === "warning" ? "bg-amber-50 text-amber-700" : meta.tone === "danger" ? "bg-red-50 text-red-700" : meta.tone === "progress" ? "bg-sky-50 text-sky-700" : "bg-muted text-muted-foreground")}>
        <Icon className={cn("size-3.5", task.status === "running" && "motion-safe:animate-pulse motion-reduce:animate-none")} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">{task.label}</span>
          <Badge variant="outline" tone={meta.tone} size="micro">{meta.label}</Badge>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{task.description}</p>
        {task.status === "running" ? <p className="mt-1 text-[10px] text-sky-700/80">Linked to {task.documentIds.length} document{task.documentIds.length === 1 ? "" : "s"}</p> : null}
        {task.error ? <p className="mt-1 text-[11px] leading-5 text-destructive">{task.error}</p> : null}
      </div>
      {task.status === "failed" && task.retryable && onRetry ? (
        <Button type="button" variant="outline" size="xs" className="shrink-0 gap-1.5 active:scale-[0.96]" onClick={onRetry}>
          <RefreshCw className="size-3" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function TaskLanes({ job, onRetryTask }: { job: ProcessingJob; onRetryTask: (taskId: string) => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const completed = job.tasks.filter((task) => task.status === "completed" || task.status === "warning").length;
  return (
    <section className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5" aria-labelledby="parallel-work-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="parallel-work-title" className="text-sm font-semibold text-foreground">Parallel processing</h2>
            <Badge variant="secondary" className="tabular-nums text-[10px]">{completed}/{job.tasks.length} tasks done</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Beberapa pekerjaan berjalan bersamaan; detail teknis tetap diringkas di bawah agar status mudah dipindai.</p>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{job.progress}%</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`Progress ${job.progress}%`}>
        <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${job.progress}%` }} transition={{ type: "spring", duration: 0.4, bounce: 0 }} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {job.tasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onRetry={() => onRetryTask(task.id)} />)}
      </div>
      <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)} className="mt-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer list-none text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <span className="inline-flex items-center gap-2"><CircleDot className="size-3.5 text-muted-foreground" />View processing details</span>
        </summary>
        {detailsOpen ? <div className="mt-3 grid gap-2 md:grid-cols-2">{job.tasks.slice(4).map((task) => <TaskRow key={task.id} task={task} onRetry={() => onRetryTask(task.id)} />)}</div> : null}
      </details>
    </section>
  );
}

export function ActivityTimeline({ job }: { job: ProcessingJob }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLLIElement | null>(null);
  const previousLengthRef = useRef(job.events.length);

  useEffect(() => {
    if (job.events.length <= previousLengthRef.current) return;
    previousLengthRef.current = job.events.length;
    const container = scrollRef.current;
    if (!container) return;
    const closeToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 72;
    if (closeToBottom) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [job.events.length]);

  return (
    <section className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5" aria-labelledby="activity-title">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 id="activity-title" className="text-sm font-semibold text-foreground">Activity timeline</h2>
          <Badge variant="outline" className="tabular-nums text-[10px]">{job.events.length} events</Badge>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">auto-scroll</span>
      </div>
      <div ref={scrollRef} className="mt-4 max-h-64 overflow-auto pr-1">
        <ol className="relative space-y-4 pl-5">
          <span className="absolute bottom-1 left-[7px] top-1 w-px bg-border/80" aria-hidden="true" />
          {job.events.map((event, index) => (
            <li key={event.id} ref={index === job.events.length - 1 ? endRef : undefined} className="relative">
              <span className={cn("absolute -left-5 top-0.5 flex size-3.5 items-center justify-center rounded-full border-2 border-white", event.tone === "success" ? "bg-emerald-500" : event.tone === "warning" ? "bg-amber-500" : event.tone === "danger" ? "bg-red-500" : "bg-slate-400")} />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-xs font-medium text-foreground">{event.label}</span>
                <time className="font-mono text-[10px] text-muted-foreground">{event.relativeTime}</time>
              </div>
              {event.detail ? <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{event.detail}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
