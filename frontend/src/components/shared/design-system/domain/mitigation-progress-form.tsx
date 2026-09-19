"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";

import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CornerDownLeft,
  Plus,
} from "@/components/ui/icons";
import {
  isValidEvidenceUrl,
  parseEvidenceUrls,
  serializeEvidenceUrls,
} from "@/lib/validation/reporting";
import { cn } from "@/lib/utils";

import { MitigationProgressFormShell } from "./mitigation-progress-form-shell";
import { ResourceLinkList, ResourceLinkRow } from "./resource-link-row";
import { FieldErrorMessage } from "../fields/field-error-message";

export type MitigationProgressFormHandle = {
  cancelEvidenceEditor: () => void;
};

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
  evidenceEditorOpen?: boolean;
  onEvidenceEditorOpenChange?: (open: boolean) => void;
  evidenceEditorControlRef?: RefObject<MitigationProgressFormHandle | null>;
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
  evidenceEditorOpen,
  onEvidenceEditorOpenChange,
  evidenceEditorControlRef,
}: MitigationProgressFormProps) {
  const [internalEvidenceEditorOpen, setInternalEvidenceEditorOpen] =
    useState(false);
  const [draftEvidenceUrl, setDraftEvidenceUrl] = useState("");
  const [draftEvidenceError, setDraftEvidenceError] = useState<string>();
  const [evidenceLabels, setEvidenceLabels] = useState<Record<string, string>>(
    {},
  );
  const localEvidenceInputRef = useRef<HTMLInputElement>(null);
  const inputRef = evidenceInputRef ?? localEvidenceInputRef;
  const evidenceUrls = parseEvidenceUrls(evidenceUrl);
  const showEvidenceField =
    evidenceEditorOpen ?? internalEvidenceEditorOpen;

  const setShowEvidenceField = (open: boolean) => {
    if (evidenceEditorOpen === undefined) {
      setInternalEvidenceEditorOpen(open);
    }
    onEvidenceEditorOpenChange?.(open);
  };

  useEffect(() => {
    if (showEvidenceField) inputRef.current?.focus({ preventScroll: true });
  }, [showEvidenceField, inputRef]);

  const revealEvidenceField = () => {
    setDraftEvidenceError(undefined);
    setShowEvidenceField(true);
  };

  const cancelEvidenceDraft = () => {
    setDraftEvidenceUrl("");
    setDraftEvidenceError(undefined);
    setShowEvidenceField(false);
  };

  useImperativeHandle(evidenceEditorControlRef, () => ({
    cancelEvidenceEditor: cancelEvidenceDraft,
  }));

  const saveEvidenceDraft = () => {
    const nextEvidenceUrl = draftEvidenceUrl.trim();
    if (!nextEvidenceUrl) {
      cancelEvidenceDraft();
      return;
    }
    if (!isValidEvidenceUrl(nextEvidenceUrl)) {
      setDraftEvidenceError(
        "Link bukti harus berupa URL http:// atau https:// yang valid.",
      );
      return;
    }

    onEvidenceUrlChange(
      serializeEvidenceUrls([...evidenceUrls, nextEvidenceUrl]),
    );
    cancelEvidenceDraft();
  };

  const saveEvidenceUrl = (
    currentUrl: string,
    nextValue: { name: string; url: string },
  ) => {
    onEvidenceUrlChange(
      serializeEvidenceUrls(
        evidenceUrls.map((evidenceUrl) =>
          evidenceUrl === currentUrl ? nextValue.url : evidenceUrl,
        ),
      ),
    );
    setEvidenceLabels((currentLabels) => {
      const nextLabels = { ...currentLabels };
      delete nextLabels[currentUrl];
      nextLabels[nextValue.url] = nextValue.name;
      return nextLabels;
    });
  };

  const removeEvidenceUrl = (urlToRemove: string) => {
    onEvidenceUrlChange(
      serializeEvidenceUrls(
        evidenceUrls.filter((evidenceUrl) => evidenceUrl !== urlToRemove),
      ),
    );
    setEvidenceLabels((currentLabels) => {
      const nextLabels = { ...currentLabels };
      delete nextLabels[urlToRemove];
      return nextLabels;
    });
  };

  const evidenceAddControl = (
    <div
      role="listitem"
      className="mitigation-evidence-add-item"
      data-expanded={showEvidenceField}
    >
      <div
        className="mitigation-evidence-control"
        data-compact={evidenceUrls.length > 0}
        data-expanded={showEvidenceField}
      >
        <button
          type="button"
          className={cn(
            "mitigation-evidence-trigger flex items-center gap-2 rounded-md p-2 text-left text-sm font-semibold text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            evidenceUrls.length > 0 && "justify-center",
          )}
          onClick={revealEvidenceField}
          aria-label="Tambahkan Link"
          aria-controls={evidenceId}
          aria-expanded={showEvidenceField}
          aria-hidden={showEvidenceField}
          disabled={showEvidenceField}
          tabIndex={showEvidenceField ? -1 : 0}
        >
          <Plus className="size-4 shrink-0" />
          {evidenceUrls.length === 0 ? "Tambahkan Link" : null}
        </button>
        <Input
          id={evidenceId}
          ref={inputRef}
          value={draftEvidenceUrl}
          onChange={(event) => {
            setDraftEvidenceUrl(event.target.value);
            setDraftEvidenceError(undefined);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveEvidenceDraft();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              cancelEvidenceDraft();
            }
          }}
          className="mitigation-evidence-input text-base sm:text-sm"
          placeholder={evidencePlaceholder}
          aria-label="Link Bukti"
          aria-hidden={!showEvidenceField}
          disabled={!showEvidenceField}
          aria-invalid={Boolean(
            (showValidationErrors && evidenceError) || draftEvidenceError,
          )}
          aria-describedby={
            draftEvidenceError
              ? `${evidenceId}-draft-error`
              : showValidationErrors && evidenceError
                ? `${evidenceId}-error`
                : undefined
          }
        />
      </div>
      {showEvidenceField ? (
        <div
          className="mitigation-evidence-shortcuts"
          aria-label="Shortcut input link"
        >
          <span className="inline-flex items-center gap-1">
            <Kbd aria-label="Enter">
              <CornerDownLeft aria-hidden="true" />
            </Kbd>
            Simpan
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd aria-label="Escape">Esc</Kbd>
            Batal
          </span>
        </div>
      ) : null}
    </div>
  );

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
        <FieldErrorMessage id={`${notesId}-error`}>
          {showValidationErrors ? notesError : undefined}
        </FieldErrorMessage>
      </div>

      <div className="flex flex-col gap-2">
        {evidenceUrls.length > 0 ? (
          <ResourceLinkList
            ariaLabel="Daftar link bukti"
            className="items-start gap-x-1.5 gap-y-1.5"
          >
            {evidenceUrls.map((url) => (
              <ResourceLinkRow
                id={url}
                key={url}
                name={evidenceLabels[url] ?? url}
                url={url}
                onSave={(nextValue) => saveEvidenceUrl(url, nextValue)}
                onDelete={() => removeEvidenceUrl(url)}
              />
            ))}
            {evidenceAddControl}
          </ResourceLinkList>
        ) : null}

        {evidenceUrls.length === 0 ? (
          <div className="flex flex-col items-start gap-1.5">
            {evidenceAddControl}
          </div>
        ) : null}
        <FieldErrorMessage id={`${evidenceId}-draft-error`}>
          {draftEvidenceError}
        </FieldErrorMessage>
        <FieldErrorMessage id={`${evidenceId}-error`}>
          {showValidationErrors ? evidenceError : undefined}
        </FieldErrorMessage>
      </div>
    </MitigationProgressFormShell>
  );
}
