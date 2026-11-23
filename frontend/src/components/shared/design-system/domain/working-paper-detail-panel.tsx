"use client";

import { useId, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { createDisplayDateFormatter } from "@/lib/display-date";
import type { WorkingPaperTimelineItem } from "@/lib/working-paper-detail-view-model";
import type { WorkingPaper } from "@/types/working-paper";
import { CollectionCode } from "../collections/collection-code";
import { DetailSidePanel } from "../layout/detail-side-panel";
import { PropertyLabel, PropertyList } from "../layout/property-list";
import { WorkingPaperSignatureTimeline } from "./working-paper-signature-timeline";

const statuses = {
  draft: { label: "Draf", tone: "neutral" },
  signing: { label: "Proses Tanda Tangan", tone: "progress" },
  completed: { label: "Selesai", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "danger" },
} as const;

const date = createDisplayDateFormatter("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
const dateTime = createDisplayDateFormatter("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,44fr)_minmax(0,56fr)] gap-4">
      <PropertyLabel>{label}</PropertyLabel>
      <dd className="min-w-0 wrap-anywhere">{children}</dd>
    </div>
  );
}

function DocumentDate({ value, showTime = false, fallback = "—" }: { value?: string; showTime?: boolean; fallback?: string }) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return fallback;
  return <time dateTime={value}>{(showTime ? dateTime : date).format(parsed)}</time>;
}

export function WorkingPaperDetailPanel({ paper, timeline, periodDetails }: {
  paper: Pick<WorkingPaper, "code" | "status" | "observation_cutoff" | "created_at" | "updated_at" | "completed_at" | "cancelled_at">;
  timeline: WorkingPaperTimelineItem[];
  periodDetails?: ReactNode;
}) {
  const id = useId();
  const { label, tone } = statuses[paper.status];
  const activity = paper.status === "completed"
    ? { label: "Selesai pada", value: paper.completed_at }
    : paper.status === "cancelled"
      ? { label: "Dibatalkan pada", value: paper.cancelled_at }
      : { label: "Diperbarui pada", value: paper.updated_at };

  return (
    <DetailSidePanel>
      <section aria-labelledby={`${id}-properties`}>
        <h2 id={`${id}-properties`} className="text-sm font-semibold text-primary">Properti</h2>
        <PropertyList>
          <Property label="Kode">
            <span className="font-mono [&>span]:max-w-full [&>span>span]:min-w-0 [&>span>span]:shrink [&>span>span]:whitespace-normal [&>span>span]:wrap-anywhere">
              <CollectionCode code={paper.code} />
            </span>
          </Property>
          <Property label="Status"><Badge variant={toBadgeVariant(tone)} className={getStatusBadgeClassName(tone)}>{label}</Badge></Property>
          <Property label="Tanggal batas pengamatan"><DocumentDate value={paper.observation_cutoff} fallback="Belum tercatat" /></Property>
          <Property label="Dibuat pada"><DocumentDate value={paper.created_at} /></Property>
          <Property label={activity.label}><DocumentDate value={activity.value} showTime /></Property>
        </PropertyList>
        {periodDetails && <div className="mt-3">{periodDetails}</div>}
      </section>

      <section aria-labelledby={`${id}-signatures`} className="space-y-3 border-t border-dashed border-border pt-5">
        <h2 id={`${id}-signatures`} className="text-sm font-semibold text-primary">Histori Tanda Tangan</h2>
        <WorkingPaperSignatureTimeline timeline={timeline} />
      </section>
    </DetailSidePanel>
  );
}
