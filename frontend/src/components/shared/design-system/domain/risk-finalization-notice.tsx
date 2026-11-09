"use client";

import { createDisplayDateFormatter } from "@/lib/display-date";
import { riskPeriodLabel } from "@/lib/risk-creation";
import { getMonitoringWindow } from "@/lib/monitoring-window";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle } from "@/components/shared/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { api } from "@/lib/api";
import type { MitigationTask } from "@/types/risk";
import { ActionButton } from "../actions/action-button";

export function RiskFinalizationNotice({ riskId, token, cycle }: { riskId: string; token: string; cycle?: string }) {
  const [result, setResult] = useState<{ riskId: string; tasks: MitigationTask[] } | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get<MitigationTask[]>(`/risks/${encodeURIComponent(riskId)}/tasks`, token)
      .then(tasks => { if (!cancelled) { setResult({ riskId, tasks }); setErrorId(null); } })
      .catch(() => { if (!cancelled) setErrorId(riskId); });
    return () => { cancelled = true; };
  }, [riskId, token, reload]);
  const tasks = result?.riskId === riskId ? result.tasks : null;
  const error = errorId === riskId;
  const next = tasks?.filter(task => task.status === "pending" || task.status === "overdue")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return <RiskFinalizationSummary cycle={cycle} next={next} loading={tasks === null && !error} error={error} onRetry={() => { setErrorId(null); setReload(value => value + 1); }} />;
}

export function RiskFinalizationSummary({ cycle, next, loading, error, onRetry }: {
  cycle?: string;
  next?: Pick<MitigationTask, "id" | "mitigationOwner" | "periodLabel" | "dueDate">;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const window = cycle ? getMonitoringWindow(cycle) : null;
  const month = window ? createDisplayDateFormatter("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(window.start) : null;
  return (
    <Alert variant="info" role="status">
      <AlertCircle aria-hidden="true" />
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <AlertTitle>Risiko berhasil difinalisasi{cycle ? ` untuk ${riskPeriodLabel(cycle)}` : ""}.</AlertTitle>
          <AlertDescription className="flex flex-col gap-1 [&_p:not(:last-child)]:mb-0">
            {error ? <p>Jadwal penanganan belum dapat dimuat.</p>
              : loading ? <p>Memeriksa jadwal laporan…</p>
              : next ? <p>{next.mitigationOwner || "PIC belum tersedia"} · {next.periodLabel}{next.dueDate ? <> · Tenggat <time dateTime={next.dueDate}>{createDisplayDateFormatter("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${next.dueDate}T12:00:00+07:00`))}</time></> : null}</p>
              : <p>Laporan penanganan belum tersedia.</p>}
            {month && cycle ? <p>Pemantauan {riskPeriodLabel(cycle)} dapat diisi selama {month}, WIB.</p> : null}
          </AlertDescription>
        </div>
        {error ? <ActionButton onClick={onRetry}>Coba lagi</ActionButton>
          : next ? <ActionButton asChild><Link href={`/compliance/penanganan?taskId=${encodeURIComponent(next.id)}`}>Lihat penanganan</Link></ActionButton>
          : !loading ? <ActionButton asChild><Link href="/risk/register">Kembali ke daftar risiko</Link></ActionButton> : null}
      </div>
    </Alert>
  );
}
