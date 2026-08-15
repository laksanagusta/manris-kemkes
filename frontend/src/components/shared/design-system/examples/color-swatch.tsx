"use client";

export function DesignSystemColorSwatch({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 shadow-none">
      <div
        className="size-8 shrink-0 rounded-md ring-1 ring-inset ring-border"
        style={{ backgroundColor: value }}
      />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{name}</p>
        <p className="text-[11px] font-mono text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
