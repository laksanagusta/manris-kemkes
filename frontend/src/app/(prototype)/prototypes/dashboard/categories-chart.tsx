import { useState } from "react";
import { Pie, PieChart, Sector, type PieSectorShapeProps } from "recharts";
import { StandardCard } from "@/components/shared/design-system";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { categoryData, current } from "./data";

const config = { value: { label: "Risiko", color: "var(--muted-foreground)" } };
const share = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function CategoriesChart() {
  const [active, setActive] = useState(0);

  return (
    <StandardCard
      title={<span className="text-sm">Distribusi Kategori Risiko</span>}
      className="h-full min-w-0"
      contentClassName="flex flex-1 flex-col gap-4"
    >
      <div className="flex flex-1 items-center justify-center">
        <ChartContainer config={config} className="aspect-square w-full max-w-[15rem]">
          <PieChart accessibilityLayer>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              innerRadius="49%"
              outerRadius="77%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={3}
              isAnimationActive={false}
              onClick={(_, index) => setActive(index)}
              shape={({ index, outerRadius = 0, ...props }: PieSectorShapeProps) => (
                <Sector {...props} outerRadius={index === active ? outerRadius + 9 : outerRadius} />
              )}
            />
          </PieChart>
        </ChartContainer>
      </div>
      <div role="group" aria-label="Pilih kategori risiko" className="flex flex-wrap justify-center gap-1 border-t border-border pt-3">
        {categoryData.map(({ name, value, fill }, index) => {
          const percent = share.format(value / current.totalRisks * 100);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={active === index}
              aria-label={`${name}, ${percent} persen, ${value} risiko`}
              onClick={() => setActive(index)}
              className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring", active === index && "bg-muted text-foreground")}
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: fill }} />
              {name}
              <span className="font-medium tabular-nums text-foreground">{percent}%</span>
            </button>
          );
        })}
      </div>
    </StandardCard>
  );
}
