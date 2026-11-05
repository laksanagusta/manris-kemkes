"use client";
import type { OperatorWorkItem } from "@/types/operator-work";
import { deadlineLabel } from "@/lib/operator-work";
import { ActionButton } from "../actions/action-button";
import { Badge } from "@/components/ui/badge";

export function OperatorWorkList({ items, busyKey, onOpen, today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()) }: {
 items: OperatorWorkItem[]; busyKey?: string | null; onOpen: (item: OperatorWorkItem) => void; today?: string;
}) {
 return <ul className="divide-y divide-dashed divide-border" aria-label="Daftar pekerjaan">
  {items.map(item => <li key={item.key} className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
   <div className="min-w-0 space-y-0.5">
    {item.kind === "risk_draft" ? (
     <button type="button" className="flex min-h-7 pointer-coarse:min-h-11 cursor-pointer flex-col gap-0.5 rounded-sm text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50" disabled={Boolean(busyKey)} onClick={() => onOpen(item)}>
      {item.riskCode ? <span className="font-medium text-primary wrap-break-word">{item.riskCode}</span> : null}
      <span className="text-tertiary-foreground wrap-break-word">{item.riskTitle}</span>
     </button>
    ) : <>
     {item.riskCode ? <p className="text-sm font-medium text-primary wrap-break-word">{item.riskCode}</p> : null}
     <p className="text-sm text-tertiary-foreground wrap-break-word">{item.riskTitle}</p>
    </>}
    {item.mitigationAction ? <p className="text-sm text-foreground wrap-break-word">{item.mitigationAction}</p> : null}
    {item.responsibility === "unit" || item.dueDate ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
     {item.responsibility === "unit" ? <span>Perlu ditangani unit</span> : null}
     {item.dueDate ? <span>Tenggat {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${item.dueDate}T12:00:00+07:00`))}</span> : null}
    </div> : null}
    {item.kind === "mitigation_report" && item.dueDate ? <p className="text-sm"><Badge className="text-sm" variant={item.dueDate < today ? "destructive" : "secondary"}>{deadlineLabel(item.dueDate,today)}</Badge></p> : null}
   </div>
   {item.kind !== "risk_draft" ? <ActionButton variant="outline" className="shrink-0 self-start sm:w-44 sm:self-center" disabled={Boolean(busyKey)} loading={busyKey === item.key} onClick={() => onOpen(item)}>{item.actionLabel}</ActionButton> : null}
  </li>)}
 </ul>;
}
