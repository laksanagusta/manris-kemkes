"use client";
import Link from "next/link";
import { ChevronDown } from "@/components/shared/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { sectionHref, workSectionTitles } from "@/lib/operator-work";
import type { WorkUIState } from "@/lib/operator-work";
import type { OperatorWorkItem, OperatorWorkSection } from "@/types/operator-work";
import { OperatorWorkList } from "./operator-work-list";

export function OperatorWorkSections({sections, open, onOpenChange, today, busyKey, onOpen, onNavigate}: {
 sections: OperatorWorkSection[]; open: WorkUIState["open"]; onOpenChange: (key: OperatorWorkSection["key"], value: boolean) => void;
 today: string; busyKey?: string | null; onOpen: (item: OperatorWorkItem) => void; onNavigate?: () => void;
}) {
 return <div className="space-y-3">{sections.map(section => <Card key={section.key} className="gap-0 py-0">
  {section.total === 0 ? <div className="flex min-h-11 items-center justify-between gap-3 px-(--card-spacing) py-2">
   <h2 className="text-base font-medium text-muted-foreground">{workSectionTitles[section.key]}</h2><span className="text-sm tabular-nums text-muted-foreground" aria-label="0 pekerjaan">0</span>
  </div> : <Collapsible open={open[section.key]} onOpenChange={value => onOpenChange(section.key,value)}>
   <h2><CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-(--card-spacing) py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span className="flex min-w-0 flex-1 items-center gap-2"><span className="text-base font-medium">{workSectionTitles[section.key]}</span><ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]:-rotate-90 motion-reduce:transition-none" /></span>
    <span className="text-sm tabular-nums text-muted-foreground" aria-label={`${section.total} pekerjaan`}>{section.total}</span>
   </CollapsibleTrigger></h2>
   <CollapsibleContent>
    <CardContent className="pt-0 pb-3">
     <OperatorWorkList items={section.items} today={today} busyKey={busyKey} onOpen={onOpen} />
     {section.total > 5 ? <div className="mt-2 border-t border-dashed border-border pt-1"><Link href={sectionHref(section.key)} onClick={onNavigate} className="inline-flex min-h-8 items-center rounded-sm text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring" aria-label={`Lihat semua: ${workSectionTitles[section.key]}`}>Lihat semua ({section.total})</Link></div> : null}
    </CardContent>
   </CollapsibleContent>
  </Collapsible>}
 </Card>)}</div>;
}
