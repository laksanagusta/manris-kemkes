"use client";

import { useState } from "react";
import { FindingsReviewPanel } from "@/components/intelligence/document-processing/completed-results";
import { RiskEventFormDialog } from "@/app/(app)/risk-events/_components/risk-event-form-sheet";
import type { Finding, ProcessingJob } from "@/types/document-processing";

const finding: Finding = {
  id: "example-event", kind: "risk-event", title: "Layanan pelaporan berhenti selama empat jam", summary: "Petugas tidak dapat mengirim laporan selama gangguan.",
  severity: "low", category: "Kejadian aktual", confidence: 0.95, groupId: "example",
  source: { documentId: "example-doc", documentName: "Laporan kejadian.pdf", pageNumber: 1, location: "Halaman 1", quote: "Pada 3 Oktober 2026, layanan pelaporan berhenti selama empat jam. Petugas tidak dapat mengirim laporan." },
  recommendedAction: "Lengkapi tingkat kejadian dan penanganan yang diketahui. Pilih risiko terkait secara manual.",
  eventDraft: { clientKey: "example-key", event: { description: "Layanan pelaporan berhenti selama empat jam", occurredAt: "2026-10-03", impactTypes: ["service"], actualImpact: "Petugas tidak dapat mengirim laporan.", disruptionDuration: "4 jam" },
    missingFields: ["Tingkat kejadian", "Penanganan langsung", "Kondisi setelah penanganan"], confidence: 95,
    sourceRefs: [{ location: "Halaman 1", quote: "Pada 3 Oktober 2026, layanan pelaporan berhenti selama empat jam. Petugas tidak dapat mengirim laporan." }] },
};
const job: ProcessingJob = { id: "example-job", mode: "risk_event_extraction", name: "Contoh ekstraksi kejadian", status: "completed", createdAt: "2026-10-04", updatedAt: "2026-10-04", documents: [], pages: [], groups: [], tasks: [], events: [], findings: [finding], progress: 100 };

export function RiskEventExtractionExample() {
  const [selected, setSelected] = useState<Finding | null>(null);
  return <div className="w-full max-w-3xl space-y-4">
    <FindingsReviewPanel job={job} onUseRiskEvent={setSelected} onStartNew={() => setSelected(null)} />
    {selected?.eventDraft ? <RiskEventFormDialog key={selected.id} open token="" onOpenChange={(open) => { if (!open) setSelected(null); }}
      initialDraft={{ ...selected.eventDraft.event, financialLoss: selected.eventDraft.event.financialLoss ?? undefined, financialLossKnown: selected.eventDraft.event.financialLossKnown ?? undefined, sourceDocumentName: selected.source.documentName, sourceRefs: selected.eventDraft.sourceRefs }} missingFields={selected.eventDraft.missingFields}
      onCreated={() => setSelected(null)} /> : null}
  </div>;
}
