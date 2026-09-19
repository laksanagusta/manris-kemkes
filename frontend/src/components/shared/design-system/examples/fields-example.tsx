"use client";

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
    <div className="grid gap-4 rounded-lg bg-card p-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="design-system-field-input">
          Input
          <span className="ml-0.5 text-destructive">*</span>
        </Label>
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
        <p className="text-xs text-muted-foreground">
          40px · 8px radius · blur field kosong untuk melihat validasi
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="design-system-field-select">Popover select</Label>
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
        <p className="text-xs text-muted-foreground">
          Shared option field dengan tinggi, radius, border, dan motion chevron
          yang sama seperti form Risiko dan filter periode
        </p>
      </div>

      <div className="space-y-2 md:col-span-3 lg:col-span-1">
        <Label htmlFor="design-system-field-textarea">Textarea</Label>
        <Textarea
          id="design-system-field-textarea"
          className="min-h-20"
          placeholder="Catatan tambahan"
        />
        <p className="text-xs text-muted-foreground">
          Surface solid dan state interaksi yang sama
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="design-system-field-disabled">Disabled</Label>
        <Input
          id="design-system-field-disabled"
          defaultValue="Read-only value"
          disabled
        />
        <p className="text-xs text-muted-foreground">
          Surface disabled ringan · #f8f8f8 · opacity 100%
        </p>
      </div>
    </div>
  );
}
