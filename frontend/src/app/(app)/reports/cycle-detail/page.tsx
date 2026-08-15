"use client";

import { RiskCycleDetailReport } from "../risk-cycle-detail-report";
import { PageStack } from "@/components/shared/design-system";

export default function CycleDetailPage() {
  return (
    <PageStack>
      <div className="min-w-0">
        <h2 className="page-title">
          Detail Siklus Risiko
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
          Telusuri perubahan risiko antar siklus secara rinci, termasuk
          perubahan kolom dan mitigasi.
        </p>
      </div>

      <RiskCycleDetailReport />
    </PageStack>
  );
}
