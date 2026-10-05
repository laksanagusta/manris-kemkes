"use client";

import { useState } from "react";
import { RiskExportButton } from "../actions/risk-export-button";
import { toast } from "sonner";

import {
  AccentButton,
  CollectionFilterGrid,
  CollectionFilterTrigger,
  CollectionTableCard,
  CollectionToolbar,
  ExpandableSearchField,
  PopoverSelectField,
} from "@/components/shared/design-system";
import {
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";

export function CollectionLayoutExample() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");

  return (
    <PageStack className="rounded-[12px] border bg-background p-4">
      <MetricGrid>
        {["Total", "Aktif", "Menunggu", "Selesai"].map((label, index) => (
          <KpiCard
            key={label}
            label={label}
            value={String([128, 74, 18, 36][index])}
            tone="white"
          />
        ))}
      </MetricGrid>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Filter kiri, action kanan · ekspor seluruh hasil filter
        </p>
        <CollectionToolbar
          leading={
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <ExpandableSearchField
                value={search}
                onChange={setSearch}
                ariaLabel="Cari contoh"
                placeholder="Cari data..."
              />
              <CollectionFilterTrigger />
            </div>
          }
          actions={
            <>
              <RiskExportButton onClick={() => toast.info("Ekspor Excel mengikuti semua hasil filter aktif, termasuk halaman lain.")} />
              <AccentButton>Buat item</AccentButton>
            </>
          }
        />
      </div>
      <div className="space-y-4">
      <CollectionFilterGrid className="lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
        <div className="min-w-0">
          <ExpandableSearchField
            value={search}
            onChange={setSearch}
            ariaLabel="Cari contoh"
            placeholder="Cari data..."
          />
        </div>
        <div className="w-full lg:w-[220px]">
          <PopoverSelectField
            value={period}
            onValueChange={setPeriod}
            options={[
              { value: "all", label: "Semua Periode" },
              { value: "2026-Q2", label: "2026-Q2" },
              { value: "2026-Q3", label: "2026-Q3" },
            ]}
            placeholder="Semua Periode"
            ariaLabel="Filter periode koleksi"
            side="bottom"
            avoidCollisions={false}
            triggerClassName="h-8 rounded-lg bg-card text-sm"
          />
        </div>
      </CollectionFilterGrid>
      <CollectionTableCard>
        <div className="divide-y divide-border/50">
          {["MR-001", "MR-002", "MR-003"].map((code) => (
            <div key={code} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{code}</span>
              <span className="text-foreground">Contoh item koleksi</span>
            </div>
          ))}
        </div>
      </CollectionTableCard>
      </div>
    </PageStack>
  );
}
