"use client";

import type { RefObject } from "react";

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
  notesPlaceholder = "Jelaskan pencapaian atau kendala yang dihadapi...",
}: MitigationProgressFormProps) {
  return (
    <MitigationProgressFormShell>
      <div className="flex flex-col gap-2">
        <Label className="text-sm" htmlFor={notesId}>
          Catatan Pelaksanaan
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Textarea
          id={notesId}
          ref={notesInputRef}
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          className="min-h-[80px] text-base sm:text-sm"
          placeholder={notesPlaceholder}
          required
          aria-required="true"
          aria-invalid={Boolean(showValidationErrors && notesError)}
          aria-describedby={
            showValidationErrors && notesError ? `${notesId}-error` : undefined
          }
        />
        {showValidationErrors && notesError ? (
          <p
            id={`${notesId}-error`}
            role="alert"
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150 motion-safe:ease-(--ease-out) text-xs leading-5 text-destructive"
          >
            {notesError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm" htmlFor={evidenceId}>
          Link Bukti / Evidence
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (opsional)
          </span>
        </Label>
        <Input
          id={evidenceId}
          ref={evidenceInputRef}
          value={evidenceUrl}
          onChange={(event) => onEvidenceUrlChange(event.target.value)}
          className="text-base sm:text-sm"
          placeholder={evidencePlaceholder}
          aria-invalid={Boolean(showValidationErrors && evidenceError)}
          aria-describedby={
            showValidationErrors && evidenceError
              ? `${evidenceId}-error`
              : undefined
          }
        />
        {showValidationErrors && evidenceError ? (
          <p
            id={`${evidenceId}-error`}
            role="alert"
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150 motion-safe:ease-(--ease-out) text-xs leading-5 text-destructive"
          >
            {evidenceError}
          </p>
        ) : null}
      </div>
    </MitigationProgressFormShell>
  );
}
