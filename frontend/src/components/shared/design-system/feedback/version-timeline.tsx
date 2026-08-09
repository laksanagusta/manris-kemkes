"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type VersionTimelineItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
};

export function VersionTimeline({
  items,
  activeId,
  onSelect,
}: {
  items: ReadonlyArray<VersionTimelineItem>;
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={cn(
              "relative z-10 flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
              active
                ? "border border-primary/30 bg-accent"
                : "bg-card ring-1 ring-inset ring-border hover:bg-muted",
            )}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.title}</span>
                {active ? (
                  <Badge className="ml-1" size="micro" tone="info">
                    {item.status ?? "Current"}
                  </Badge>
                ) : null}
              </div>
              {item.description ? (
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {item.description}
                </div>
              ) : null}
            </div>
            {item.meta}
          </button>
        );
      })}
    </div>
  );
}
