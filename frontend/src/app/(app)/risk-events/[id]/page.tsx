"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { getRiskEvent, linkRiskEvent } from "@/lib/api/risk-events";
import type { RiskEvent, RiskEventCondition, RiskEventSeverity } from "@/types/risk-event";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AccentButton, ActionButton, AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, Card, CardContent, CardHeader, CardTitle, CollectionErrorState,
  CollectionLoadingState, CollectionPageHeader, CollectionStatusBadge, Dialog,
  DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, PageStack, WarningCard,
} from "@/components/shared/design-system";
import { Link2, Lock, Search } from "@/components/ui/icons";

type RiskOption = { id: string; code?: string; title: string; organizationId?: string };
const severityLabels: Record<RiskEventSeverity, string> = { low: "Rendah", medium: "Sedang", high: "Tinggi", extreme: "Ekstrem" };
const conditionLabels: Record<RiskEventCondition, string> = { recovered: "Pulih", controlled: "Terkendali", ongoing: "Masih berlangsung", worsening: "Memburuk", unknown: "Belum diketahui" };
const impactLabels: Record<string, string> = { operational: "Operasional", service: "Layanan", financial: "Keuangan", health_safety: "Kesehatan/keselamatan", reputation: "Reputasi", compliance: "Kepatuhan", other: "Lainnya" };

export default function RiskEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [item, setItem] = useState<RiskEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [risks, setRisks] = useState<RiskOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true); setError("");
    try { setItem(await getRiskEvent(token, id)); }
    catch { setError("Tidak dapat memuat kejadian risiko. Coba lagi."); }
    finally { setLoading(false); }
  }, [id, token]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!dialogOpen || !token) return; api.get<RiskOption[]>("/risks", token).then(setRisks).catch(() => toast.error("Daftar risiko gagal dimuat.")); }, [dialogOpen, token]);

  const available = useMemo(() => {
    const linked = new Set(item?.linkedRisks.map((risk) => risk.id) ?? []);
    const normalized = query.trim().toLowerCase();
    return risks.filter((risk) => risk.organizationId === item?.organizationId && !linked.has(risk.id) && (!normalized || `${risk.code ?? ""} ${risk.title}`.toLowerCase().includes(normalized))).slice(0, 12);
  }, [item, query, risks]);
  const saveLinks = async () => {
    if (!token || !item) return;
    setSaving(true);
    try { const updated = await linkRiskEvent(token, item.id, selected); setItem(updated); setDialogOpen(false); setConfirmOpen(false); setSelected([]); toast.success("Risiko berhasil ditautkan secara permanen."); }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : "Risiko gagal ditautkan."); }
    finally { setSaving(false); }
  };

  if (loading) return <PageStack><CollectionLoadingState message="Memuat detail kejadian…" /></PageStack>;
  if (error) return <PageStack><CollectionErrorState title="Tidak dapat memuat kejadian risiko" message={error} onReload={() => void load()} /></PageStack>;
  if (!item) return <PageStack><CollectionErrorState title="Kejadian tidak ditemukan" message="Data kejadian tidak tersedia." onReload={() => void load()} /></PageStack>;

  return (
    <PageStack>
      <CollectionPageHeader title="" actionsPlacement="top" actions={<ActionButton variant="outline" icon={<Link2 className="size-3.5" />} onClick={() => setDialogOpen(true)}>Tautkan risiko</ActionButton>} />
      <WarningCard title="Record terkunci" description="Isi kejadian bersifat permanen. Anda hanya dapat menambahkan hubungan risiko baru." action={<Lock className="size-4" />} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Informasi utama</CardTitle></CardHeader><CardContent><dl>{[["Waktu kejadian", new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(item.occurredAt))], ["Apa yang terjadi", item.description], ["Jenis dampak", item.impactTypes.map((impact) => impact === "other" && item.otherImpactType ? item.otherImpactType : impactLabels[impact] || impact).join(", ")], ["Dampak aktual", item.actualImpact], ["Penanganan langsung", item.immediateResponse], ["Kondisi", conditionLabels[item.postResponseCondition]]].map(([label,value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[13px] text-muted-foreground">{label}</dt><dd className="text-sm text-foreground">{value}</dd></div>)}</dl></CardContent></Card>
          {(item.location || item.affectedParties || item.suspectedCause || item.disruptionDuration || item.financialLossKnown !== undefined || item.evidenceUrl) ? <Card><CardHeader><CardTitle>Detail tambahan</CardTitle></CardHeader><CardContent><dl>{item.location ? <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[13px] text-muted-foreground">Lokasi</dt><dd className="text-sm">{item.location}</dd></div> : null}{item.affectedParties ? <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[13px] text-muted-foreground">Pihak terdampak</dt><dd className="text-sm">{item.affectedParties}</dd></div> : null}{item.suspectedCause ? <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[13px] text-muted-foreground">Dugaan penyebab</dt><dd className="text-sm">{item.suspectedCause}</dd></div> : null}{item.disruptionDuration ? <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[13px] text-muted-foreground">Durasi gangguan</dt><dd className="text-sm">{item.disruptionDuration}</dd></div> : null}{item.financialLossKnown !== undefined ? <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[13px] text-muted-foreground">Kerugian keuangan</dt><dd className="text-sm">{item.financialLossKnown && item.financialLoss !== undefined ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.financialLoss) : "Belum diketahui"}</dd></div> : null}{item.evidenceUrl ? <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]"><dt className="text-[13px] text-muted-foreground">Bukti</dt><dd className="text-sm"><a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="underline">Buka tautan</a></dd></div> : null}</dl></CardContent></Card> : null}
        </div>
        <Card className="h-fit"><CardHeader><CardTitle>Ringkasan ledger</CardTitle></CardHeader><CardContent className="space-y-5"><div><p className="text-xs text-muted-foreground">Tingkat kejadian</p><CollectionStatusBadge className="mt-2" tone={item.severity === "low" ? "success" : item.severity === "medium" ? "warning" : "danger"}>{severityLabels[item.severity]}</CollectionStatusBadge></div><div><p className="text-xs text-muted-foreground">Risiko terkait</p><div className="mt-2 space-y-2">{item.linkedRisks.length ? item.linkedRisks.map((risk) => <div key={risk.id} className="rounded-lg bg-muted/40 px-3 py-2"><p className="font-mono text-xs">{risk.code}</p><p className="mt-1 text-sm text-secondary-foreground">{risk.title}</p></div>) : <CollectionStatusBadge variant="secondary">Belum dipetakan</CollectionStatusBadge>}</div></div><div className="text-xs text-muted-foreground"><p>Dicatat oleh {item.createdByName || "-"}</p><p>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</p></div></CardContent></Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Tautkan risiko</DialogTitle></DialogHeader><div className="space-y-3"><div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode atau nama risiko" /></div><div className="max-h-72 space-y-1 overflow-y-auto">{available.map((risk) => <label key={risk.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/40"><Checkbox checked={selected.includes(risk.id)} onCheckedChange={() => setSelected((current) => current.includes(risk.id) ? current.filter((id) => id !== risk.id) : [...current, risk.id])} /><span><span className="font-mono text-xs">{risk.code || "Tanpa kode"}</span><span className="mt-0.5 block text-sm text-secondary-foreground">{risk.title}</span></span></label>)}</div></div><DialogFooter><ActionButton variant="outline" onClick={() => setDialogOpen(false)}>Batal</ActionButton><AccentButton disabled={!selected.length} onClick={() => setConfirmOpen(true)}>Lanjutkan</AccentButton></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tautkan secara permanen?</AlertDialogTitle><AlertDialogDescription>Hubungan risiko yang disimpan tidak dapat dihapus. Pastikan pilihan sudah tepat.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={saving}>Kembali</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void saveLinks(); }}>{saving ? "Menyimpan…" : "Tautkan risiko"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </PageStack>
  );
}
