"use client";

import { AlertCircle, ArrowUpRight } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";

export function CollectionErrorState({
  title = "Gagal Memuat Data",
  message,
  onReload,
}: {
  title?: string;
  message?: string;
  onReload?: () => void;
}) {
  return (
    <div className="rounded-lg bg-state-surface px-4 py-4 text-sm text-state-foreground">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="font-semibold text-destructive">{title}</p>
          {message && <p className="text-sm text-state-foreground">{message}</p>}
          {onReload && (
            <Button
              onClick={onReload}
              variant="outline"
              className="mt-2 gap-2 border-destructive/20 bg-background text-destructive shadow-none hover:bg-destructive/5"
            >
              <ArrowUpRight className="size-4" />
              Coba lagi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
