"use client";

import { RiskCycleDetailReport } from "../risk-cycle-detail-report";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function CycleDetailPage() {
  return (
    <PageStack>
      <CollectionPageHeader title="Detail Siklus Risiko" />

      <RiskCycleDetailReport />
    </PageStack>
  );
}
