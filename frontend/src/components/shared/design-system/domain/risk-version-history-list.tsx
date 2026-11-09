import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MouseEvent } from "react";
import { formatDisplayDate } from "@/lib/display-date";
import type { RiskVersionTimelineItem } from "@/types/risk";

type VersionHistoryEntry = Pick<RiskVersionTimelineItem,
  "id" | "versionNumber" | "title" | "createdAt" | "assessmentCycle" | "changeReason" | "isCurrent"
>;

export function RiskVersionHistoryList({ versions, onVersionSelect }: {
  versions: VersionHistoryEntry[];
  onVersionSelect?: (versionId: string, event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <ol aria-label="Riwayat versi risiko" className="min-w-0">
      {versions.map((version) => {
        const validDate = Number.isFinite(new Date(version.createdAt).getTime());
        const label = version.versionNumber ? `Versi ${version.versionNumber}` : "Versi";
        const context = [version.title, version.assessmentCycle, version.changeReason].filter(Boolean).join(" · ");
        return (
          <li key={version.id} data-version-history-item className="relative pb-5 ps-5 last:pb-0">
            <span aria-hidden="true" className={cn("absolute start-0 top-1 size-2.5 rounded-full", version.isCurrent ? "bg-success" : "bg-border")} />
            <Link
              href={`/risk/register/new?id=${version.id}`}
              onClick={(event) => onVersionSelect?.(version.id, event)}
              aria-current={version.isCurrent ? "page" : undefined}
              title={context || undefined}
              className="block min-w-0 rounded-sm text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn("block font-normal", version.isCurrent ? "text-primary" : "text-secondary-foreground")}>{label}</span>
              <time dateTime={validDate ? new Date(version.createdAt).toISOString() : undefined} className="mt-0.5 block text-sm leading-5 text-muted-foreground">
                {validDate ? formatDisplayDate(new Date(version.createdAt), {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
                }) : "—"}
              </time>
              {context ? <span className="sr-only">{context}</span> : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
