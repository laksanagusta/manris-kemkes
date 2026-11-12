"use client";

import { CalendarClock, CalendarDays, ExternalLink, Link2, MessageSquare, Target, UserRound } from "@/components/shared/icons";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { getMitigationReportLabel } from "@/lib/mitigation-report-status";
import { isValidEvidenceUrl, parseEvidenceUrls } from "@/lib/validation/reporting";
import { cn } from "@/lib/utils";
import type { MitigationTask } from "@/types/risk";

export type MitigationReportDetailTask = Pick<MitigationTask,
  "mitigationAction" | "status" | "periodLabel" | "dueDate" | "reportedByName" | "reportedBy" | "reportedAt" | "notes" | "evidenceUrl"
>;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return createDisplayDateFormatter("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function MitigationReportDetail({
  task,
  status = task.status,
}: {
  task: MitigationReportDetailTask;
  status?: MitigationTask["status"];
}) {
  const evidenceUrls = [...new Set(parseEvidenceUrls(task.evidenceUrl ?? ""))];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Tindakan Penanganan
          </p>
          <div className="flex min-w-0 items-start gap-2 text-sm font-medium leading-6">
            <Target
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <span className="min-w-0 wrap-break-word">{task.mitigationAction || "-"}</span>
          </div>
        </div>

        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  status === "done"
                    ? "bg-success"
                    : status === "overdue"
                      ? "bg-destructive"
                      : "bg-muted-foreground",
                )}
                aria-hidden="true"
              />
              {getMitigationReportLabel({ ...task, status: status })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Periode</p>
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <CalendarDays
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">
                {task.periodLabel || "-"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Tenggat</p>
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <CalendarClock
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span><span data-date-time="">{formatDate(task.dueDate)}</span></span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Laporan Oleh
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
              <UserRound
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="min-w-0 break-words">
                {task.reportedByName ||
                  task.reportedBy ||
                  "Belum dilaporkan"}
              </span>
              {task.reportedAt ? (
                <span className="text-muted-foreground">
                  <span data-date-time="">{formatDate(task.reportedAt)}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Link Bukti
          </p>
          <div className="flex min-w-0 flex-col items-start gap-1 text-sm font-medium">
            {evidenceUrls.length > 0 ? (
              evidenceUrls.map((url) => isValidEvidenceUrl(url) ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full min-w-0 items-start gap-2 text-foreground hover:text-primary"
                  onClick={(event) => event.stopPropagation()}
                  title={url}
                  key={url}
                >
                  <Link2
                    className="size-5 shrink-0 text-muted-foreground"
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-all">{url}</span>
                  <ExternalLink
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </a>
              ) : (
                <span key={url} className="min-w-0 break-all">{url}</span>
              ))
            ) : (
              <>
                <Link2
                  className="size-5 shrink-0 text-muted-foreground"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">-</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Catatan Pelaksanaan
          </p>
          <div className="flex min-w-0 items-start gap-2 text-sm leading-6 text-foreground">
            <MessageSquare
              className="mt-0.5 size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <p className="min-w-0 whitespace-pre-wrap wrap-break-word">
              {task.notes || "Belum ada catatan pelaksanaan."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
