import type { ReactNode } from "react";

export function OverviewDashboardLayout({
  trend,
  heatmap,
  composition,
  categories,
}: {
  trend: ReactNode;
  heatmap: ReactNode;
  composition: ReactNode;
  categories: ReactNode;
}) {
  return (
    <section
      aria-label="Widget risiko"
      className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0 [&>div>*]:h-full"
    >
      <div>{trend}</div>
      <div>{heatmap}</div>
      <div>{composition}</div>
      <div>{categories}</div>
    </section>
  );
}
