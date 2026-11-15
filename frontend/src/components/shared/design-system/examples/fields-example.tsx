"use client";

import { FieldHeading } from "@/components/ui/field";
import { useState } from "react";

import {
  FieldErrorMessage,
  Input,
  PopoverSelectField,
  Textarea,
} from "@/components/shared/design-system";
import { Label } from "@/components/ui/label";

export function FieldsExample() {
  const [status, setStatus] = useState("aktif");
  const [riskName, setRiskName] = useState("");
  const [riskNameTouched, setRiskNameTouched] = useState(false);
  const riskNameError =
    riskNameTouched && !riskName.trim() ? "Nama risiko wajib diisi." : undefined;

  return (
    <div className="grid gap-4 rounded-(--surface-radius) bg-card p-4 shadow-black md:grid-cols-3">
      <div className="space-y-2">
        <FieldHeading>
          <Label htmlFor="design-system-field-input">
            Input
            <span className="ml-0.5 text-destructive">*</span>
          </Label>
          <p className="leading-4 text-xs text-muted-foreground">
            40px · 8px radius · blur field kosong untuk melihat validasi
          </p>
        </FieldHeading>
        <Input
          id="design-system-field-input"
          placeholder="Nama risiko"
          value={riskName}
          onChange={(event) => setRiskName(event.target.value)}
          onBlur={() => setRiskNameTouched(true)}
          aria-invalid={Boolean(riskNameError)}
          aria-describedby={
            riskNameError ? "design-system-field-input-error" : undefined
          }
        />
        <FieldErrorMessage id="design-system-field-input-error">
          {riskNameError}
        </FieldErrorMessage>
      </div>

      <div className="space-y-2">
        <FieldHeading>
          <Label htmlFor="design-system-field-select">Popover select</Label>
          <p className="leading-4 text-xs text-muted-foreground">
            Shared option field dengan tinggi, radius, border, dan motion chevron
            yang sama seperti form Risiko dan filter periode
          </p>
        </FieldHeading>
        <PopoverSelectField
          id="design-system-field-select"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "aktif", label: "Aktif" },
            { value: "draft", label: "Draft" },
          ]}
          placeholder="Pilih status"
        />
      </div>

      <div className="space-y-2 md:col-span-3 lg:col-span-1">
        <FieldHeading>
          <Label htmlFor="design-system-field-textarea">Textarea</Label>
          <p className="leading-4 text-xs text-muted-foreground">
            Surface solid dan state interaksi yang sama
          </p>
        </FieldHeading>
        <Textarea
          id="design-system-field-textarea"
          className=""
          placeholder="Catatan tambahan"
        />
      </div>

      <div className="space-y-2">
        <FieldHeading>
          <Label htmlFor="design-system-field-disabled">Disabled</Label>
          <p className="leading-4 text-xs text-muted-foreground">
            Surface disabled ringan · #f8f8f8 · opacity 100%
          </p>
        </FieldHeading>
        <Input
          id="design-system-field-disabled"
          defaultValue="Read-only value"
          disabled
        />
      </div>
      <div className="min-w-0 space-y-2">
        <FieldHeading>
          <Label htmlFor="design-system-field-long-instruction">Catatan pengamatan risiko lintas unit</Label>
          <p id="design-system-field-long-instruction-help" className="text-xs text-muted-foreground">
            Jelaskan kondisi yang diamati, unit yang terlibat, dan tindak lanjut yang diperlukan.
            Instruksi panjang tetap membungkus di dalam kolom dan menyatu dengan label.
          </p>
        </FieldHeading>
        <Textarea id="design-system-field-long-instruction" aria-describedby="design-system-field-long-instruction-help" placeholder="Tulis hasil pengamatan" />
      </div>
    </div>
  );
}
