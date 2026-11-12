import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GitBranch } from "@/components/shared/icons";
import { createDisplayDateFormatter } from "@/lib/display-date";
import type { RiskCharter } from "@/types/risk-charter";

export function RiskCharterCard({ charter, organizationName, statusLabel, levelLabel, actions }: {
  charter: Pick<RiskCharter, "id" | "title" | "createdAt" | "versionNumber">;
  organizationName: string;
  statusLabel: string;
  levelLabel: string;
  actions?: ReactNode;
}) {
  const date = new Date(charter.createdAt);
  const validDate = Number.isFinite(date.getTime());
  const context = `${levelLabel} · v${charter.versionNumber} · ${statusLabel} · ${organizationName}`;
  return (
    <Card data-risk-charter-card="" className="relative w-[277px] max-w-full gap-0 rounded-2xl [--surface-radius:--spacing(4)] p-4 shadow-(--surface-shadow-low) ring-0">
      <CardContent className="flex min-h-24 flex-col justify-between p-0">
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden="true" title={context} className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-yellow-200 text-zinc-900 dark:bg-yellow-300"><GitBranch className="size-4" /></span>
          {actions ? <div className="relative z-10 -mt-1 -me-1">{actions}</div> : null}
        </div>
        <div className="min-w-0 pt-3">
          <h2 className="min-w-0 text-sm font-medium leading-5 tracking-tight">
            <Link href={`/management/charters/${charter.id}`} title={`${charter.title} · ${context}`} className="block truncate text-primary outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
              {charter.title}<span className="sr-only"> · {context}</span>
            </Link>
          </h2>
          <div className="flex min-w-0 items-center justify-between gap-2 pt-1 text-xs leading-[18px] text-muted-foreground">
            <time className="shrink-0" dateTime={validDate ? date.toISOString() : undefined}>{validDate ? createDisplayDateFormatter("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date) : "—"}</time>
            <span className="min-w-0 truncate text-end" title={organizationName}>{organizationName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
