"use client";
import Link from "next/link";
import { ChevronDown } from "@/components/shared/icons";
import { Card, CardContent } from "@/components/ui/card";
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
      {sections.map((section) => (
        <div key={section.key}>
          {section.total === 0 ? (
            <>
              <div className="flex min-h-11 items-center gap-2 py-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {workSectionTitles[section.key]}
                </h2>
                <span
                  className="shrink-0 text-xs tabular-nums text-tertiary-foreground"
                  aria-label="0 pekerjaan"
                >
                  0
                </span>
              </div>
            </>
          ) : (
            <Collapsible
              className="space-y-1"
              open={open[section.key]}
              onOpenChange={(value) => onOpenChange(section.key, value)}
            >
              <h2>
                <CollapsibleTrigger className="group flex min-h-11 w-full items-center gap-3 rounded-lg py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <ChevronDown
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=closed]:-rotate-90 motion-reduce:transition-none"
                    />
                    <span className="min-w-0 text-sm font-medium">
                      {workSectionTitles[section.key]}
                    </span>
                  <span
                    className="shrink-0 text-xs tabular-nums text-tertiary-foreground"
                    aria-label={`${section.total} pekerjaan`}
                  >
                    {section.total}
                  </span>
                </CollapsibleTrigger>
              </h2>
              <CollapsibleContent>
                <Card data-operator-work-card="" className="gap-0 py-0">
                <CardContent className="py-3">
                  <OperatorWorkList
                    items={section.items}
                    today={today}
                    busyKey={busyKey}
                    onOpen={onOpen}
                  />
                  {section.total > 5 ? (
                    <div className="mt-2 border-t border-dashed border-border pt-1">
                      <Link
                        href={sectionHref(section.key)}
                        onClick={onNavigate}
                        className="inline-flex min-h-8 items-center rounded-sm text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={`Lihat semua: ${workSectionTitles[section.key]}`}
                      >
                        Lihat semua ({section.total})
                      </Link>
                    </div>
                  ) : null}
                </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ))}
    </div>
  );
}
