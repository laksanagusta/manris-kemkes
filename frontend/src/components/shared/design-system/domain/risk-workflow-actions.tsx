"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RiskOpenDrafts } from "@/types/risk";
import type { StartRiskRevisionResponse } from "@/lib/api/risk-monitoring";
import { RiskRevisionAction } from "./risk-revision-action";
import { ActionHint } from "../actions/action-hint";

export function RiskWorkflowActions({ token, riskId, drafts, status, disabled, monitoringPending, showMonitoringAction = true, onStartMonitoring, onRevisionStarted, onRetry }: {
  token: string;
  riskId: string;
  drafts?: RiskOpenDrafts;
  status: "idle" | "loading" | "ready" | "error";
  disabled?: boolean;
  monitoringPending?: boolean;
  showMonitoringAction?: boolean;
  onStartMonitoring: () => void;
  onRevisionStarted: (result: StartRiskRevisionResponse) => void;
  onRetry: () => void;
}) {
  const unavailable = status !== "ready" || !drafts;
  const revisionHref = drafts?.revisionRiskId
    ? `/risk/register/new?id=${encodeURIComponent(drafts.revisionRiskId)}`
    : drafts?.revisionMonitoringId ? `/risk/monitoring/${encodeURIComponent(drafts.revisionMonitoringId)}` : undefined;
  const period = drafts?.revisionBlockedPeriod;
  const monitoringBlocked = !period && !drafts?.monitoringId && Boolean(revisionHref);
  const revisionBlocked = Boolean(period || (!revisionHref && drafts?.monitoringId));
  const lookupReason = unavailable ? "Status draf belum dapat dipastikan. Periksa draf lagi." : undefined;
  const monitoringReason = monitoringBlocked ? "Selesaikan atau batalkan draf revisi terlebih dahulu." : lookupReason;
  const revisionReason = period
    ? `Selesaikan pemantauan ${period}, Kertas Kerja, dan Evaluasi sebelum merevisi risiko. Jika jendela sudah tutup, hubungi Super Admin.`
    : revisionBlocked ? "Selesaikan atau batalkan draf pemantauan terlebih dahulu." : lookupReason;
  const monitoringDisabled = disabled || monitoringPending || unavailable || monitoringBlocked;

  return <>
    {showMonitoringAction && (
      <ActionHint reason={monitoringReason}>
        {drafts?.monitoringId && !monitoringDisabled ? (
          <Button variant="outline" asChild><Link href={`/risk/monitoring/${encodeURIComponent(drafts.monitoringId)}`}>Lanjutkan pemantauan</Link></Button>
        ) : (
          <Button variant="outline" onClick={onStartMonitoring} disabled={monitoringDisabled} title={monitoringReason} aria-busy={monitoringPending || undefined}>
            {monitoringPending ? "Menyiapkan…" : drafts?.monitoringId ? "Lanjutkan pemantauan" : "Pantau"}
          </Button>
        )}
      </ActionHint>
    )}
    <ActionHint reason={revisionReason}>
    <RiskRevisionAction token={token} riskId={riskId} draftHref={revisionHref} disabled={disabled || monitoringPending || unavailable || revisionBlocked} disabledReason={revisionReason} onStarted={onRevisionStarted} onConflict={onRetry} />
    </ActionHint>
    {status === "error" && <Button variant="outline" onClick={onRetry} disabled={disabled}>Periksa draf lagi</Button>}
  </>;
}
