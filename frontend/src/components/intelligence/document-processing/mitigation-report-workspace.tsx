"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "@/components/ui/icons";
import {
  AccentButton,
  MitigationProgressDialog,
} from "@/components/shared/design-system";
import { api } from "@/lib/api";
import { validateMitigationReportForm } from "@/lib/validation/reporting";
import {
  loadLatestProcessingJob,
  markProcessingFindingHandled,
} from "@/lib/document-processing/storage";
import type { Finding } from "@/types/document-processing";
import { DocumentProcessingWorkspace } from "./document-processing-workspace";

export function MitigationReportWorkspace({
  authToken,
  organizationId,
}: {
  authToken?: string;
  organizationId?: string;
}) {
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [reportedFindingIds, setReportedFindingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const notesInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setReportedFindingIds(
      new Set(
        loadLatestProcessingJob("mitigation_report_mapper")?.handledFindingIds ??
          [],
      ),
    );
  }, []);

  const formErrors = useMemo(
    () => validateMitigationReportForm({ evidenceUrl, notes }),
    [evidenceUrl, notes],
  );
  const hasFormErrors = Object.keys(formErrors).length > 0;

  function openReport(finding: Finding) {
    if (!finding.taskId || reportedFindingIds.has(finding.id)) return;
    setSelectedFinding(finding);
    setEvidenceUrl("");
    setNotes(finding.summary);
    setShowValidationErrors(false);
    setShowDialog(true);
  }

  async function submitReport() {
    if (!selectedFinding?.taskId || !authToken) return;
    if (hasFormErrors) {
      setShowValidationErrors(true);
      window.requestAnimationFrame(() => {
        if (formErrors.evidenceUrl) evidenceInputRef.current?.focus();
        else if (formErrors.notes) notesInputRef.current?.focus();
      });
      toast.error("Lengkapi seluruh field wajib sebelum mengirim laporan.");
      return;
    }

    setSubmitting(true);
    try {
      await api.put(
        `/mitigation-tasks/${selectedFinding.taskId}/report`,
        { status: "done", evidenceUrl, notes },
        authToken,
      );
      setReportedFindingIds((current) => {
        const next = new Set(current);
        next.add(selectedFinding.id);
        return next;
      });
      markProcessingFindingHandled("mitigation_report_mapper", selectedFinding.id);
      setShowDialog(false);
      toast.success("Progress berhasil dilaporkan!");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim laporan progress");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <DocumentProcessingWorkspace
        authToken={authToken}
        organizationId={organizationId}
        analysisMode="mitigation_report_mapper"
        heading="Impor laporan mitigasi"
        description="Unggah satu laporan. Manris akan mencocokkan isinya dengan task penanganan yang masih terbuka."
        onUseMitigationReport={openReport}
        reportedFindingIds={reportedFindingIds}
      />

      <MitigationProgressDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Lapor Progress Penanganan"
        evidenceUrl={evidenceUrl}
        onEvidenceUrlChange={setEvidenceUrl}
        notes={notes}
        onNotesChange={setNotes}
        showValidationErrors={showValidationErrors}
        evidenceError={formErrors.evidenceUrl}
        notesError={formErrors.notes}
        evidenceInputRef={evidenceInputRef}
        notesInputRef={notesInputRef}
        evidenceId="document-mitigation-evidence-url"
        notesId="document-mitigation-notes"
        footerActions={
          <AccentButton
            onClick={submitReport}
            disabled={submitting}
            aria-busy={submitting}
            icon={
              submitting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Send className="size-3" />
              )
            }
          >
            {submitting ? "Mengirim..." : "Kirim Laporan"}
          </AccentButton>
        }
      />
    </>
  );
}
