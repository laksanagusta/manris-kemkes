import { AlertCircle } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

type OverviewPanelStateProps = {
  state: "loading" | "error" | "empty";
  message: string;
  className?: string;
  onRetry?: () => void;
};

export function OverviewPanelState({
  state,
  message,
  className,
  onRetry,
}: OverviewPanelStateProps) {
  if (state === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex min-h-48 items-center justify-center rounded-lg bg-muted/25 px-6 text-center text-sm text-muted-foreground",
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
          "flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-6 text-center text-sm text-destructive",
          className,
        )}
      >
        <span className="inline-flex max-w-sm items-center gap-2">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {message}
        </span>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRetry}
          >
            Coba lagi
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {message}
    </div>
  );
}
