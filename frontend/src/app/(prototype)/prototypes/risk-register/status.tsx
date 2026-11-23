import { ChevronDown } from "@/components/shared/icons";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { riskCategoryLabels } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { formatCreated, riskStatuses, type RiskRow } from "./data";
import { RiskRowMenu, RiskScore, surface, titleButton, type StageProps } from "./parts";

const lanes = ["draft", "final"] satisfies RiskRow["status"][];

export function Status({ rows, visible, onOpen }: StageProps) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      {lanes.map((status) => {
        const group = rows.filter((row) => row.status === status);
        return (
          <details key={status} open className={cn("group", surface)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-t-(--surface-radius) bg-table-header px-4 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span>{riskStatuses[status]}</span>
              <span aria-label={`${group.length} risiko pada halaman ini`} className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">{group.length}</span>
              <ChevronDown aria-hidden="true" className="ml-auto size-4 -rotate-90 text-muted-foreground group-open:rotate-0" />
            </summary>
            {group.length ? (
              <ul className="divide-y divide-border border-t border-border">
                {group.map((row) => (
                  <li key={row.code} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <CollectionCode code={row.code} />
                        {visible.has("category") && <span>{riskCategoryLabels[row.category]}</span>}
                      </div>
                      <button type="button" className={titleButton} onClick={() => onOpen(row)}>{row.title}</button>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {visible.has("organization") && <span>{row.organization}</span>}
                        {visible.has("created") && <time dateTime={row.created}>{formatCreated(row.created)}</time>}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 max-sm:max-w-28">
                      {visible.has("score") && <RiskScore score={row.score} />}
                      <RiskRowMenu row={row} onOpen={onOpen} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="border-t border-border px-4 py-5 text-sm text-muted-foreground">Tidak ada risiko di halaman ini.</p>}
          </details>
        );
      })}
    </div>
  );
}
