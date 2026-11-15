import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingProps = { message?: string; className?: string };
type RowsProps = LoadingProps & { rows?: number };

function LoadingRegion({ message = "Memuat data…", className, children }: LoadingProps & { children: ReactNode }) {
  return (
    <div data-motion-feedback-state className={cn("min-w-0", className)}>
      <span role="status" className="sr-only">{message}</span>
      {children}
    </div>
  );
}

const rowWidths = ["w-4/5", "w-3/5", "w-2/3", "w-full"];

function PlaceholderLines({ rows }: { rows: number }) {
  return Array.from({ length: rows }, (_, index) => (
    <Skeleton key={index} className={cn("h-3.5", rowWidths[index % rowWidths.length])} />
  ));
}

export function TableLoadingSkeleton({ rows = 4, ...props }: RowsProps) {
  return (
    <LoadingRegion {...props}>
      <div aria-hidden="true" className="divide-y divide-border overflow-hidden rounded-lg">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid min-h-12 grid-cols-[2fr_1fr] items-center gap-4 px-4 sm:grid-cols-[2fr_1fr_1fr_1fr]">
            <Skeleton className={cn("h-3.5", rowWidths[index % rowWidths.length])} />
            <Skeleton className="h-3.5 w-4/5 max-w-24" />
            <Skeleton className="hidden h-3.5 w-4/5 max-w-20 sm:block" />
            <Skeleton className="hidden h-5 w-4/5 max-w-16 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function FormLoadingSkeleton({ rows = 4, singleColumn, ...props }: RowsProps & { singleColumn?: boolean }) {
  return (
    <LoadingRegion {...props}>
      <div aria-hidden="true" className={cn("grid gap-5 rounded-lg border border-border bg-card p-4 sm:p-5", !singleColumn && "sm:grid-cols-2")}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3.5 w-24 max-w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function DetailLoadingSkeleton({ rows = 4, ...props }: RowsProps) {
  return (
    <LoadingRegion {...props}>
      <div aria-hidden="true" className="space-y-5 rounded-lg border border-border bg-card p-4 sm:p-5">
        <Skeleton className="h-5 w-40 max-w-full" />
        <PlaceholderLines rows={rows} />
      </div>
    </LoadingRegion>
  );
}

export function CardsLoadingSkeleton({ message, className, count = 4 }: LoadingProps & { count?: number }) {
  return (
    <LoadingRegion message={message} className={className}>
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3.5 w-3/4 max-w-32" />
            <Skeleton className="h-7 w-16 max-w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ChartLoadingSkeleton({ message, className }: LoadingProps) {
  return (
    <LoadingRegion message={message}>
      <Skeleton className={cn("min-h-32 w-full", className)} />
    </LoadingRegion>
  );
}

export function TextLoadingSkeleton({ rows = 4, ...props }: RowsProps) {
  return (
    <LoadingRegion {...props}>
      <div aria-hidden="true" className="space-y-3">
        <PlaceholderLines rows={rows} />
      </div>
    </LoadingRegion>
  );
}

export function PageLoadingSkeleton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("w-full min-w-0 space-y-6", className)}>
      <div aria-hidden="true" className="space-y-2">
        <Skeleton className="h-7 w-48 max-w-full" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      {children}
    </div>
  );
}

export function AuthLoadingSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-8">
      <PageLoadingSkeleton className={wide ? "max-w-[560px]" : "max-w-[400px]"}>
        <FormLoadingSkeleton message="Memuat halaman…" singleColumn={!wide} />
      </PageLoadingSkeleton>
    </div>
  );
}
