"use client";

import { EvaluationConclusion, EvaluationItemLayout } from "@/components/evaluation/evaluation-form-layout";
import { FormContainer, FormGroup } from "@/components/shared/design-system/layout/form-container";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function EvaluationFormExample() {
  return (
    <FormContainer title="Hasil Pemantauan dan Evaluasi" description="Isi jawaban, uraian kondisi, dan keterangan untuk setiap poin evaluasi." className="[&_[data-slot=form-header]>div>div]:text-sm">
      <FormGroup className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold">Pelaksanaan pemantauan</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">Tinjau penerapan manajemen risiko di organisasi.</p>
          </div>
          <span className="text-sm text-muted-foreground">Contoh poin evaluasi</span>
        </div>
        <EvaluationItemLayout itemNo="1.1" label="Apakah pemantauan risiko telah dilaksanakan secara berkala?" description="Gunakan kondisi aktual pada periode evaluasi sebagai dasar jawaban." promptId="eval-demo-prompt" answer={
          <>
            <Label htmlFor="eval-demo-answer" className="font-normal">Jawaban</Label>
            <Select defaultValue="unset">
              <SelectTrigger id="eval-demo-answer" aria-describedby="eval-demo-prompt" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="unset">Belum diisi</SelectItem><SelectItem value="yes">Ya</SelectItem><SelectItem value="no">Tidak</SelectItem></SelectContent>
            </Select>
          </>
        }>
          <div className="space-y-2"><Label htmlFor="eval-demo-condition" className="font-normal">Uraian kondisi</Label><Textarea id="eval-demo-condition" className="min-h-28 resize-y leading-relaxed" placeholder="Uraikan kondisi aktual yang ditemukan" /></div>
          <div className="space-y-2"><Label htmlFor="eval-demo-analysis" className="font-normal">Keterangan</Label><Textarea id="eval-demo-analysis" className="min-h-28 resize-y leading-relaxed" placeholder="Tuliskan keterangan singkat yang relevan" /></div>
        </EvaluationItemLayout>
        <EvaluationConclusion>
          <Label htmlFor="eval-demo-conclusion" className="font-medium">Kesimpulan bagian</Label>
          <Textarea id="eval-demo-conclusion" className="min-h-28 resize-y leading-relaxed" placeholder="Ringkas hasil evaluasi dan hal yang perlu ditindaklanjuti" />
        </EvaluationConclusion>
      </FormGroup>
    </FormContainer>
  );
}
