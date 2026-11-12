"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/lib/api";
import { getMitigationTaskReportAction } from "@/lib/mitigation-reporting";
import {
  normalizeMitigationReportPayload,
  validateMitigationReportForm,
  type MitigationReportFormValues,
} from "@/lib/validation/reporting";
import type { MitigationTask } from "@/types/risk";

import { AccentButton } from "../actions/accent-button";
import { ActionButton } from "../actions/action-button";
import { MitigationProgressFlowDialog } from "./mitigation-progress-flow-dialog";

const emptyForm = { notes: "", evidenceUrl: "" };

export function OperatorWorkReportDialog({
  taskId,
  loadTask,
  saveReport,
  onClosed,
}: {
  taskId: string;
  loadTask: (id: string) => Promise<MitigationTask>;
  saveReport: (id: string, values: MitigationReportFormValues) => Promise<MitigationTask>;
  onClosed: (saved: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const [task, setTask] = useState<MitigationTask | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [values, setValues] = useState(emptyForm);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const savedRef = useRef(false);
  const savingRef = useRef(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const evidenceRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const action = task ? getMitigationTaskReportAction(task) : null;
  const errors = validateMitigationReportForm(values);

  useEffect(() => {
    let cancelled = false;
    loadTask(taskId).then((loaded) => {
      if (cancelled) return;
      setTask(loaded);
      setValues({ notes: loaded.notes || "", evidenceUrl: loaded.evidenceUrl || "" });
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    });
    return () => { cancelled = true; };
  }, [taskId, loadTask, attempt]);

  async function submit() {
    if (!task || savingRef.current) return;
    setSubmitError("");
    const currentAction = getMitigationTaskReportAction(task);
    if (!currentAction.allowed) {
      setSubmitError(currentAction.message || "Pelaporan untuk tugas ini sudah ditutup.");
      return;
    }
    if (errors.notes || errors.evidenceUrl) {
      setShowValidationErrors(true);
      requestAnimationFrame(() => (errors.notes ? notesRef : evidenceRef).current?.focus());
      return;
    }

    savingRef.current = true;
    setSubmitting(true);
    try {
      await saveReport(taskId, normalizeMitigationReportPayload(values));
      savedRef.current = true;
      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.status < 500
        ? error.message
        : "Pengiriman belum terkonfirmasi. Isian tetap tersedia. Coba kirim lagi.");
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <MitigationProgressFlowDialog
      open={open}
      onOpenChange={setOpen}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (savedRef.current) toast.success("Laporan penanganan terkirim");
        onClosed(savedRef.current);
      }}
      view={action?.allowed ? "form" : "detail"}
      onViewChange={() => {}}
      detailTitle="Laporan penanganan"
      detailDescription={task ? task.mitigationAction : "Buka laporan untuk tugas ini."}
      detailContent={task ? (
        <p className="text-sm text-muted-foreground" role="status">
          {action?.message || (task.status === "done"
            ? "Laporan untuk tugas ini sudah terkirim."
            : "Laporan untuk tugas ini tidak dapat diisi.")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" role={loadError ? "alert" : "status"}>
          {loadError ? "Laporan belum berhasil dimuat." : "Memuat laporan…"}
        </p>
      )}
      detailAction={loadError ? (
        <ActionButton onClick={() => {
          setLoadError(false);
          setAttempt((value) => value + 1);
        }}>
          Coba lagi
        </ActionButton>
      ) : undefined}
      formTitle={action?.label ?? "Isi laporan"}
      reportTask={task}
      notes={values.notes}
      evidenceUrl={values.evidenceUrl}
      onNotesChange={(notes) => setValues((current) => ({ ...current, notes }))}
      onEvidenceUrlChange={(evidenceUrl) => setValues((current) => ({ ...current, evidenceUrl }))}
      notesInputRef={notesRef}
      evidenceInputRef={evidenceRef}
      notesId={`${formId}-notes`}
      evidenceId={`${formId}-evidence`}
      notesError={errors.notes}
      evidenceError={errors.evidenceUrl}
      showValidationErrors={showValidationErrors}
      dirty={Boolean(task && !savedRef.current && (
        values.notes !== (task.notes || "") || values.evidenceUrl !== (task.evidenceUrl || "")
      ))}
      submitting={submitting}
      submitError={submitError}
      footerActions={
        <AccentButton type="button" onClick={submit} disabled={submitting} aria-busy={submitting}>
          {submitting ? "Mengirim…" : submitError ? "Coba kirim lagi" : "Kirim laporan"}
        </AccentButton>
      }
    />
  );
}
