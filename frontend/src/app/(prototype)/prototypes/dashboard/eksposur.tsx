import { StandardCard } from "@/components/shared/design-system";
import { current, integer, percentage } from "./data";
import { CompositionChart, Heatmap, riskLevels, TrendChart } from "./widgets";
import { CategoriesChart } from "./categories-chart";

const priority = current.tinggi + current.sangatTinggi;

export function Eksposur() {
  return (
    <>
      <section aria-labelledby="paparan" className="space-y-4 border-t border-border pt-6 lg:pt-8">
        <h2 id="paparan" className="text-section-title tracking-[-0.015em]">Eksposur kuartal berjalan</h2>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Heatmap />
          <StandardCard
            title={<span className="text-sm">Risiko Prioritas</span>}
            contentClassName="space-y-5"
          >
            <div>
              <p className="text-2xl font-semibold tabular-nums">{integer.format(priority)} <span className="text-sm font-normal text-muted-foreground">risiko</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{percentage.format(priority / current.totalRisks)} dari seluruh risiko aktif</p>
            </div>
            <ul aria-label="Jumlah risiko per tingkat" className="space-y-3 border-t border-border pt-4">
              {[...riskLevels].reverse().map(({ label, color, key }) => (
                <li key={key} className="grid grid-cols-[minmax(6.75rem,auto)_1fr_2ch] items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span aria-hidden="true" className={`size-2 rounded-sm ${color}`} />{label}
                  </span>
                  <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className={`block h-full rounded-full ${color}`} style={{ width: `${current[key] / current.totalRisks * 100}%` }} />
                  </span>
                  <span className="text-right font-medium tabular-nums">{integer.format(current[key])}</span>
                </li>
              ))}
            </ul>
          </StandardCard>
        </div>
        <CategoriesChart />
      </section>
      <section aria-labelledby="histori" className="space-y-4 border-t border-border pt-6 lg:pt-8">
        <h2 id="histori" className="text-section-title tracking-[-0.015em]">Perkembangan risiko</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <TrendChart />
          <CompositionChart />
        </div>
      </section>
    </>
  );
}
