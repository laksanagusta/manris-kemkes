"use client";

import { useState } from "react";
import type { EvaluationAnswer } from "@/types/evaluation";
import { EvaluationAnswerField } from "@/components/evaluation/evaluation-answer-field";
import { EvaluationConclusion, EvaluationItemLayout } from "@/components/evaluation/evaluation-form-layout";
import { EvaluationFocusLayout } from "@/components/evaluation/evaluation-focus-layout";
import { AccentButton } from "@/components/shared/design-system/actions/accent-button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EvaluationFormExample() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState<EvaluationAnswer>("unset");
  const [condition, setCondition] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [problems, setProblems] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const answered = Number(answer !== "unset");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} />
        Pratinjau akses parent (hanya baca)
      </label>
      <EvaluationFocusLayout
        steps={[
          { id: "catalog-monitoring", label: "Pelaksanaan pemantauan", title: "Pelaksanaan pemantauan", progress: `${answered}/1` },
          { id: "catalog-report", label: "Permasalahan dan saran", title: "Permasalahan dan saran" },
        ]}
        activeIndex={activeIndex}
        onStepChange={setActiveIndex}
        status={<Badge variant="secondary">Draf</Badge>}
        organization="Unit contoh"
        answered={answered}
        total={1}
        details={<dl className="grid grid-cols-2 gap-3 text-sm"><dt className="text-muted-foreground">Dibuat</dt><dd>13 Nov 2026, 09.00</dd></dl>}
      >
        {activeIndex === 0 ? (
          <>
            <EvaluationItemLayout
              itemNo="1.1"
              label="Apakah pemantauan risiko telah dilaksanakan secara berkala?"
              description="Gunakan kondisi aktual pada periode evaluasi sebagai dasar jawaban."
              promptId="eval-demo-prompt"
              answer={<EvaluationAnswerField id="eval-demo-answer" promptId="eval-demo-prompt" disabled={readOnly} value={answer} onValueChange={setAnswer} invalid={attempted && answer === "unset"} />}
            >
              <div className="space-y-2"><Label htmlFor="eval-demo-condition" className="font-normal">Uraian kondisi</Label><Textarea disabled={readOnly} id="eval-demo-condition" value={condition} onChange={(event) => setCondition(event.target.value)} className="min-h-28 resize-y leading-relaxed" /></div>
              <div className="space-y-2"><Label htmlFor="eval-demo-analysis" className="font-normal">Keterangan</Label><Textarea disabled={readOnly} id="eval-demo-analysis" value={analysis} onChange={(event) => setAnalysis(event.target.value)} className="min-h-28 resize-y leading-relaxed" /></div>
            </EvaluationItemLayout>
            <EvaluationConclusion>
              <Label htmlFor="eval-demo-conclusion">Kesimpulan bagian</Label>
              <Textarea disabled={readOnly} id="eval-demo-conclusion" value={conclusion} onChange={(event) => setConclusion(event.target.value)} className="min-h-28 resize-y leading-relaxed" />
            </EvaluationConclusion>
            {!readOnly && <AccentButton type="button" onClick={() => {
              setAttempted(true);
              if (!answered) document.getElementById("eval-demo-answer")?.focus();
            }}>Tinjau finalisasi</AccentButton>}
          </>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="eval-demo-problems">Permasalahan</Label><Textarea id="eval-demo-problems" disabled={readOnly} value={problems} onChange={(event) => setProblems(event.target.value)} className="min-h-28 resize-y leading-relaxed" /></div>
            <div className="space-y-2"><Label htmlFor="eval-demo-recommendations">Saran perbaikan</Label><Textarea id="eval-demo-recommendations" disabled={readOnly} value={recommendations} onChange={(event) => setRecommendations(event.target.value)} className="min-h-28 resize-y leading-relaxed" /></div>
          </div>
        )}
      </EvaluationFocusLayout>
    </div>
  );
}
