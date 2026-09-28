"use client";

import { useState } from "react";
import { MitigationPlanList } from "@/components/shared/mitigation-plan-list";
import type { MitigationItem } from "@/components/shared/mitigation-table";

export function MitigationPlanListExample() {
  const [items, setItems] = useState<MitigationItem[]>([
    { action: "Validasi kelengkapan laporan setiap minggu", owner: "Tim pelaporan", mitigationType: "reduce_probability", activityStage: "Pelaksanaan", expectedOutput: "Laporan tervalidasi", quantitativeTarget: "100% laporan", supportingUnit: "Unit program", isExistingControl: true },
  ]);
  return <div className="w-full max-w-3xl"><MitigationPlanList items={items} onChange={setItems} /></div>;
}
