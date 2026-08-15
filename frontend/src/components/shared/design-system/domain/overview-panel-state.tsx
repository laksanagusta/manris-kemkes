import { AlertCircle } from "@/components/ui/icons";

import { cn } from "@/lib/utils";

type OverviewPanelStateProps = {
  state: "loading" | "error" | "empty";
  message: string;
  className?: string;
};

export function OverviewPanelState({
  state,
  message,
  className,
}: OverviewPanelStateProps) {
  if (state === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex min-h-48 items-center justify-center rounded-xl bg-muted/25 px-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <span className="motion-safe:animate-pulse">{message}</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        role="alert"
        className={cn(
          "flex min-h-48 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 text-center text-sm text-destructive",
          className,
        )}
      >
        <span className="inline-flex max-w-sm items-center gap-2">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {message}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {message}
    </div>
  );
}
