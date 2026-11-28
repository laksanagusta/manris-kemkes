"use client";

import { useState } from "react";
import { RiskArchiveStack, RiskArchiveSection } from "../domain/risk-archive-form";
import { FormGroup } from "../layout/form-container";

const sections = [
  { id: "archive-example-identifikasi", title: "Identifikasi Risiko", description: "Tentukan konteks risiko, penyebab utama, dan dampak yang paling relevan.", complete: true, label: "Risiko", value: "Distribusi obat terlambat" },
  { id: "archive-example-analisis", title: "Analisis Risiko", description: "Nilai pengendalian yang sudah ada lalu tetapkan skor probabilitas dan dampak.", label: "Skor risiko", value: "12 · Sedang" },
  { id: "archive-example-evaluasi", title: "Evaluasi Risiko", description: "Tinjau prioritas dan pilih cara menangani risiko sebelum finalisasi.", label: "Strategi", value: "Mitigasi" },
  { id: "archive-example-penanganan", title: "Rencana Penanganan", description: "Tentukan tindakan baru beserta PIC dan tenggatnya.", complete: true, label: "Tindakan", value: "Konfirmasi jadwal dengan penyedia." },
  { id: "archive-example-target", title: "Target Penurunan", description: "Tetapkan kondisi risiko yang ingin dicapai setelah penanganan dilaksanakan.", label: "Target skor", value: "6 · Rendah" },
];

export function RiskArchiveFormExample() {
  const [active, setActive] = useState(sections[0].id);

  return (
    <div className="max-h-88 min-w-0 overflow-y-auto rounded-xl bg-workspace p-3">
      <RiskArchiveStack sections={sections} active={active} onSelect={setActive}>
        {sections.map(({ id, label, value }) => (
          <RiskArchiveSection key={id} id={id}>
            <FormGroup>
              <dl>
                <dt className="mb-1 text-secondary-foreground">{label}</dt>
                <dd>{value}</dd>
              </dl>
            </FormGroup>
          </RiskArchiveSection>
        ))}
      </RiskArchiveStack>
    </div>
  );
}
