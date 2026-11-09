"use client";

import Link from "next/link";
import { ChevronDown } from "@/components/shared/icons";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { sectionHref, workSectionTitles } from "@/lib/operator-work";
import type { WorkUIState } from "@/lib/operator-work";
import type {
  OperatorWorkItem,
  OperatorWorkSection,
} from "@/types/operator-work";
import { OperatorWorkList } from "./operator-work-list";
import { OperatorMonitoringPeriod } from "./operator-monitoring-period";

export function OperatorWorkSections({
  sections,
  open,
  onOpenChange,
  today,
  busyKey,
  onOpen,
  onNavigate,
}: {
  sections: OperatorWorkSection[];
  open: WorkUIState["open"];
  onOpenChange: (key: OperatorWorkSection["key"], value: boolean) => void;
  today: string;
  busyKey?: string | null;
  onOpen: (item: OperatorWorkItem) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-4">
      <OperatorMonitoringPeriod today={today} />
      <Card className="@container/work gap-0 py-0">
        <h2 className="flex min-h-11 items-center border-b border-border px-4 py-2 text-sm font-semibold">
          Pekerjaan saya
        </h2>
        <div className="px-3 py-1">
          {sections.map((section) => {
            const title = workSectionTitles[section.key];
            const heading = (
              <>
                <span className="min-w-0">{title}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-label={`${section.total} pekerjaan`}>
                  {section.total}
                </span>
              </>
            );

            if (section.total === 0) {
              return (
                <h3 key={section.key} className="flex min-h-9 items-center gap-2 py-2 pl-8 text-sm font-medium">
                  {heading}
                </h3>
              );
            }

            return (
              <Collapsible
                key={section.key}
                open={open[section.key]}
                onOpenChange={(value) => onOpenChange(section.key, value)}
              >
                <h3>
                  <CollapsibleTrigger className="group flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring pointer-coarse:min-h-11">
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]:-rotate-90 motion-reduce:transition-none"
                    />
                    {heading}
                  </CollapsibleTrigger>
                </h3>
                <CollapsibleContent>
                  <OperatorWorkList
                    items={section.items}
                    today={today}
                    busyKey={busyKey}
                    onOpen={onOpen}
                  />
                  {section.total > 5 ? (
                    <Link
                      href={sectionHref(section.key)}
                      onClick={onNavigate}
                      className="inline-flex min-h-9 items-center rounded-sm py-1 pl-6 text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11"
                      aria-label={`Lihat semua: ${title}`}
                    >
                      Lihat semua ({section.total})
                    </Link>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
