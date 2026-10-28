"use client";
import type { OperatorWorkItem } from "@/types/operator-work";
import { deadlineLabel } from "@/lib/operator-work";
import { ActionButton } from "../actions/action-button";
import { Badge } from "@/components/ui/badge";

export function OperatorWorkList({ items, busyKey, onOpen, today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()) }: {
 items: OperatorWorkItem[]; busyKey?: string | null; onOpen: (item: OperatorWorkItem) => void; today?: string;
}) {
 return <ul className="divide-y divide-border" aria-label="Daftar pekerjaan">
  {items.map(item => <li key={item.key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
   <div className="min-w-0 space-y-1">
    <p className="text-sm font-medium text-foreground wrap-break-word">{item.mitigationAction || item.riskTitle}</p>
    {item.mitigationAction ? <p className="text-sm text-muted-foreground wrap-break-word">{item.riskTitle}</p> : null}
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
     {item.riskCode ? <span>{item.riskCode}</span> : null}
     {item.period ? <span>{item.period}</span> : null}
     <span>{item.responsibility === "personal" ? "Untuk saya" : "Perlu ditangani unit"}</span>
     {item.dueDate ? <span>Tenggat {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${item.dueDate}T12:00:00+07:00`))}</span> : null}
    </div>
    {item.kind === "mitigation_report" && item.dueDate ? <p className="text-xs"><Badge variant={item.dueDate < today ? "destructive" : "secondary"}>{deadlineLabel(item.dueDate,today)}</Badge></p> : null}
   </div>
   <ActionButton variant="outline" className="shrink-0 self-start sm:self-center" disabled={Boolean(busyKey)} loading={busyKey === item.key} onClick={() => onOpen(item)}>{item.actionLabel}</ActionButton>
  </li>)}
 </ul>;
}
