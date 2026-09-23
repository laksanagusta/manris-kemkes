"use client";

import type { ReactNode } from "react";

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
    <div className="relative pl-6">
      <div className="space-y-5">
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative block w-full rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            >
              {index < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[30px] -left-[16px] top-[10px] z-0 w-px bg-border/70"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute -left-[22px] top-1 z-10 size-3 rounded-full border-2",
                  active
                    ? "border-emerald-600 bg-emerald-600"
                    : "border-muted-foreground bg-muted-foreground",
                )}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                  {item.status ? (
                    <span className="text-xs text-muted-foreground">
                      {item.status}
                    </span>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                {item.meta ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {item.meta}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
