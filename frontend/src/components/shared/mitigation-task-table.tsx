"use client";

import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { CreatedAtCell } from "./design-system/collections/collection-created-at";
import { useRef } from "react";
import type { MitigationTask } from "@/types/risk";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActionIconButton,
  CollectionEmptyState,
} from "@/components/shared/design-system";
import {
  MitigationCollectionTable,
  treatmentTableColumns,
} from "./design-system/collections/mitigation-collection-table";
import { FileText, Send } from "@/components/shared/icons";
import { getMitigationTaskReportAction } from "@/lib/mitigation-reporting";
import { getMitigationReportLabel } from "@/lib/mitigation-report-status";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";

function formatDeadline(value: string) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? createDisplayDateFormatter("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(date)
    : "—";
}

export function MitigationTaskTable<T extends MitigationTask>({
  tasks,
  readOnly = false,
  showCreatedAt = false,
  onOpenDetail,
  onReport,
}: {
  tasks: readonly T[];
  readOnly?: boolean;
  showCreatedAt?: boolean;
  onOpenDetail: (task: T, trigger: HTMLButtonElement) => void;
  onReport: (task: T, trigger: HTMLButtonElement) => void;
}) {
  const baseColumns = readOnly
    ? treatmentTableColumns
        .filter((column) => !column.action)
        .map((column) =>
          column.key === "plan" ? { ...column, width: "34%" } : column,
        )
    : treatmentTableColumns;
  const columns = showCreatedAt
    ? [...baseColumns.filter(column => !column.action), { key: "created_at", label: "Dibuat", width: "16%" }, ...baseColumns.filter(column => column.action)]
    : baseColumns;
  return (
    <MitigationCollectionTable columns={columns}>
      <TableBody>
        {tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length}>
              <CollectionEmptyState
                title="Tidak ada task yang sesuai"
                description="Coba ubah kata kunci atau filter pencarian."
              />
            </TableCell>
          </TableRow>
        ) : (
          tasks.map((task) => {
            const state = getMitigationTaskReportAction(task);
            const status = state.isOverdue ? "overdue" : task.status;
            const tone =
              status === "done"
                ? "success"
                : status === "overdue" || status === "not_reported"
                  ? "danger"
                  : "progress";
            return (
              <TableRow
                key={task.id}
                className="group hover:bg-transparent hover:[&>td]:bg-muted/50 [&>td]:transition-[background-color]"
              >
                <TableCell><CollectionCode code={task.riskCode} href={task.riskId ? `/risk/register/${task.riskId}` : undefined} /></TableCell>
                <TableCell className="align-middle">
                  <button
                    type="button"
                    title={task.mitigationAction}
                    onClick={(event) => onOpenDetail(task, event.currentTarget)}
                    className="block w-full min-w-0 rounded-control text-left text-sm font-medium leading-5 text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="block truncate">
                      {task.mitigationAction || "—"}
                    </span>
                  </button>
                </TableCell>
                <TableCell className="align-middle">
                  <p className="truncate text-sm font-medium">
                    {task.mitigationOwner || "—"}
                  </p>
                </TableCell>
                <TableCell className="align-middle">
                  <span>
                    {task.periodLabel || "—"}
                  </span>
                </TableCell>
                <TableCell className="align-middle">
                  <span data-date-time="">{formatDeadline(task.dueDate)}</span>
                </TableCell>
                <TableCell className="align-middle">
                  <Badge
                    variant={toBadgeVariant(tone)}
                    className={getStatusBadgeClassName(tone)}
                  >
                    {getMitigationReportLabel({ ...task, status })}
                  </Badge>
                </TableCell>
                {showCreatedAt && <CreatedAtCell record={task} />}
                {!readOnly && (
                  <TableCell data-collection-action="" className="text-center">
                    <MitigationTaskActions
                      task={task}
                      state={state}
                      onReport={state.allowed ? onReport : onOpenDetail}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </MitigationCollectionTable>
  );
}

function MitigationTaskActions<T extends MitigationTask>({
  task,
  state,
  onReport,
}: {
  task: T;
  state: ReturnType<typeof getMitigationTaskReportAction>;
  onReport: (task: T, trigger: HTMLButtonElement) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionIconButton
          type="button"
          ref={trigger}
          className="text-muted-foreground"
          aria-label={`Aksi penanganan ${task.mitigationAction}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => {
            if (trigger.current) onReport(task, trigger.current);
          }}
        >
          {state.allowed ? <Send className="size-3.5" /> : <FileText className="size-3.5" />}
          {state.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
