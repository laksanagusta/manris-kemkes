"use client";

import { useState } from "react";
import { RiskEventFormDialog } from "@/app/(app)/risk-events/_components/risk-event-form-sheet";
import { Button } from "@/components/ui/button";

export function IncidentFormModalExample() {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Lihat contoh modal</Button>
    <RiskEventFormDialog open={open} onOpenChange={setOpen} token="" organizationId="example-unit" onCreated={() => setOpen(false)} />
  </>;
}
