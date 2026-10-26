"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listOperatorWork } from "@/lib/api/operator-work";
import { startMonitoring } from "@/lib/api/risk-monitoring";
import type { OperatorWorkItem, OperatorWorkPage } from "@/types/operator-work";
import { ActionButton, CollectionEmptyState, CollectionErrorState, CollectionLoadingState, CollectionPageHeader, OperatorWorkList, PageStack } from "@/components/shared/design-system";

export default function WorkPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<OperatorWorkPage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => { setLoading(true); setError(""); setReload(value => value + 1); }, []);
  useEffect(() => {
    if (!token || user?.role !== "unit") return;
    let cancelled = false;
    listOperatorWork(token, page).then(data => { if (!cancelled) setResult(data); })
      .catch(() => { if (!cancelled) setError("Daftar pekerjaan belum berhasil dimuat."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, user?.role, page, reload]);
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);
  async function open(item: OperatorWorkItem) {
    if (busy || !token) return;
    if (item.kind === "risk_draft") { router.push(`/risk/register/new?id=${encodeURIComponent(item.targetId)}&returnTo=/work`); return; }
    if (item.kind === "mitigation_report") { router.push(`/compliance/penanganan?taskId=${encodeURIComponent(item.targetId)}`); return; }
    if (item.kind === "monitoring_draft") { router.push(`/risk/monitoring/${encodeURIComponent(item.targetId)}`); return; }
    setBusy(item.key); setError("");
    try {
      const data = await startMonitoring(token, item.riskId, item.period);
      router.push(`/risk/monitoring/${encodeURIComponent(data.monitoring.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pemantauan belum dapat dimulai.");
      setBusy(null);
    }
  }
  if (user && user.role !== "unit") return <PageStack><CollectionErrorState title="Halaman operator" message="Pekerjaan saya tersedia untuk operator unit." /></PageStack>;
  return <PageStack>
    <CollectionPageHeader title="Pekerjaan saya" showTitle actions={<><ActionButton asChild><Link href="/risk/register/new?returnTo=/work">Tambah risiko</Link></ActionButton><ActionButton asChild><Link href="/risk-events?create=1">Catat kejadian</Link></ActionButton></>} />
    {error ? <CollectionErrorState message={error} onReload={refresh} /> : null}
    {loading ? <CollectionLoadingState message="Memuat pekerjaan…" /> : !error && result?.items.length === 0 ? <CollectionEmptyState title="Tidak ada pekerjaan yang perlu ditangani" description="Risiko, laporan, dan kejadian tetap dapat ditelusuri melalui menu operasional." /> : result && !error ? <OperatorWorkList items={result.items} busyKey={busy} onOpen={item => void open(item)} /> : null}
    {!loading && !error && (page > 1 || result?.hasNext) ? <div className="flex items-center justify-between gap-3"><ActionButton disabled={page === 1} onClick={() => {setLoading(true);setError("");setPage(value => value - 1);}}>Sebelumnya</ActionButton><span className="text-sm text-muted-foreground">Halaman {page}</span><ActionButton disabled={!result?.hasNext} onClick={() => {setLoading(true);setError("");setPage(value => value + 1);}}>Berikutnya</ActionButton></div> : null}
  </PageStack>;
}
