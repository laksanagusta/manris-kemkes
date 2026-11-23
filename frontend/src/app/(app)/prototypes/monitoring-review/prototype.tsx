"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "@/components/shared/icons";
import { DetailSidePanel } from "@/components/shared/design-system/layout/detail-side-panel";
import { PropertyLabel, PropertyList } from "@/components/shared/design-system/layout/property-list";
import { RiskScoreHeatmapModal } from "@/components/shared/design-system/domain/risk-score-heatmap-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Compact } from "./compact";
import { Guided } from "./guided";
import { SideBySide } from "./side-by-side";
import { initial, ScoreAxes, ScoreComparison, type Draft, type Score } from "./review-parts";
import { VariantPicker } from "../_components/variant-picker";

const variants = [SideBySide, Guided, Compact];
const names = ["Berdampingan", "Bertahap", "Ringkas"];
const source = "/risk/monitoring/5761124e-aeb4-4c9e-9227-e7ccd1458d5a";
const storageKey = "manrisk-prototype-monitoring-review";

function readDraft(): Draft {
  if (typeof window === "undefined") return initial;
  try {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) as Draft : initial;
  } catch {
    return initial;
  }
}

function Properties({ finalized }: { finalized: boolean }) {
  return (
    <DetailSidePanel>
      <section aria-labelledby="proto-monitoring-properties">
        <h2 id="proto-monitoring-properties" className="text-sm font-semibold">Properti</h2>
        <p className="mt-2 text-sm font-medium">Keterlambatan verifikasi laporan surveilans</p>
        <PropertyList>
          <div className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4"><PropertyLabel>Jenis transaksi</PropertyLabel><dd>Pemantauan</dd></div>
          <div className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4"><PropertyLabel>Status</PropertyLabel><dd><Badge variant="secondary" className={finalized ? "bg-success/15" : undefined}>{finalized ? "Final" : "Draf Pemantauan"}</Badge></dd></div>
          <div className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4"><PropertyLabel>Kode risiko</PropertyLabel><dd className="font-mono">R-258</dd></div>
          <div className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4"><PropertyLabel>Versi risiko</PropertyLabel><dd>2</dd></div>
          <div className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4"><PropertyLabel>Periode pemantauan</PropertyLabel><dd>Semester I · 2027</dd></div>
        </PropertyList>
        <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-xs">
          <p>Profil Risiko Tahunan 2027 · Versi 2</p>
          <p className="text-muted-foreground">Pengisian 01 Mei 2027–30 Juni 2027 WIB</p>
        </div>
      </section>
    </DetailSidePanel>
  );
}

function TreatmentReport({ draft, open }: { draft: Draft; open: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="text-sm font-semibold">Laporan Penanganan</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Verifikasi laporan masuk setiap hari kerja</p>
            <p className="mt-1 text-xs text-muted-foreground">R-258 · Tim Surveilans · Tenggat <time dateTime="2027-06-30">30 Juni 2027</time></p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className={draft.report ? "bg-success/15" : "bg-info-foreground/10"}>{draft.report ? "Sudah dilaporkan" : "Belum dilaporkan"}</Badge>
            <Button variant="outline" size="sm" onClick={open}>{draft.report ? "Lihat laporan" : "Isi laporan"}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportDialog({ draft, close, save, restore }: { draft: Draft; close: () => void; save: (report: string) => void; restore: () => void }) {
  const [notes, setNotes] = useState(draft.report);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); restore(); }}>
        <DialogHeader>
          <DialogTitle>Laporan Penanganan</DialogTitle>
          <DialogDescription>Verifikasi laporan masuk setiap hari kerja · R-258</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (notes.trim() && !draft.finalized) save(notes.trim()); }}>
          <div className="grid gap-2">
            <Label htmlFor="prototype-treatment-report">Catatan pelaksanaan</Label>
            <Textarea id="prototype-treatment-report" value={notes} readOnly={draft.finalized} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: Tim meninjau 24 laporan yang masuk pada Juni." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>{draft.finalized ? "Tutup" : "Batal"}</Button>
            {!draft.finalized && <Button type="submit" disabled={!notes.trim()}>Simpan laporan</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviewDialog({ draft, close, finalize, restore }: { draft: Draft; close: () => void; finalize: () => void; restore: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); restore(); }}>
        <DialogHeader>
          <DialogTitle>{draft.finalized ? "Hasil final pemantauan" : "Tinjau finalisasi"}</DialogTitle>
          <DialogDescription>R-258 · Semester I 2027</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg border border-border bg-workspace p-4">
          <ScoreComparison draft={draft} />
          <ScoreAxes draft={draft} />
        </div>
        <dl className="space-y-2 text-sm wrap-anywhere">
          <div><dt className="text-muted-foreground">Alasan penilaian</dt><dd>{draft.reason.trim() || "—"}</dd></div>
          <div><dt className="text-muted-foreground">Simpulan dan tindak lanjut</dt><dd>{draft.conclusion.trim() || "—"}</dd></div>
        </dl>
        {!draft.finalized && (!draft.confirmed || !draft.report) && (
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
            {!draft.confirmed && <li>Tetapkan skor observasi.</li>}
            {!draft.report && <li>Lengkapi Laporan Penanganan.</li>}
          </ul>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>{draft.finalized ? "Tutup" : "Lanjutkan edit"}</Button>
          {!draft.finalized && <Button disabled={!draft.confirmed || !draft.report} onClick={finalize}>Finalisasi pemantauan</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MonitoringReviewPrototype({ initialVariant }: { initialVariant: number }) {
  const [current, setCurrent] = useState(() => Number.isInteger(initialVariant) && initialVariant >= 1 && initialVariant <= variants.length ? initialVariant - 1 : 0);
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState(readDraft);
  const [dialog, setDialog] = useState<"report" | "review" | "heatmap" | null>(null);
  const [message, setMessage] = useState("");
  const opener = useRef<HTMLElement>(null);

  function select(index: number) {
    setCurrent(index);
    setRevision((value) => value + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.defaultPrevented || dialog || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (target instanceof HTMLElement && (target.closest("input, textarea, select") || target.isContentEditable)) return;
      if (/^[1-3]$/.test(event.key)) select(Number(event.key) - 1);
      else if (event.key === "ArrowRight") select((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") select((current - 1 + variants.length) % variants.length);
      else if (event.key.toLowerCase() === "r") setRevision((value) => value + 1);
      else return;
      event.preventDefault();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [current, dialog]);

  function persist(next: Draft, feedback: string) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
      setMessage(feedback);
    } catch {
      setMessage("Perubahan tersedia di halaman ini.");
    }
  }

  function open(next: NonNullable<typeof dialog>) {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog(next);
  }

  function choose(score: Score) {
    setMessage("");
    setDraft((previous) => ({ ...previous, ...score, confirmed: true }));
  }

  const Variant = variants[current];
  return (
    <div className="space-y-4 pb-24">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={source} className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><ArrowLeft aria-hidden="true" className="size-3.5" />Buka pemantauan asli</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Pemantauan Risiko</h1>
          <p className="mt-1 text-sm text-muted-foreground">Prototipe interaktif · Data simulasi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="text-xs text-muted-foreground">{message}</span>
          <Button variant="ghost" size="sm" onClick={() => {
            try { sessionStorage.removeItem(storageKey); } catch { /* The in-memory form can still reset. */ }
            setDraft(initial);
            setMessage("");
            setRevision((value) => value + 1);
          }}>Atur ulang simulasi</Button>
          {!draft.finalized && <Button size="sm" variant="outline" onClick={() => persist(draft, "Draf simulasi disimpan.")}>Simpan draf</Button>}
        </div>
      </header>
      <TreatmentReport draft={draft} open={() => open("report")} />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] min-[1500px]:grid-cols-[minmax(0,1fr)_26.25rem]">
        <div className="min-w-0">
          <Variant key={`${current}-${revision}`} draft={draft} choose={choose} edit={(notes) => {
            setMessage("");
            setDraft((previous) => ({ ...previous, ...notes }));
          }} openHeatmap={() => open("heatmap")} review={() => open("review")} />
        </div>
        <aside className="min-w-0 xl:sticky xl:top-6"><Properties finalized={draft.finalized} /></aside>
      </div>
      {dialog === "heatmap" && (
        <RiskScoreHeatmapModal open title="Skor risiko observasi" probability={draft.probability} impact={draft.impact} onApply={choose} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDialog(null);
            requestAnimationFrame(() => opener.current?.focus());
          }
        }} />
      )}
      {dialog === "report" && <ReportDialog draft={draft} close={() => setDialog(null)} restore={() => opener.current?.focus()} save={(report) => {
        const next = { ...draft, report };
        setDraft(next);
        persist(next, "Laporan simulasi disimpan.");
        setDialog(null);
      }} />}
      {dialog === "review" && <ReviewDialog draft={draft} close={() => setDialog(null)} restore={() => opener.current?.focus()} finalize={() => {
        if (!draft.confirmed || !draft.report) return;
        const next = { ...draft, finalized: true };
        setDraft(next);
        persist(next, "Pemantauan simulasi difinalisasi.");
      }} />}
      <VariantPicker names={names} current={current} select={select} />
    </div>
  );
}
