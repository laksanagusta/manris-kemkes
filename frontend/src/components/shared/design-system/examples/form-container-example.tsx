"use client";

import { useState } from "react";

import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

import { FormContainer, FormGroup } from "@/components/shared/design-system";

export function FormContainerExample() {
  const [requireEvidence, setRequireEvidence] = useState(false);

  return (
    <FormContainer
      title="Pengaturan pelaporan"
      description="Tentukan cara laporan diproses dan bukti yang perlu disertakan."
      className="w-full max-w-[55rem]"
    >
      <FormGroup>
        <RadioGroup defaultValue="review" aria-label="Alur pelaporan">
          <div className="flex items-start gap-2">
            <RadioGroupItem id="form-demo-review" value="review" aria-describedby="form-demo-review-help" />
            <div>
              <FieldLabel htmlFor="form-demo-review">Tinjau sebelum finalisasi</FieldLabel>
              <FieldDescription className="text-xs leading-5" id="form-demo-review-help">Reviewer memeriksa laporan sebelum statusnya menjadi final.</FieldDescription>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <RadioGroupItem id="form-demo-direct" value="direct" />
            <FieldLabel htmlFor="form-demo-direct">Finalisasi langsung</FieldLabel>
          </div>
        </RadioGroup>
      </FormGroup>
      <FormGroup>
        <div className="flex items-start gap-2">
          <Switch id="form-demo-evidence" checked={requireEvidence} onCheckedChange={setRequireEvidence} aria-describedby="form-demo-evidence-help" />
          <div>
            <FieldLabel htmlFor="form-demo-evidence">Wajibkan bukti</FieldLabel>
            <FieldDescription className="text-xs leading-5" id="form-demo-evidence-help">Aktifkan untuk mengisi tautan bukti laporan.</FieldDescription>
          </div>
        </div>
      </FormGroup>
      <FormGroup>
        <Field className="gap-2">
          <FieldContent>
            <FieldLabel className="leading-5" htmlFor="form-demo-evidence-url">Tautan bukti</FieldLabel>
            <FieldDescription className="text-xs leading-5" id="form-demo-url-help">Gunakan tautan yang dapat dibuka reviewer.</FieldDescription>
          </FieldContent>
          <Input id="form-demo-evidence-url" type="url" placeholder="https://contoh.id/bukti" aria-describedby="form-demo-url-help" disabled={!requireEvidence} />
        </Field>
      </FormGroup>
    </FormContainer>
  );
}
