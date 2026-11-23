"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DetailSidePanel } from "@/components/shared/design-system/layout/detail-side-panel";
import { PropertyLabel, PropertyList } from "@/components/shared/design-system/layout/property-list";
import { RiskScoreHeatmapModal, type RiskScoreSelection } from "@/components/shared/design-system/domain/risk-score-heatmap-picker";
import { ArrowLeft } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateRiskMetrics } from "@/lib/risk";
import { VariantPicker } from "../_components/variant-picker";
import { ScoreCard } from "./score-card";
import { ScoreMap } from "./score-map";
import { ScoreRow } from "./score-row";

const names = ["Kartu", "Baris", "Peta"];
const variants = [ScoreCard, ScoreRow, ScoreMap];
const baseline: RiskScoreSelection = { probability: 3, impact: 4 };
const baselineScore = calculateRiskMetrics(baseline.probability, baseline.impact).inherentScore;
const source = "/risk/monitoring/5761124e-aeb4-4c9e-9227-e7ccd1458d5a";

const properties = [
  ["Jenis transaksi", "Pemantauan"],
  ["Kode risiko", "R-258"],
  ["Versi risiko", "2"],
  ["Periode pemantauan", "2027-Q2"],
];

export function ObservationScorePrototype({ initialIndex }: { initialIndex: number }) {
  const [current, setCurrent] = useState(initialIndex);
  const [mount, setMount] = useState(0);
  const [selection, setSelection] = useState(baseline);
  const [confirmed, setConfirmed] = useState(false);
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  function select(index: number) {
    setCurrent(index);
    setMount((value) => value + 1);
    const url = new URL(location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.defaultPrevented || heatmapOpen || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (target instanceof HTMLElement && (target.closest("input, textarea, select") || target.isContentEditable)) return;
      if (/^[1-3]$/.test(event.key)) select(Number(event.key) - 1);
      else if (event.key === "ArrowRight") select((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") select((current - 1 + variants.length) % variants.length);
      else if (event.key.toLowerCase() === "r") setMount((value) => value + 1);
      else return;
      event.preventDefault();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [current, heatmapOpen]);

  function apply(next: RiskScoreSelection) {
    setSelection(next);
    setConfirmed(true);
  }

  function open(button: HTMLButtonElement) {
    opener.current = button;
    setHeatmapOpen(true);
  }

  const Trigger = variants[current];

  return (
    <div className="space-y-4 pb-24">
      <header>
        <Link href={source} className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowLeft aria-hidden="true" className="size-3.5" />Buka pemantauan asli
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Pemantauan Risiko</h1>
        <p className="mt-1 text-sm text-muted-foreground">Prototipe tombol skor · Data simulasi</p>
      </header>

      <Card>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-semibold">Laporan Penanganan</h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Verifikasi laporan masuk setiap hari kerja</p>
              <p className="text-xs text-muted-foreground">R-258 · Tim Surveilans · Tenggat <time dateTime="2027-06-30">30 Juni 2027</time></p>
            </div>
            <Badge variant="secondary" className="bg-info-foreground/10">Belum dilaporkan</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] min-[1500px]:grid-cols-[minmax(0,1fr)_26.25rem]">
        <section aria-labelledby="observation-form-title" className="min-w-0 rounded-xl bg-muted p-1">
          <h2 id="observation-form-title" className="px-4 py-3 text-sm font-semibold">Hasil Pemantauan</h2>
          <Card className="gap-0">
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="risk-score-picker">Skor Risiko Observasi <span className="text-destructive">*</span></Label>
                <p id="observation-score-hint" aria-live="polite" className="text-xs text-muted-foreground">
                  Skor sebelumnya {baselineScore}. {confirmed ? "Skor observasi sudah ditetapkan." : "Tetapkan skor observasi sebelum finalisasi."}
                </p>
              </div>
              <Trigger key={`${current}-${mount}`} {...selection} open={open} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => apply(baseline)}>Gunakan skor sebelumnya</Button>
                <Button variant="outline" size="sm" onClick={(event) => open(event.currentTarget)}>Ubah probabilitas dan dampak</Button>
              </div>
            </CardContent>
            <CardContent className="mt-4 space-y-4 border-t border-border pt-4">
              <div className="grid gap-2">
                <Label htmlFor="prototype-score-reason">Alasan penilaian</Label>
                <Textarea id="prototype-score-reason" placeholder="Jelaskan data atau pertimbangan yang mendasari skor observasi." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prototype-score-conclusion">Simpulan dan tindak lanjut</Label>
                <Textarea id="prototype-score-conclusion" placeholder="Catat temuan dan tindakan yang perlu ditindaklanjuti." />
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="min-w-0 xl:sticky xl:top-6">
          <DetailSidePanel>
            <section aria-labelledby="observation-properties">
              <h2 id="observation-properties" className="text-sm font-semibold">Properti</h2>
              <p className="mt-2 text-sm font-medium">Keterlambatan verifikasi laporan surveilans</p>
              <PropertyList>
                <div className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4">
                  <PropertyLabel>Status</PropertyLabel><dd><Badge variant="secondary">Draf Pemantauan</Badge></dd>
                </div>
                {properties.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4"><PropertyLabel>{label}</PropertyLabel><dd>{value}</dd></div>
                ))}
              </PropertyList>
              <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-xs">
                <p>Profil Risiko Tahunan 2027 · Versi 2</p>
                <p>Semester I · 2027</p>
                <p className="text-muted-foreground">Pengisian 01 Mei 2027–30 Juni 2027 WIB</p>
              </div>
            </section>
          </DetailSidePanel>
        </aside>
      </div>

      {heatmapOpen && (
        <RiskScoreHeatmapModal
          open
          title="Skor risiko observasi"
          {...selection}
          onApply={apply}
          onOpenChange={(next) => {
            setHeatmapOpen(next);
            if (!next) requestAnimationFrame(() => opener.current?.focus());
          }}
        />
      )}
      <VariantPicker names={names} current={current} select={select} />
    </div>
  );
}
