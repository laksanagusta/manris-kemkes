"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "@/components/ui/icons";
import type { WorkingPaperTimelineItem } from "@/lib/working-paper-detail-view-model";

const timelineStatusTone = {
  signed: "success",
  current: "progress",
  upcoming: "neutral",
  skipped: "warning",
} as const;

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value?: string) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}

export function WorkingPaperSignatureTimeline({
  timeline,
}: {
  timeline: WorkingPaperTimelineItem[];
}) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Belum ada penandatangan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {timeline.map((item, index) => {
        const isLast = index === timeline.length - 1;
        const isSigned = item.state === "signed";
        const isCurrent = item.state === "current";
        const isFuture = item.state === "upcoming";
        const sig = item.signatory;

        return (
          <div
            key={sig.id}
            className={cn("flex gap-3", isFuture && "opacity-75")}
          >
            <div className="flex flex-col items-center">
              <div className="mt-1 shrink-0">
                {isSigned ? (
                  <div className="flex size-6 items-center justify-center rounded-full border border-success/30 bg-success/20">
                    <CheckCircle2 className="size-4 text-success" />
                  </div>
                ) : isCurrent ? (
                  <div className="flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                    <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                  </div>
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full border border-border bg-muted">
                    <Circle className="size-3 text-muted-foreground" />
                  </div>
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-4 -mb-1",
                    isSigned
                      ? "bg-success"
                      : isCurrent
                        ? "bg-primary/30"
                        : "bg-border",
                  )}
                />
              )}
            </div>

            <div
              className={cn(
                "min-w-0 flex-1",
                !isLast ? "pb-6" : "pb-0",
              )}
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold leading-none">
                    {sig.signer_name}
                  </p>
                  <Badge
                    size="micro"
                    tone={timelineStatusTone[item.state]}
                    className="font-semibold"
                  >
                    {item.label}
                  </Badge>
                </div>

                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {[sig.signer_jabatan, sig.signer_pangkat]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <p className="text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>

              {sig.signed_at ? (
                <Badge
                  tone="success"
                  className="mt-2 h-6 gap-1.5 px-2 text-xs font-medium"
                >
                  <CheckCircle2 className="size-3.5" />
                  Tercatat pada {formatDateTime(sig.signed_at)}
                </Badge>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
