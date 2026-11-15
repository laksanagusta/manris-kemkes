"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { RiskOpenDrafts } from "@/types/risk";
import type { StartRiskRevisionResponse } from "@/lib/api/risk-monitoring";
import { RiskRevisionAction } from "./risk-revision-action";

export function RiskWorkflowActions({ token, riskId, drafts, status, disabled, monitoringPending, onStartMonitoring, onRevisionStarted, onRetry }: {
  token: string;
  riskId: string;
  drafts?: RiskOpenDrafts;
  status: "idle" | "loading" | "ready" | "error";
  disabled?: boolean;
  monitoringPending?: boolean;
  onStartMonitoring: () => void;
  onRevisionStarted: (result: StartRiskRevisionResponse) => void;
  onRetry: () => void;
}) {
  const unavailable = status !== "ready" || !drafts;
  const revisionHref = drafts?.revisionRiskId
    ? `/risk/register/new?id=${encodeURIComponent(drafts.revisionRiskId)}`
    : drafts?.revisionMonitoringId ? `/risk/monitoring/${encodeURIComponent(drafts.revisionMonitoringId)}` : undefined;
  const monitoringBlocked = !drafts?.monitoringId && Boolean(revisionHref);
  const revisionBlocked = !revisionHref && Boolean(drafts?.monitoringId);
  const lookupReason = unavailable ? "Status draf belum dapat dipastikan. Periksa draf lagi." : undefined;
  const monitoringReason = monitoringBlocked ? "Selesaikan atau batalkan draf revisi terlebih dahulu." : lookupReason;
  const monitoringDisabled = disabled || monitoringPending || unavailable || monitoringBlocked;

  return <TooltipProvider>
    <ActionHint reason={monitoringReason}>
    {drafts?.monitoringId && !monitoringDisabled ? (
      <Button variant="outline" asChild><Link href={`/risk/monitoring/${encodeURIComponent(drafts.monitoringId)}`}>Lanjutkan pemantauan</Link></Button>
    ) : (
      <Button variant="outline" onClick={onStartMonitoring} disabled={monitoringDisabled} title={monitoringReason} aria-busy={monitoringPending || undefined}>
        {monitoringPending ? "Menyiapkan…" : drafts?.monitoringId ? "Lanjutkan pemantauan" : "Pantau"}
      </Button>
    )}
    </ActionHint>
    <ActionHint reason={revisionBlocked ? "Selesaikan atau batalkan draf pemantauan terlebih dahulu." : lookupReason}>
    <RiskRevisionAction token={token} riskId={riskId} draftHref={revisionHref} disabled={disabled || monitoringPending || unavailable || revisionBlocked} disabledReason={revisionBlocked ? "Selesaikan atau batalkan draf pemantauan terlebih dahulu." : lookupReason} onStarted={onRevisionStarted} onConflict={onRetry} />
    </ActionHint>
    {status === "error" && <Button variant="outline" onClick={onRetry} disabled={disabled}>Periksa draf lagi</Button>}
  </TooltipProvider>;
}

function ActionHint({ reason, children }: { reason?: string; children: ReactNode }) {
  if (!reason) return children;
  return <Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label={reason} className="inline-flex rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{children}</span></TooltipTrigger><TooltipContent>{reason}</TooltipContent></Tooltip>;
}
