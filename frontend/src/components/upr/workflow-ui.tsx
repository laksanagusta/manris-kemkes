"use client";

import type { ReactNode } from "react";
import {
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody } from "@/components/ui/table";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { cn } from "@/lib/utils";

export function WorkflowTable({
  columns,
  children,
  hiddenOnMobile = [],
}: {
  columns: (string | { label: string; header: ReactNode; className?: string })[];
  children: ReactNode;
  hiddenOnMobile?: string[];
}) {
  return (
    <CollectionTableCard>
      <Table>
        <CollectionTableHeader>
          <CollectionTableHeaderRow>
            {columns.map((column, index) => {
              const label = typeof column === "string" ? column : column.label;
              const header =
                typeof column === "string" ? column : column.header;
              return (
                <CollectionTableHead
                  key={`${label}-${index}`}
                  className={cn(
                    hiddenOnMobile.includes(label) && "hidden sm:table-cell",
                    typeof column !== "string" && column.className,
                  )}
                >
                  {header}
                </CollectionTableHead>
              );
            })}
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </CollectionTableCard>
  );
}

export function WorkflowError({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>
        {message}
        {retry && (
          <Button variant="outline" size="sm" onClick={retry} className="mt-2">
            Coba lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function workflowError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Permintaan gagal. Coba lagi.";
}

export function workflowDate(value: string | null) {
  if (!value) return "—";
  return createDisplayDateFormatter("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function workflowTime(value: string | null) {
  if (!value) return "—";
  return (
    createDisplayDateFormatter("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value)) + " WIB"
  );
}

export function periodLabel(period: string) {
  const [year, cycle] = period.split("-");
  if (cycle === "H1") return `Semester I ${year}`;
  if (cycle === "H2") return `Semester II ${year}`;
  if (/^Q[1-4]$/.test(cycle ?? "")) return `Triwulan ${cycle.slice(1)} ${year}`;
  return period;
}
