"use client";

import type { EvaluationAnswer } from "@/types/evaluation";
import { FieldErrorMessage } from "@/components/shared/design-system/fields/field-error-message";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EvaluationAnswerField({ id, promptId, value, onValueChange, disabled, invalid = false }: {
  id: string;
  promptId: string;
  value: EvaluationAnswer;
  onValueChange: (value: EvaluationAnswer) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <>
      <Label htmlFor={id} className="text-sm font-normal text-foreground">Jawaban</Label>
      <Select value={value} onValueChange={(answer) => onValueChange(answer as EvaluationAnswer)} disabled={disabled}>
        <SelectTrigger id={id} aria-invalid={invalid} aria-describedby={`${promptId}${invalid ? ` ${errorId}` : ""}`} className="w-full">
          <SelectValue placeholder="Ya/Tidak" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unset">Belum diisi</SelectItem>
          <SelectItem value="yes">Ya</SelectItem>
          <SelectItem value="no">Tidak</SelectItem>
        </SelectContent>
      </Select>
      <FieldErrorMessage id={errorId}>{invalid ? "Pilih Ya atau Tidak sebelum finalisasi." : null}</FieldErrorMessage>
    </>
  );
}
