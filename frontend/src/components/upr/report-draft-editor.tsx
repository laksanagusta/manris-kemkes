"use client";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AccentButton, ActionButton, CollectionDialogCancel,
  PageStack,
} from "@/components/shared/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth-context";
import { uprApi, type ReportDraft, type ReportDraftInput, type ReportDocumentOption, type SemesterSnapshot } from "@/lib/api/upr-workflow";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import { businessNow } from "@/lib/business-clock";
import { ReportDocumentPicker, type ReportDocumentSelection } from "./report-document-picker";
import { ReportFields } from "./report-fields";
import { WorkflowError, workflowError } from "./workflow-ui";

function newDraftInput(): ReportDraftInput {
  const now = businessNow();
  const { year, month } = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", timeZone: "Asia/Jakarta",
  }).formatToParts(now).map((part) => [part.type, Number(part.value)]));
  return { title: "", year, semester: month > 6 ? 2 : 1, profileId: null, workingPaperIds: [], evaluationId: null, reason: "" };
}

async function loadEditor(token: string, id?: string) {
  const [workspace, draft] = await Promise.all([
    uprApi.workspace(token),
    id ? uprApi.reportDraft(token, id) : Promise.resolve(null),
  ]);
  const input = draft?.input;
  const ids = input
    ? [...input.workingPaperIds, ...(input.profileId ? [input.profileId] : []), ...(input.evaluationId ? [input.evaluationId] : [])]
    : [];
  const documents = input && ids.length
    ? await uprApi.selectedReportDocuments(token, input.year, ids)
    : [];
  return { workspace, draft, documents };
}

export function ReportDraftEditor({ draftId }: { draftId?: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const [editor, setEditor] = useState<Awaited<ReturnType<typeof loadEditor>> | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [initialInput] = useState(newDraftInput);
  const [input, setInput] = useState(initialInput);
  const [preview, setPreview] = useState<SemesterSnapshot | null>(null);
  const [pending, setPending] = useState<"save" | "preview" | "send" | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKind, setPickerKind] = useState<keyof ReportDocumentSelection>("profile");
  const [documents, setDocuments] = useState<ReportDocumentOption[]>([]);
  const pickerTrigger = useRef<HTMLButtonElement>(null);
  const setHeaderActions = useSetHeaderActions();

  useEffect(() => {
    if (!token) return;
    let active = true;
    void loadEditor(token, draftId).then((data) => {
      if (!active) return;
      if (data.draft?.sentId) {
        router.replace(`/laporan/${data.draft.sentId}`);
        return;
      }
      setEditor(data);
      setDocuments(data.documents);
      setDraft(data.draft);
      if (data.draft) setInput(data.draft.input);
    }).catch((cause) => { if (active) setLoadError(workflowError(cause)); });
    return () => { active = false; };
  }, [token, draftId, router, retry]);

  function edit(patch: Partial<ReportDraftInput>) {
    setInput((current) => ({ ...current, ...patch }));
    setPreview(null);
    setError("");
  }

  const dirty = JSON.stringify(input) !== JSON.stringify(draft?.input ?? initialInput);
  useEffect(() => {
    if (!dirty) return;
    function preventLeave(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [dirty]);

  const selection: ReportDocumentSelection = {
    profile: input.profileId ? [input.profileId] : [],
    working_paper: input.workingPaperIds,
    evaluation: input.evaluationId ? [input.evaluationId] : [],
  };
  const selectedProfile = documents.find((option) => option.kind === "profile" && option.id === input.profileId);
  const validYear = Number.isInteger(input.year) && input.year >= 1900 && input.year <= 9998;
  const cutoff = `${input.year}-${input.semester === 1 ? "06-30" : "12-31"}`;
  const needsReason = Boolean(selectedProfile?.finalizedAt && new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta",
  }).format(new Date(selectedProfile.finalizedAt)) > cutoff);
  const hasDocuments = input.workingPaperIds.length > 0 && Boolean(input.evaluationId)
    && input.workingPaperIds.every((id) => documents.some((item) => item.kind === "working_paper" && item.id === id))
    && documents.some((item) => item.kind === "evaluation" && item.id === input.evaluationId);
  const canPrepareSend = Boolean(
    input.title.trim() && selectedProfile && (!needsReason || input.reason.trim())
      && hasDocuments && editor?.workspace.recipient,
  );
  const canSend = Boolean(preview?.reviewKey && canPrepareSend);

  function closePicker() {
    setPickerOpen(false);
    requestAnimationFrame(() => pickerTrigger.current?.focus());
  }

  function applyDocuments(next: ReportDocumentSelection, options: ReportDocumentOption[]) {
    const profileId = next.profile[0] ?? null;
    setDocuments((current) => [...new Map([...current, ...options].map((item) => [item.id, item])).values()]);
    edit({
      profileId,
      workingPaperIds: next.working_paper,
      evaluationId: next.evaluation[0] ?? null,
      ...(profileId === input.profileId ? {} : { reason: "" }),
    });
    closePicker();
  }

  async function persist(activeToken: string) {
    if (draft && !dirty) return draft;
    const saved = draft
      ? await uprApi.updateReportDraft(activeToken, draft.id, input, draft.revision)
      : await uprApi.createReportDraft(activeToken, input);
    setDraft(saved);
    setInput(saved.input);
    return saved;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) return;
    setPending("save");
    setError("");
    try {
      const saved = await persist(token);
      toast.success("Draf laporan disimpan.");
      if (!draftId) router.replace(`/laporan/draf/${saved.id}`);
    } catch (cause) {
      setError(workflowError(cause));
    } finally {
      setPending(null);
    }
  }

  const prepareSend = useCallback(async () => {
    if (!token || !canPrepareSend || pending) return;
    setPending("preview");
    setError("");
    setPreview(null);
    try {
      setPreview(await uprApi.previewReportDraft(token, input));
      setConfirm(true);
    } catch (cause) {
      setError(workflowError(cause));
    } finally {
      setPending(null);
    }
  }, [canPrepareSend, input, pending, token]);

  const canSave = Boolean(token && input.title.trim());
  const headerActions = useMemo(() => (
    <>
      <ActionButton
        type="submit" form="report-draft-form" variant="outline"
        loading={pending === "save"} disabled={Boolean(pending) || !canSave}
      >
        Simpan draf
      </ActionButton>
      <AccentButton
        type="button" aria-busy={pending === "preview"}
        disabled={Boolean(pending) || !canPrepareSend}
        onClick={() => void prepareSend()}
      >
        {pending === "preview" ? "Menyiapkan…" : "Kirim"}
      </AccentButton>
    </>
  ), [canPrepareSend, canSave, pending, prepareSend]);

  useEffect(() => {
    if (!editor || loadError || !token) return;
    setHeaderActions(headerActions);
    return () => setHeaderActions(null);
  }, [editor, headerActions, loadError, setHeaderActions, token]);

  async function send() {
    if (!token || !canSend || !preview?.reviewKey || pending) return;
    setPending("send");
    setError("");
    try {
      const saved = await persist(token);
      const result = await uprApi.sendReportDraft(token, saved.id, saved.revision, preview.reviewKey);
      toast.success("Laporan dikirim ke UPR-T.I.");
      router.replace(`/laporan/${result.id}`);
    } catch (cause) {
      setPreview(null);
      setError(workflowError(cause));
    } finally {
      setPending(null);
      setConfirm(false);
    }
  }

  return (
    <PageStack className="mx-auto max-w-6xl">
      <h1 className="sr-only">{draftId ? "Draf laporan" : "Buat laporan"}</h1>
      {loadError ? (
        <WorkflowError message={loadError} retry={() => { setLoadError(""); setRetry((value) => value + 1); }} />
      ) : !editor ? (
        <p role="status" className="text-sm text-muted-foreground">Memuat draf laporan…</p>
      ) : (
        <>
          <form id="report-draft-form" className="grid gap-6" onSubmit={save} aria-busy={Boolean(pending)}>
            <ReportFields
              input={input} documents={documents} busy={Boolean(pending)} needsReason={needsReason}
              onChange={edit}
              onPick={(kind, trigger) => {
                pickerTrigger.current = trigger;
                setPickerKind(kind);
                setPickerOpen(true);
              }}
              onRemove={(kind, id) => {
                if (kind === "profile") edit({ profileId: null, reason: "" });
                else if (kind === "evaluation") edit({ evaluationId: null });
                else edit({ workingPaperIds: input.workingPaperIds.filter((item) => item !== id) });
              }}
            />
            {!editor.workspace.recipient && <Alert variant="info" role="note"><AlertDescription>Atur tujuan UPR-T.I untuk organisasi Anda sebelum mengirim laporan.</AlertDescription></Alert>}
            {error && <WorkflowError message={error} />}
            {!hasDocuments && <p className="text-sm text-muted-foreground">Pilih minimal satu KK Selesai dan satu Evaluasi Final sebelum mengirim.</p>}
          </form>
          {pickerOpen && token && (
            <ReportDocumentPicker token={token} year={input.year} initialKind={pickerKind} initialSelection={selection} onClose={closePicker} onApply={applyDocuments} />
          )}
          <Dialog open={confirm} onOpenChange={(open) => { if (!pending) setConfirm(open); }}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Kirim laporan?</DialogTitle>
                <DialogDescription>Periksa isi, dokumen pendukung, dan penerima laporan.</DialogDescription>
              </DialogHeader>
              <ConfirmationConsequences>
                Isi laporan dan dokumen pendukung akan dikunci dan dikirim ke {editor.workspace.recipient}.
              </ConfirmationConsequences>
              <DialogFooter>
                <CollectionDialogCancel disabled={Boolean(pending)} onClick={() => setConfirm(false)}>Batal</CollectionDialogCancel>
                <AccentButton disabled={Boolean(pending) || !canSend} aria-busy={pending === "send"} onClick={() => void send()}>
                  {pending === "send" ? "Mengirim…" : "Kirim laporan"}
                </AccentButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </PageStack>
  );
}
