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
  itemHref,
  onNavigate,
}: {
  sections: OperatorWorkSection[];
  open: WorkUIState["open"];
  onOpenChange: (key: OperatorWorkSection["key"], value: boolean) => void;
  today: string;
  itemHref: (item: OperatorWorkItem) => string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <OperatorMonitoringPeriod today={today} />
      <Card className="gap-0 py-0">
        <h2 className="flex min-h-12 items-center border-b border-border px-(--card-spacing) py-3 text-sm font-semibold">
          Pekerjaan saya
        </h2>
        <div className="divide-y divide-border">
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
                <h3 key={section.key} className="flex min-h-11 items-center gap-2 px-(--card-spacing) py-2 text-sm text-muted-foreground">
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
                  <CollapsibleTrigger className="group flex min-h-11 w-full cursor-pointer items-center gap-2 px-(--card-spacing) py-2 text-start text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    {heading}
                    <ChevronDown
                      aria-hidden
                      className="ms-auto size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]:-rotate-90 motion-reduce:transition-none"
                    />
                  </CollapsibleTrigger>
                </h3>
                <CollapsibleContent className="me-(--card-spacing) ms-[calc(var(--card-spacing)+--spacing(4))] pb-2">
                  <OperatorWorkList
                    items={section.items}
                    itemHref={itemHref}
                    onNavigate={onNavigate}
                  />
                  {section.total > 5 ? (
                    <Link
                      href={sectionHref(section.key)}
                      onNavigate={onNavigate}
                      className="flex min-h-9 items-center border-t border-border py-2 text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11"
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
