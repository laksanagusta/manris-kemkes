"use client";
import type { OperatorWorkItem } from "@/types/operator-work";
import { Card, CardContent } from "@/components/ui/card";
import { ActionButton } from "../actions/action-button";
import { Badge } from "@/components/ui/badge";

export function OperatorWorkList({ items, busyKey, onOpen, today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()) }: {
  items: OperatorWorkItem[]; busyKey?: string | null; onOpen: (item: OperatorWorkItem) => void; today?: string;
}) {
  return <Card><CardContent><ul className="divide-y divide-border" aria-label="Daftar pekerjaan">
    {items.map(item => <li key={item.key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{item.riskTitle}</p>
        <p className="text-sm text-muted-foreground">{item.actionLabel} · {item.responsibility === "personal" ? "Untuk saya" : "Perlu ditangani unit"}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.riskCode ? <span>{item.riskCode}</span> : null}{item.period ? <span>{item.period}</span> : null}
          {item.dueDate ? <span>Tenggat {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${item.dueDate}T12:00:00+07:00`))}</span> : <span>Tanpa tenggat</span>}
          {item.dueDate && item.dueDate < today ? <Badge variant="destructive">Terlambat</Badge> : null}
        </div>
      </div>
      <ActionButton variant="outline" className="shrink-0" disabled={Boolean(busyKey)} loading={busyKey === item.key} onClick={() => onOpen(item)}>{item.actionLabel}</ActionButton>
    </li>)}
  </ul></CardContent></Card>;
}
