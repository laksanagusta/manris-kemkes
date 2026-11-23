import { useRef, useState } from "react";
import { ChevronRight } from "@/components/shared/icons";
import { riskCategoryLabels } from "@/lib/risk";
import { cn } from "@/lib/utils";
import { formatCreated } from "./data";
import { RiskDetails, RiskScore, RiskStatus, surface, type StageProps } from "./parts";

export function Pratinjau({ rows, visible }: StageProps) {
  const [activeCode, setActiveCode] = useState<string | undefined>();
  const detail = useRef<HTMLElement>(null);
  const active = rows.find((row) => row.code === activeCode) ?? rows[0];
  if (!active) return null;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <ul aria-label="Daftar risiko untuk dipratinjau" className={cn("divide-y divide-border overflow-hidden", surface)}>
        {rows.map((row) => (
          <li key={row.code}>
            <button type="button" aria-pressed={row.code === active.code} aria-controls="prototype-risk-detail" onClick={() => {
              setActiveCode(row.code);
              if (window.matchMedia("(max-width: 1023px)").matches) detail.current?.focus();
            }} className={cn("flex min-h-16 w-full items-center gap-3 border-s-2 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
              row.code === active.code ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/35")}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="whitespace-nowrap">{row.code}</span>
                  {visible.has("organization") && <span>{row.organization}</span>}
                  {visible.has("category") && <span>{riskCategoryLabels[row.category]}</span>}
                  {visible.has("created") && <time dateTime={row.created}>{formatCreated(row.created)}</time>}
                </div>
              </div>
              <div className="hidden flex-wrap items-center justify-end gap-2 min-[520px]:flex">
                {visible.has("score") && <RiskScore score={row.score} passive />}
                {visible.has("status") && <RiskStatus status={row.status} />}
              </div>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      <section ref={detail} id="prototype-risk-detail" tabIndex={-1} aria-labelledby="prototype-active-risk" className="min-w-0 rounded-(--surface-radius) focus-visible:outline-2 focus-visible:outline-ring lg:sticky lg:top-4">
        <h2 id="prototype-active-risk" className="mb-3 px-1 text-lg font-semibold tracking-tight">{active.title}</h2>
        <RiskDetails row={active} />
      </section>
    </div>
  );
}
