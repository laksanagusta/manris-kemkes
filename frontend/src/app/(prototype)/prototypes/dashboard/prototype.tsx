"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { VariantPicker } from "@/app/(app)/prototypes/_components/variant-picker";
import { CollectionPageHeader, PageStack, WorkspaceMetrics } from "@/components/shared/design-system";
import { current, currentCycle } from "./data";
import { Eksposur } from "./eksposur";
import { Fokus } from "./fokus";
import { Tren } from "./tren";
import styles from "./shell.module.css";

const AppShell = dynamic(
  () => import("@/components/app-shell").then((module) => module.AppShell),
  { ssr: false },
);

const variants = [Tren, Eksposur, Fokus];
const names = ["Tren", "Eksposur", "Fokus"];

export function DashboardPrototype({ initialVariant }: { initialVariant: number }) {
  const [active, setActive] = useState(initialVariant);
  const Variant = variants[active];

  function selectVariant(index: number) {
    setActive(index);
    const url = new URL(location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
    document.querySelector("[data-app-shell-body]")?.scrollTo({ top: 0, behavior: "instant" });
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [role=dialog], [role=menu], [role=listbox]"))) return;

      let index: number;
      if (/^[1-3]$/.test(event.key)) index = Number(event.key) - 1;
      else if (target instanceof Element && target.closest("[role=tablist], [role=application]")) return;
      else if (event.key === "ArrowRight") index = (active + 1) % variants.length;
      else if (event.key === "ArrowLeft") index = (active - 1 + variants.length) % variants.length;
      else return;

      event.preventDefault();
      selectVariant(index);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [active]);

  return (
    <div className={styles.shell}>
      <AppShell>
        <PageStack className="space-y-5 pb-24 lg:space-y-6" data-dashboard-prototype="">
          <CollectionPageHeader
            title="Dashboard"
            showTitle
            showSubtitle
            subtitle={<span>Data simulasi <span aria-hidden="true">·</span> <Link className="rounded-sm underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" href="/overview">Buka dashboard</Link></span>}
            actionsPlacement="title"
            actions={<WorkspaceMetrics items={[
              { label: "Total risiko", value: current.totalRisks },
              { label: "Periode simulasi", value: currentCycle },
            ]} />}
          />
          <Variant key={active} />
          <VariantPicker names={names} current={active} select={selectVariant} />
        </PageStack>
      </AppShell>
    </div>
  );
}
