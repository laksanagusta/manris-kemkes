"use client";

import { CalendarClock, FileText, PencilLine } from "@/components/shared/icons";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { deadlineLabel } from "@/lib/operator-work";
import { cn } from "@/lib/utils";
import type { OperatorWorkItem } from "@/types/operator-work";
import { ActionButton } from "../actions/action-button";

const taskIcons = {
  mitigation_report: FileText,
  monitoring_start: CalendarClock,
  monitoring_draft: CalendarClock,
  risk_draft: PencilLine,
};

const formatDeadline = createDisplayDateFormatter("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

export function OperatorWorkList({ items, busyKey, onOpen, today }: {
  items: OperatorWorkItem[];
  busyKey?: string | null;
  onOpen: (item: OperatorWorkItem) => void;
  today: string;
}) {
  return (
    <ul className="divide-y divide-border border-b border-border" aria-label="Daftar pekerjaan">
      {items.map((item) => {
        const Icon = taskIcons[item.kind];
        const isDraft = item.kind === "risk_draft";
        const title = item.mitigationAction || item.riskTitle;
        const context = [
          item.mitigationAction && item.riskTitle,
          !isDraft && item.riskCode,
          item.kind === "mitigation_report" && item.period,
        ].filter(Boolean).join(" · ");
        const relativeDeadline = deadlineLabel(item.dueDate, today);
        const overdue = Boolean(relativeDeadline && item.dueDate < today);
        const deadline = item.dueDate ? new Date(`${item.dueDate}T12:00:00+07:00`) : null;

        return (
          <li key={item.key} className="grid min-h-11 min-w-0 items-center gap-x-4 gap-y-1.5 py-2 text-sm @min-[44rem]/work:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8.5rem_10rem]">
            <div className="flex min-w-0 items-start gap-2">
              <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {isDraft ? (
                <button
                  type="button"
                  className="min-w-0 cursor-pointer rounded-sm text-left focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-50 pointer-coarse:min-h-11"
                  disabled={Boolean(busyKey)}
                  onClick={() => onOpen(item)}
                >
                  <span className="block wrap-break-word font-medium">{title}</span>
                  {item.riskCode ? <span className="block wrap-break-word text-xs text-muted-foreground">{item.riskCode}</span> : null}
                </button>
              ) : (
                <span className="min-w-0 wrap-break-word font-medium">{title}</span>
              )}
            </div>
            {context || item.responsibility === "unit" ? (
              <div className="min-w-0 wrap-break-word pl-6 text-sm text-muted-foreground @min-[44rem]/work:pl-0">
                {context ? <p>{context}</p> : null}
                {item.responsibility === "unit" ? <p>Perlu ditangani unit</p> : null}
              </div>
            ) : null}
            {deadline && Number.isFinite(deadline.getTime()) ? (
              <div className={cn(
                "pl-6 @min-[44rem]/work:col-start-3 @min-[44rem]/work:row-start-1 @min-[44rem]/work:pl-0",
                overdue ? "text-destructive" : "text-muted-foreground",
              )}>
                <time dateTime={item.dueDate} data-date-time="">{formatDeadline.format(deadline)}</time>
                {item.kind === "mitigation_report" && relativeDeadline ? (
                  <p className="text-xs">{relativeDeadline}</p>
                ) : null}
              </div>
            ) : null}
            {!isDraft ? (
              <div className="pl-6 @min-[44rem]/work:col-start-4 @min-[44rem]/work:row-start-1 @min-[44rem]/work:pl-0">
                <ActionButton
                  size="sm"
                  className="h-auto min-h-8 max-w-full whitespace-normal text-left pointer-coarse:min-h-11 @min-[44rem]/work:w-full"
                  disabled={Boolean(busyKey)}
                  loading={busyKey === item.key}
                  onClick={() => onOpen(item)}
                >
                  {item.kind === "mitigation_report" && overdue ? "Lapor terlambat" : item.actionLabel}
                </ActionButton>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
