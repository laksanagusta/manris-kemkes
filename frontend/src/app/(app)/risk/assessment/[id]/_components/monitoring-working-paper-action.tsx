"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionButton } from "@/components/shared/design-system";
import { WorkingPaperCreateDialog } from "@/components/shared/working-paper-create-dialog";

export function MonitoringWorkingPaperAction({ token, observedAt, organizationId, canCreate }: {
  token?: string | null;
  observedAt: string;
  organizationId: string;
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!canCreate) return <ActionButton asChild variant="outline"><Link href={`/risk/working-papers?observation_cutoff=${encodeURIComponent(observedAt)}`}>Lihat KK Pemantauan dan Reviu</Link></ActionButton>;

  return <>
    <ActionButton type="button" variant="outline" onClick={() => setOpen(true)}>Buat KK Pemantauan dan Reviu</ActionButton>
    <WorkingPaperCreateDialog open={open} onOpenChange={setOpen} token={token} organizationId={organizationId} observedAt={observedAt} />
  </>;
}
