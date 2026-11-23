import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { riskCategoryLabels } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { formatCreated } from "./data";
import { RiskRowMenu, RiskScore, RiskStatus, surface, titleButton, type StageProps } from "./parts";

export function Ringkas({ rows, visible, onOpen }: StageProps) {
  return (
    <ul aria-label="Daftar ringkas risiko" className={cn("divide-y divide-border", surface)}>
      {rows.map((row) => (
        <li key={row.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0">
            <button type="button" className={titleButton} onClick={() => onOpen(row)}>{row.title}</button>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <CollectionCode code={row.code} />
              {visible.has("category") && <span>{riskCategoryLabels[row.category]}</span>}
              {visible.has("organization") && <span>{row.organization}</span>}
              {visible.has("created") && <time dateTime={row.created}>{formatCreated(row.created)}</time>}
            </div>
          </div>
          <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:row-start-auto sm:gap-5">
            {visible.has("score") && <RiskScore score={row.score} />}
            {visible.has("status") && <RiskStatus status={row.status} />}
          </div>
          <div className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto"><RiskRowMenu row={row} onOpen={onOpen} /></div>
        </li>
      ))}
    </ul>
  );
}
