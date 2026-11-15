"use client";

import { useState } from "react";
import type { EvaluationAnswer } from "@/types/evaluation";
import { EvaluationAnswerField } from "@/components/evaluation/evaluation-answer-field";
import { AccentButton } from "@/components/shared/design-system/actions/accent-button";
import { EvaluationConclusion, EvaluationDetailLayout, EvaluationItemLayout, EvaluationOverview } from "@/components/evaluation/evaluation-form-layout";
import { FormContainer, FormGroup } from "@/components/shared/design-system/layout/form-container";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EvaluationFormExample() {
  const [answer, setAnswer] = useState<EvaluationAnswer>("unset");
  const [attempted, setAttempted] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  return (
    <>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} />Pratinjau akses parent (hanya baca)</label>
    <EvaluationDetailLayout
      details={
        <EvaluationOverview organization="Unit contoh" status={<Badge variant="secondary">Draf</Badge>} answered={answer === "unset" ? 0 : 1} total={1}>
          <dl>
            <dt className="text-muted-foreground">Dibuat</dt>
            <dd>13 Nov 2026, 09.00</dd>
          </dl>
        </EvaluationOverview>
      }
    >
      <FormContainer title="Hasil Pemantauan dan Evaluasi">
        <FormGroup className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="text-base font-semibold">Pelaksanaan pemantauan</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Tinjau penerapan manajemen risiko di organisasi.</p>
            </div>
            <span className="text-sm text-muted-foreground">Contoh poin evaluasi</span>
          </div>
          <EvaluationItemLayout itemNo="1.1" label="Apakah pemantauan risiko telah dilaksanakan secara berkala?" description="Gunakan kondisi aktual pada periode evaluasi sebagai dasar jawaban." promptId="eval-demo-prompt" answer={
            <EvaluationAnswerField id="eval-demo-answer" promptId="eval-demo-prompt" disabled={readOnly} value={answer} onValueChange={setAnswer} invalid={attempted && answer === "unset"} />
          }>
            <div className="space-y-2"><Label htmlFor="eval-demo-condition" className="font-normal">Uraian kondisi</Label><Textarea disabled={readOnly} id="eval-demo-condition" className="min-h-28 resize-y leading-relaxed" placeholder="Uraikan kondisi aktual yang ditemukan" /></div>
            <div className="space-y-2"><Label htmlFor="eval-demo-analysis" className="font-normal">Keterangan</Label><Textarea disabled={readOnly} id="eval-demo-analysis" className="min-h-28 resize-y leading-relaxed" placeholder="Tuliskan keterangan singkat yang relevan" /></div>
          </EvaluationItemLayout>
          <EvaluationConclusion>
            <Label htmlFor="eval-demo-conclusion" className="font-medium">Kesimpulan bagian</Label>
            <Textarea disabled={readOnly} id="eval-demo-conclusion" className="min-h-28 resize-y leading-relaxed" placeholder="Ringkas hasil evaluasi dan hal yang perlu ditindaklanjuti" />
          </EvaluationConclusion>
        </FormGroup>
      </FormContainer>
      {!readOnly && <AccentButton type="button" onClick={() => {
        setAttempted(true);
        if (answer === "unset") {
          const control = document.getElementById("eval-demo-answer");
          control?.setAttribute("aria-invalid", "true");
          control?.focus();
        }
      }}>Tinjau finalisasi</AccentButton>}
    </EvaluationDetailLayout>
    </>
  );
}
