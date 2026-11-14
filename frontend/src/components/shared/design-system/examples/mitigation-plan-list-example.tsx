"use client";

import { useState } from "react";
import { MitigationPlanList } from "@/components/shared/mitigation-plan-list";
import type { MitigationItem } from "@/components/shared/mitigation-table";

export function MitigationPlanListExample() {
  const [items, setItems] = useState<MitigationItem[]>([
    { action: "Validasi kelengkapan laporan setiap minggu", owner: "Tim pelaporan", mitigationType: "reduce_probability" },
    { action: "Siapkan prosedur pemulihan saat layanan pelaporan terganggu", owner: "Tim operasional", mitigationType: "reduce_impact" },
    { action: "Uji alur pelaporan dan tindak lanjut bersama unit pelaksana", owner: "Koordinator unit", mitigationType: "reduce_both" },
  ]);

  return (
    <div className="w-full max-w-3xl">
      <MitigationPlanList emptyStatePresentation="plain" items={items} onChange={setItems} />
    </div>
  );
}
