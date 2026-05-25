import { cn } from "@/lib/utils";

type Props = {
  heatmap: number[][];
};

function toneClass(value: number) {
  if (value >= 5) return "bg-red-600 text-white";
  if (value >= 3) return "bg-orange-500 text-white";
  if (value >= 1) return "bg-amber-200 text-amber-950";
  return "bg-muted text-muted-foreground";
}

export function InherentHeatmap({ heatmap }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1" aria-label="Heatmap inherent probability impact">
      {Array.from({ length: 5 }).flatMap((_, probabilityIndex) =>
        Array.from({ length: 5 }).map((__, impactIndex) => {
          const value = heatmap?.[probabilityIndex]?.[impactIndex] ?? 0;
          return (
            <div
              key={`${probabilityIndex}-${impactIndex}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm text-xs font-semibold",
                toneClass(value),
              )}
              title={`Probabilitas ${probabilityIndex + 1}, Dampak ${impactIndex + 1}: ${value} risiko`}
            >
              {value}
            </div>
          );
        }),
      )}
    </div>
  );
}
