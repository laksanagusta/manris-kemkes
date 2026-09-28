import type { RiskCategory } from "@/types/risk";
import { cn } from "@/lib/utils";
import { riskCategoryColors, riskCategoryLabels } from "@/lib/risk";

const fallbackColor = "var(--muted-foreground)";

export function RiskCategoryIndicator({
  category,
  className,
}: {
  category?: RiskCategory | string | null;
  className?: string;
}) {
  const normalizedCategory = category?.trim().toLowerCase() ?? "";
  const categoryKey = normalizedCategory as RiskCategory;
  const label =
    riskCategoryLabels[categoryKey] ??
    (normalizedCategory || "Belum dikategorikan");
  const color =
    riskCategoryColors[categoryKey as Exclude<RiskCategory, "">] ??
    fallbackColor;

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
      title={label}
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
