"use client";

import type { MitigationType } from "@/types/risk";
import { MitigationPlanList } from "./mitigation-plan-list";

export interface MitigationItem {
  id?: string;
  action: string;
  owner: string;
  ownerUserId?: string;
  treatmentOwnerId?: string;
  externalPicId?: string;
  executionScheduleText?: string;
  targetCost?: number;
  mitigationType?: MitigationType;
}

export function MitigationTable({ items }: { items: MitigationItem[] }) {
  return <MitigationPlanList presentation="table" items={items} onChange={() => {}} disabled hideAddButton />;
}
