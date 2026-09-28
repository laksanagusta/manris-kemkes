"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/shared/app-drawer";
import { RiskCategoryIndicator } from "@/components/shared/design-system/domain/risk-category-indicator";
import { formatRiskScore, roundRiskScore } from "@/lib/risk";
import type { Risk } from "@/types/risk";

export interface RiskDetailDrawerProps {
  risk: Risk;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-center gap-4 py-3">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-foreground">
        {children}
      </dd>
    </div>
  );
}

function statusBadgeClassName(status: Risk["status"]) {
  return status === "final"
    ? "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
    : "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
}

export function RiskDetailDrawer({
  risk,
  open,
  onOpenChange,
}: RiskDetailDrawerProps) {
  const code = risk.riskCode || risk.code || "-";
  const statusLabel = risk.status === "final" ? "Final" : "Draft";
  const inherentScore = roundRiskScore(risk.inherentScore ?? risk.nilai);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Detail Risiko</DrawerTitle>
          <DrawerDescription>
            Properti risiko sumber{" "}
            <span className="font-medium text-foreground">{code}</span> yang menjadi acuan pemantauan ini.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody data-testid="risk-detail-drawer" className="space-y-6">
          <section aria-labelledby="risk-detail-summary" className="space-y-4">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Risiko sumber
              </p>
              <p className="break-words text-sm font-normal leading-5 text-foreground">
                {risk.title || "-"}
              </p>
            </div>

            <div id="risk-detail-summary" className="grid grid-cols-2 gap-2">
              <div className="col-span-2 rounded-lg bg-secondary-card-surface px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Skor inheren
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatRiskScore(inherentScore, "-")}
                </p>
              </div>
              <div className="rounded-lg bg-secondary-card-surface px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Probabilitas
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {risk.probability ?? "-"}
                </p>
              </div>
              <div className="rounded-lg bg-secondary-card-surface px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Dampak
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {risk.impact ?? "-"}
                </p>
              </div>
            </div>

          </section>

          <section aria-labelledby="source-risk-properties" className="space-y-3">
            <h2
              id="source-risk-properties"
              className="text-[13px] font-medium leading-4 text-secondary-foreground"
            >
              Properti sumber
            </h2>
            <dl className="divide-y divide-border/70 border-y border-border/70">
              <DetailRow label="Status">
                <Badge
                  variant="default"
                  className={statusBadgeClassName(risk.status)}
                >
                  {statusLabel}
                </Badge>
              </DetailRow>
              <DetailRow label="Kode">
                <span className="font-mono text-tertiary-foreground">{code}</span>
              </DetailRow>
              <DetailRow label="Kategori">
                <RiskCategoryIndicator
                  category={risk.category}
                  className="ml-auto max-w-[11rem] justify-end text-right text-foreground"
                />
              </DetailRow>
              <DetailRow label="Versi">
                <span className="font-mono">v{risk.versionNumber ?? "-"}</span>
              </DetailRow>
            </dl>
          </section>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
