import { useState } from "react";
import { StandardCard } from "@/components/shared/design-system";
import { current, integer, quarters } from "./data";
import { CompositionChart, Heatmap, QuarterSelect, TrendChart } from "./widgets";
import { CategoriesChart } from "./categories-chart";

const signedInteger = new Intl.NumberFormat("id-ID", { signDisplay: "exceptZero" });

export function Tren() {
  const [comparison, setComparison] = useState(quarters.length - 2);
  const previous = quarters[comparison];
  const metrics = [
    { label: "Risiko aktif", now: current.totalRisks, then: previous.totalRisks },
    {
      label: "Risiko tinggi dan sangat tinggi",
      now: current.tinggi + current.sangatTinggi,
      then: previous.tinggi + previous.sangatTinggi,
    },
  ];

  return (
    <>
      <section aria-labelledby="perubahan" className="space-y-4 border-t border-border pt-6 lg:pt-8">
        <h2 id="perubahan" className="text-section-title tracking-[-0.015em]">Perubahan antar kuartal</h2>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
          <TrendChart />
          <StandardCard title={<span className="text-sm">Ringkasan Perubahan</span>} contentClassName="space-y-4">
            <QuarterSelect label="Dibandingkan dengan" value={comparison} onChange={setComparison} />
            <dl aria-live="polite" className="divide-y divide-border">
              {metrics.map(({ label, now, then }) => (
                <div key={label} className="py-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 flex items-baseline justify-between gap-3 tabular-nums">
                    <span className="text-2xl font-semibold">{integer.format(now)}</span>
                    <span className="text-sm font-medium">
                      <span className="sr-only">Selisih </span>{signedInteger.format(now - then)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </StandardCard>
        </div>
        <CompositionChart />
      </section>
      <section aria-labelledby="profil" className="space-y-4 border-t border-border pt-6 lg:pt-8">
        <h2 id="profil" className="text-section-title tracking-[-0.015em]">Profil kuartal berjalan</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <CategoriesChart />
          <Heatmap />
        </div>
      </section>
    </>
  );
}
