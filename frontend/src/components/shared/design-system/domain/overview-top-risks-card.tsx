"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { StandardCard } from "../layout/standard-card";
import { cn } from "@/lib/utils";

export function OverviewTopRisksCard({
  risks,
}: {
  risks: ReadonlyArray<{
    id: string;
    code: string;
    title: string;
    orgName: string;
    score: number;
    levelClass: string;
    href: string;
  }>;
}) {
  return (
    <StandardCard title="Risiko Teratas" contentClassName="px-4 pb-4 pt-0">
        <div className="-mx-4 divide-y divide-border/40">
          {risks.map((risk) => (
            <Link
              key={risk.id}
              href={risk.href}
              className="group/risk flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 outline-none transition-[background-color,transform] duration-150 hover:bg-muted/30 active:scale-[0.995] focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-mono font-semibold text-muted-foreground">
                    {risk.code}
                  </span>
                  <span
                    className={cn(
                      "inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold",
                      risk.levelClass,
                    )}
                  >
                    {risk.score}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-foreground">
                  {risk.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {risk.orgName}
                </p>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover/risk:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          ))}
        </div>
    </StandardCard>
  );
}
