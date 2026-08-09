"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MitigationProgressFormShell } from "./mitigation-progress-form-shell";

export type MitigationProgressFormProps = {
  evidenceUrl: string;
  onEvidenceUrlChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  showValidationErrors?: boolean;
  evidenceError?: string;
  notesError?: string;
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
  evidenceId = "mitigation-evidence-url",
  notesId = "mitigation-notes",
  evidencePlaceholder = "https://drive.google.com/...",
  notesPlaceholder = "Jelaskan pencapaian atau kendala yang dihadapi...",
}: MitigationProgressFormProps) {
  return (
    <MitigationProgressFormShell>
      <div className="space-y-1.5">
        <Label className="text-xs" htmlFor={evidenceId}>
          Link Bukti / Evidence
        </Label>
        <Input
          id={evidenceId}
          value={evidenceUrl}
          onChange={(event) => onEvidenceUrlChange(event.target.value)}
          className="text-xs"
          placeholder={evidencePlaceholder}
          aria-invalid={Boolean(showValidationErrors && evidenceError)}
          aria-describedby={
            showValidationErrors && evidenceError
              ? `${evidenceId}-error`
              : undefined
          }
        />
        {showValidationErrors && evidenceError ? (
          <p id={`${evidenceId}-error`} className="text-[11px] text-destructive">
            {evidenceError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs" htmlFor={notesId}>
          Catatan Pelaksanaan
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          className="min-h-[80px] text-xs"
          placeholder={notesPlaceholder}
          aria-invalid={Boolean(showValidationErrors && notesError)}
          aria-describedby={
            showValidationErrors && notesError ? `${notesId}-error` : undefined
          }
        />
        {showValidationErrors && notesError ? (
          <p id={`${notesId}-error`} className="text-[11px] text-destructive">
            {notesError}
          </p>
        ) : null}
      </div>
    </MitigationProgressFormShell>
  );
}
