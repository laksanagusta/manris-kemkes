"use client";

import { useState } from "react";

import { RiskDetailDrawer } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import type { Risk } from "@/types/risk";

const exampleRisk = {
  id: "risk-detail-example",
  riskCode: "R-238",
  code: "R-238",
  title: "Informasi kedatangan jenazah terlambat atau tidak lengkap",
  description: "",
  category: "operasional",
  unitId: "",
  cause: [],
  riskSource: "internal",
  riskOwnerId: "",
  controllability: "C",
  impactDesc: [],
  existingControl: "",
  controlOwnerId: "",
  controlEffectiveness: "",
  probability: 1,
  impact: 5,
  weight: 4,
  inherentScore: 20,
  riskPriority: 1,
  riskAppetite: "di_atas_batas",
  treatmentOption: "mitigasi",
  mitigation: { action: "", owner: "" },
  targetProbability: 1,
  targetImpact: 1,
  targetWeight: 1,
  targetScore: 1,
  nextReviewDate: "",
  status: "final",
  versionNumber: 1,
} satisfies Risk;

export function RiskDetailDrawerExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Lihat contoh drawer
      </Button>
      <RiskDetailDrawer
        risk={exampleRisk}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
