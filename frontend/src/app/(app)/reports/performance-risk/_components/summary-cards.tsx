import {
  AlertTriangle,
  ClipboardList,
  Link2,
  ShieldAlert,
  Target,
} from "@/components/ui/icons";

import { KpiCard } from "@/components/ui/kpi-card";
import type { PerformanceRiskSummary } from "@/types/performance-risk";

type Props = {
  summary: PerformanceRiskSummary | null;
};

export function PerformanceRiskSummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        label="RO Terpetakan"
        value={summary?.totalRO ?? 0}
        icon={<Target className="size-5 text-zinc-500" />}
        tone="white"
        className="flex min-h-[96px] flex-col rounded-lg p-4"
        labelClassName="capitalize tracking-normal"
        valueClassName="font-medium"
      />
      <KpiCard
        label="RO Dengan Risiko"
        value={summary?.linkedRO ?? 0}
        icon={<Link2 className="size-5 text-zinc-500" />}
        tone="white"
        className="flex min-h-[96px] flex-col rounded-lg p-4"
        labelClassName="capitalize tracking-normal"
        valueClassName="font-medium"
      />
      <KpiCard
        label="RO Tanpa Risiko"
        value={summary?.unlinkedRO ?? 0}
        icon={<ShieldAlert className="size-5 text-zinc-500" />}
        tone="white"
        className="flex min-h-[96px] flex-col rounded-lg p-4"
        labelClassName="capitalize tracking-normal"
        valueClassName="font-medium"
      />
      <KpiCard
        label="RO Risiko Tinggi+"
        value={summary?.highOrExtremeRO ?? 0}
        icon={<AlertTriangle className="size-5 text-zinc-500" />}
        tone="white"
        className="flex min-h-[96px] flex-col rounded-lg p-4"
        labelClassName="capitalize tracking-normal"
        valueClassName="font-medium"
      />
      <KpiCard
        label="Mitigasi Overdue"
        value={summary?.overdueMitigations ?? 0}
        icon={<ClipboardList className="size-5 text-zinc-500" />}
        tone="white"
        className="flex min-h-[96px] flex-col rounded-lg p-4"
        labelClassName="capitalize tracking-normal"
        valueClassName="font-medium"
      />
    </div>
  );
}
