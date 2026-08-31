"use client";

import { useState } from "react";
import { Download, Plus } from "@/components/ui/icons";

import { AccentButton } from "@/components/shared/design-system";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CollectionFilterGrid,
  CollectionFilterTrigger,
  CollectionTableCard,
  CollectionToolbar,
  ExpandableSearchField,
} from "@/components/shared/design-system";
import {
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import { ActionButton } from "@/components/shared/design-system";

export function CollectionLayoutExample() {
  const [search, setSearch] = useState("");

  return (
    <PageStack className="rounded-lg border bg-background p-4">
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
          Filter kiri, action kanan
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
              <ActionButton
                icon={<Download className="size-3.5" />}
                variant="outline"
              >
                Export data
              </ActionButton>
              <AccentButton icon={<Plus className="size-4" />}>
                Buat item
              </AccentButton>
            </>
          }
        />
      </div>
      <CollectionFilterGrid className="lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
        <div className="min-w-0">
          <ExpandableSearchField
            value={search}
            onChange={setSearch}
            ariaLabel="Cari contoh"
            placeholder="Cari data..."
          />
        </div>
        <div className="justify-self-end">
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="Semua periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua periode</SelectItem>
              <SelectItem value="2026-H1">2026-H1</SelectItem>
              <SelectItem value="2025-H2">2025-H2</SelectItem>
            </SelectContent>
          </Select>
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
    </PageStack>
  );
}
