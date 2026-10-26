"use client";

import { AlertCircle, Check, ChevronRight, Circle, Loader2 } from "@/components/shared/icons";
import { agentDate, agentRunLabels, isAgentRunning } from "@/lib/agent-helpers";
import type { AgentRun } from "@/types/agent";
import { Button } from "@/components/ui/button";

export function AgentActivity({ run, onRetry, disabled }: { run: AgentRun; onRetry?: () => void; disabled?: boolean }) {
  const active = isAgentRunning(run.status);
  const events = run.events ?? [];
  const hasSteps = events.length > 0;
  if (!hasSteps && run.status === "completed" && !run.error) return null;
  const label = run.status === "completed" ? `${events.length} langkah` : agentRunLabels[run.status];
  const status = <span className="inline-flex items-center gap-2" role="status" aria-label={run.status === "completed" ? `${agentRunLabels[run.status]}. ${label}` : undefined}>{active ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}{label}</span>;
  return <div className="agent-activity">{hasSteps ? <details>
    <summary>{status}<ChevronRight className="agent-disclosure-arrow size-3.5" aria-hidden="true" /></summary>
    <ol className="agent-activity-steps">
      {events.map((event) => <li key={event.id}>{event.status === "failed" ? <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" /> : event.status === "completed" ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : active && event.status === "running" ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" /> : <Circle className="size-3.5 shrink-0" aria-hidden="true" />}<span>{event.label}</span><time className="ml-auto text-xs text-tertiary-foreground" dateTime={event.createdAt}>{agentDate(event.createdAt)}</time></li>)}
    </ol>
  </details> : status}
    {(run.status === "failed" || run.error) && <div className="mt-3 space-y-2" role="alert"><p className="text-sm text-destructive">{run.error || "Pekerjaan belum berhasil diselesaikan."}</p><p className="text-xs">Kirim ulang permintaan untuk mencoba kembali. Periksa paket usulan sebelum menerapkan perubahan.</p>{onRetry && <Button variant="outline" size="sm" disabled={disabled} onClick={onRetry}>Siapkan pesan ulang</Button>}</div>}
    {run.status === "cancelled" && <p className="mt-3 text-xs text-muted-foreground">Langkah berikutnya dihentikan. Hasil dan perubahan yang sudah diterapkan tetap tercatat. Kirim pesan baru untuk melanjutkan.</p>}
  </div>;
}
