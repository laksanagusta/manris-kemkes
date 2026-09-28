import { AlertCircle } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { IllustratedEmptyState } from "../feedback/illustrated-empty-state";

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
      <div role="status" aria-live="polite" className={cn("flex min-h-48 items-center justify-center gap-2", className)}>
        <Spinner />
        <span className="motion-safe:animate-pulse">{message}</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <Alert variant="destructive" className={cn("min-h-48", className)}>
        <AlertCircle aria-hidden="true" />
        <AlertDescription>{message}</AlertDescription>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            Coba lagi
          </Button>
        ) : null}
      </Alert>
    );
  }

  return (
    <IllustratedEmptyState
      title="Belum ada data"
      description={message}
      size="compact"
      className={cn("min-h-48", className)}
    />
  );
}
