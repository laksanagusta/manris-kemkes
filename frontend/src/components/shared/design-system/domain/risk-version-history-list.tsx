import Link from "next/link";
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
      {versions.map((version, index) => {
        const date = new Date(version.createdAt);
        const validDate = Number.isFinite(date.getTime());
        const label = version.versionNumber ? `Versi ${version.versionNumber}` : "Versi";
        const title = version.title && version.title !== "-" ? `${label} · ${version.title}` : label;
        const context = [version.assessmentCycle, version.changeReason].filter(Boolean).join(" · ");
        return (
          <li key={version.id} data-version-history-item className="relative pb-4 ps-6 last:pb-0">
            {index < versions.length - 1 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1 start-[7.5px] top-4 w-px bg-muted-foreground/25"
              />
            )}
            <span aria-hidden="true" className="absolute start-1 top-1.5 size-2 rounded-full bg-muted-foreground/40" />
            <Link
              href={`/risk/register/new?id=${version.id}`}
              onClick={(event) => onVersionSelect?.(version.id, event)}
              aria-current={version.isCurrent ? "page" : undefined}
              title={context || undefined}
              className="group/version block min-w-0 rounded-sm text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block wrap-anywhere font-normal text-secondary-foreground underline-offset-4 group-hover/version:underline">{title}</span>
              <time dateTime={validDate ? date.toISOString() : undefined} className="mt-1 block text-muted-foreground">
                {validDate ? formatDisplayDate(date, {
                  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
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
