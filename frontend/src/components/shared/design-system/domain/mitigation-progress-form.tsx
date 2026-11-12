"use client";

import type { RefObject } from "react";

import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MitigationProgressFormShell } from "./mitigation-progress-form-shell";
import { FieldErrorMessage } from "../fields/field-error-message";

export type MitigationProgressFormProps = {
  evidenceUrl: string;
  onEvidenceUrlChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  showValidationErrors?: boolean;
  evidenceError?: string;
  notesError?: string;
  evidenceInputRef?: RefObject<HTMLInputElement | null>;
  notesInputRef?: RefObject<HTMLTextAreaElement | null>;
  evidenceId?: string;
  notesId?: string;
  evidencePlaceholder?: string;
  notesPlaceholder?: string;
};

export function MitigationProgressForm({
  evidenceUrl,
  onEvidenceUrlChange,
  notes,
  onNotesChange,
  showValidationErrors,
  evidenceError,
  notesError,
  evidenceInputRef,
  notesInputRef,
  evidenceId = "mitigation-evidence-url",
  notesId = "mitigation-notes",
  evidencePlaceholder = "https://drive.google.com/...",
  notesPlaceholder = "Apa yang sudah dilakukan dan apa kendalanya?",
}: MitigationProgressFormProps) {
  return (
    <MitigationProgressFormShell>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor={notesId}>
            Catatan Pelaksanaan <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldDescription id={`${notesId}-hint`} className="text-xs leading-5">
            Contoh: 3 dari 5 lokasi sudah diperiksa. Dua lokasi menunggu jadwal kunjungan.
          </FieldDescription>
        </FieldContent>
        <Textarea
          id={notesId}
          ref={notesInputRef}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          className=""
          placeholder={notesPlaceholder}
          required
          aria-required="true"
          aria-invalid={Boolean(showValidationErrors && notesError)}
          aria-describedby={
            showValidationErrors && notesError
              ? `${notesId}-hint ${notesId}-error`
              : `${notesId}-hint`
          }
        />
        <FieldErrorMessage id={`${notesId}-error`}>
          {showValidationErrors ? notesError : undefined}
        </FieldErrorMessage>
      </Field>

      <div className="flex flex-col gap-2">
        <Label className="text-sm" htmlFor={evidenceId}>
          Link Bukti <span className="font-normal text-muted-foreground">(opsional)</span>
        </Label>
        <Input
          id={evidenceId}
          ref={evidenceInputRef}
          type="text"
          value={evidenceUrl}
          onChange={(event) => onEvidenceUrlChange(event.target.value)}
          className=""
          placeholder={evidencePlaceholder}
          aria-invalid={Boolean(showValidationErrors && evidenceError)}
          aria-describedby={
            showValidationErrors && evidenceError
              ? `${evidenceId}-error`
              : undefined
          }
        />
        <FieldErrorMessage id={`${evidenceId}-error`}>
          {showValidationErrors ? evidenceError : undefined}
        </FieldErrorMessage>
      </div>
    </MitigationProgressFormShell>
  );
}
