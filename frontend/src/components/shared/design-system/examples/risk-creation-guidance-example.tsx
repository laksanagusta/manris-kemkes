"use client";

import { useState } from "react";
import { RiskCreationContext, RiskFinalizationReview, RiskFormReadiness } from "../domain/risk-creation-guidance";

export function RiskCreationGuidanceExample() {
  const [section, setSection] = useState("identifikasi");
  return <div className="space-y-5">
    <RiskCreationContext cycle="2027-Q2" originalCycle="2027-Q1" saveMessage="Tersimpan pukul 10.30 WIB" />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
      <div className="min-w-0 xl:col-start-2 xl:row-start-1">
        <RiskFormReadiness sections={[
          { id: "identifikasi", title: "Identifikasi Risiko", done: true, progress: 100, hint: "Lengkapi identifikasi." },
          { id: "analisis", title: "Analisis Risiko", done: false, progress: 67, hint: "Tetapkan skor risiko saat ini." },
          { id: "evaluasi", title: "Evaluasi Risiko", done: false, progress: 0, hint: "Pilih penanganan." },
          { id: "penanganan", title: "Rencana Penanganan", done: true, progress: 100, hint: "Tambahkan rencana." },
          { id: "target", title: "Target Penurunan", done: false, progress: 0, hint: "Tetapkan target residual." },
        ]} onNavigate={setSection} />
      </div>
      <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-1">
        <p role="status" className="text-xs text-muted-foreground">Bagian dipilih {section}</p>
        <RiskFinalizationReview cycle="2027-Q2" originalCycle="2027-Q1" score={15} target={6} level="Tinggi" mitigationCount={2} />
      </div>
    </div>
  </div>;
}
