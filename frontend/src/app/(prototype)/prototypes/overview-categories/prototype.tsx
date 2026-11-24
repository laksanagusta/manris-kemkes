"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RiskCountTrendChart } from "@/app/(app)/overview/_components/risk-count-trend-chart";
import { VariantPicker } from "@/app/(app)/prototypes/_components/variant-picker";
import { CollectionPageHeader, PageStack, StandardCard, WorkspaceMetrics } from "@/components/shared/design-system";
import { currentCycle, snapshots, totalRisks } from "./data";
import { Peringkat } from "./peringkat";
import { Peta } from "./peta";
import { Rincian } from "./rincian";

const AppShell = dynamic(
  () => import("@/components/app-shell").then((module) => module.AppShell),
  { ssr: false },
);

const variants = [Peringkat, Peta, Rincian];
const names = ["Peringkat", "Peta", "Rincian"];

function selectVariant(index: number, setCurrent: (index: number) => void) {
  setCurrent(index);
  const url = new URL(location.href);
  url.searchParams.set("v", String(index + 1));
  history.replaceState(null, "", url);
}

export function OverviewCategoryPrototype({ initialVariant }: { initialVariant: number }) {
  const [current, setCurrent] = useState(initialVariant);
  const Variant = variants[current];

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [role=menu], [role=listbox], [role=dialog]"))) return;

      let index: number;
      if (/^[1-3]$/.test(event.key)) index = Number(event.key) - 1;
      else if (event.key === "ArrowRight") index = (current + 1) % variants.length;
      else if (event.key === "ArrowLeft") index = (current - 1 + variants.length) % variants.length;
      else return;

      event.preventDefault();
      selectVariant(index, setCurrent);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [current]);

  return (
    <AppShell>
      <PageStack className="space-y-5 pb-24 lg:space-y-6">
        <CollectionPageHeader
          title="Dashboard"
          subtitle={<span>Prototipe · Data simulasi <span aria-hidden="true">·</span> <Link className="rounded-sm underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" href="/overview">Buka dashboard</Link></span>}
          showTitle
          showSubtitle
          actionsPlacement="title"
          actions={<WorkspaceMetrics items={[
            { label: "Total risiko", value: totalRisks },
            { label: "Periode berjalan", value: currentCycle },
          ]} />}
        />
        <section aria-labelledby="risk-profile" className="space-y-4 border-t border-border pt-6 lg:pt-8">
          <h2 id="risk-profile" className="text-section-title tracking-[-0.015em]">Profil risiko</h2>
          <div className="grid items-stretch gap-4 xl:min-h-[26.5rem] xl:grid-cols-2">
            <RiskCountTrendChart risks={snapshots} currentCycle={currentCycle} currentTotal={totalRisks} />
            <StandardCard
              title={<span className="text-sm">Distribusi Kategori Risiko</span>}
              className="min-w-0"
              contentClassName="flex flex-1 flex-col"
            >
              <Variant key={current} />
            </StandardCard>
          </div>
        </section>
        <VariantPicker names={names} current={current} select={(index) => selectVariant(index, setCurrent)} />
      </PageStack>
    </AppShell>
  );
}
