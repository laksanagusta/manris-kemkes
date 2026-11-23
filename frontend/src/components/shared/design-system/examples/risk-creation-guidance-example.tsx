"use client";

import { RiskRevisionReasonCard } from "../domain/risk-revision-reason-card";
import { useState } from "react";
import { RiskCreationContext, RiskFinalizationReview, RiskFormReadiness } from "../domain/risk-creation-guidance";
import { RiskOwnerField } from "@/components/risk/risk-owner-field";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { riskSourceOptions } from "@/lib/risk-source";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import { PopoverSelectField } from "../fields/popover-select-field";

const ownerOptions = [
  { id: "sample-owner-1", name: "Nadia Pratama" },
  { id: "sample-owner-2", name: "Raka Wijaya" },
];

export function RiskCreationGuidanceExample() {
  const [reason, setReason] = useState("");
  const [section, setSection] = useState("identifikasi");
  const [owner, setOwner] = useState<UserPickerOption | null>(ownerOptions[0]);
  const [source, setSource] = useState("internal");
  return <div className="space-y-5">
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <div className="min-w-0 space-y-6 xl:col-start-2 xl:row-start-1">
        <RiskCreationContext saveMessage="Tersimpan pukul 10.30 WIB" />
        <RiskFormReadiness sections={[
          { id: "identifikasi", title: "Identifikasi Risiko", done: true, progress: 100, hint: "Lengkapi identifikasi." },
          { id: "analisis", title: "Analisis Risiko", done: false, progress: 67, hint: "Tetapkan skor risiko saat ini." },
          { id: "evaluasi", title: "Evaluasi Risiko", done: false, progress: 0, hint: "Pilih penanganan." },
          { id: "penanganan", title: "Rencana Penanganan", done: true, progress: 100, hint: "Tambahkan rencana." },
          { id: "target", title: "Target Penurunan", done: false, progress: 0, hint: "Tetapkan target residual." },
        ]} onNavigate={setSection} />
      </div>
      <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-1">
        <RiskOwnerField
          hasOrganization
          value={owner}
          onSelect={setOwner}
          onClear={() => setOwner(null)}
          loadOptions={async ({ q, page, limit }) => {
            const options = ownerOptions.filter(({ name }) => name.toLowerCase().includes(q.toLowerCase()));
            return { options, total: options.length, page, limit };
          }}
        />
        <Field>
          <Label htmlFor="catalog-risk-source">Sumber Risiko</Label>
          <PopoverSelectField id="catalog-risk-source" value={source} onValueChange={setSource} options={riskSourceOptions} placeholder="Pilih sumber risiko" />
        </Field>
        <p role="status" className="text-xs text-muted-foreground">Bagian dipilih {section}</p>
        <RiskFinalizationReview score={14.6} target={5.6} level="Tinggi" mitigationCount={2} />
        <RiskRevisionReasonCard id="catalog-revision-reason" label="Alasan revisi" value={reason} onChange={setReason} required />
      </div>
    </div>
  </div>;
}
