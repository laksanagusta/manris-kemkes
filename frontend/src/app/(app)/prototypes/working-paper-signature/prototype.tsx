"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkingPaperDetailPanel } from "@/components/shared/design-system/domain/working-paper-detail-panel";
import { WorkingPaperMonitoringQueue } from "@/components/shared/design-system/domain/working-paper-monitoring-queue";
import { FormPage } from "@/components/shared/form-shell";
import { ArrowLeft } from "@/components/shared/icons";
import type { WorkingPaperTimelineItem } from "@/lib/working-paper-detail-view-model";
import type { WorkingPaperQueueRow } from "@/lib/working-paper-monitoring-queue";
import { VariantPicker } from "../_components/variant-picker";
import { Rincian } from "./rincian";
import { Ringkas } from "./ringkas";
import { Terbagi } from "./terbagi";

const variants = [Ringkas, Terbagi, Rincian];
const names = ["Ringkas", "Terbagi", "Rincian"];
const source = "/risk/working-papers/9f5f4a46-af29-441e-b2df-a1ef53fe8be5";
const code = "KK-2027-06-01-1";
const createdAt = "2026-11-22T01:05:00+07:00";
const completedAt = "2026-11-22T03:34:00+07:00";

const rows: WorkingPaperQueueRow[] = [
  { id: "sample-1", code: "R-258", title: "Keterlambatan verifikasi laporan surveilans", versionNumber: 2, status: "final", sourceScore: 18, observedScore: 25, observedLevelLabel: "Sangat Tinggi", observedAt: "2027-06-01" },
  { id: "sample-2", code: "R-259", title: "Ketidaksesuaian stok logistik pemeriksaan", versionNumber: 1, status: "final", sourceScore: 25, observedScore: 9, observedLevelLabel: "Rendah", observedAt: "2027-06-01" },
];

const timeline: WorkingPaperTimelineItem[] = [{
  state: "signed",
  isActionOwner: false,
  label: "Sudah ditandatangani",
  description: "",
  signatory: {
    id: "sample-signer",
    working_paper_id: code,
    user_id: "sample-user",
    sequence_no: 1,
    status: "signed",
    created_at: createdAt,
    signed_at: completedAt,
    signer_name: "Nadia Pratama",
    signer_jabatan: "Prakom",
    signer_pangkat: "IIIa",
  },
}];

export function WorkingPaperSignaturePrototype({ initialVariant }: { initialVariant: number }) {
  const [current, setCurrent] = useState(
    Number.isInteger(initialVariant) && initialVariant >= 1 && initialVariant <= variants.length
      ? initialVariant - 1
      : 0,
  );

  function select(index: number) {
    setCurrent(index);
    const url = new URL(location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (target instanceof HTMLElement && (target.closest("input, textarea, select") || target.isContentEditable)) return;

      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1 && number <= variants.length) select(number - 1);
      else if (event.key === "ArrowRight") select((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") select((current - 1 + variants.length) % variants.length);
      else return;

      event.preventDefault();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [current]);

  const Variant = variants[current];

  return (
    <FormPage>
      <header className="space-y-1">
        <Link href={source} className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Buka dokumen asli
        </Link>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Detail KK Pemantauan dan Reviu</h1>
        <p className="text-sm text-muted-foreground">Prototipe · Data simulasi</p>
      </header>
      <Variant key={current} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <WorkingPaperMonitoringQueue rows={rows} onStart={() => {}} />
        </div>
        <aside aria-label="Rincian KK Pemantauan dan Reviu" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <WorkingPaperDetailPanel
            paper={{
              code,
              status: "completed",
              observation_cutoff: "2027-06-01",
              created_at: createdAt,
              updated_at: completedAt,
              completed_at: completedAt,
            }}
            timeline={timeline}
            periodDetails={
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Semester I · 2027</p>
                <p>Pengisian 01 Mei 2027–30 Juni 2027 WIB.</p>
              </div>
            }
          />
        </aside>
      </div>
      <VariantPicker names={names} current={current} select={select} />
    </FormPage>
  );
}
