"use client";

import { useEffect, useState } from "react";
import { AccentButton, CollectionDialogCancel, CollectionSearchField, ActionButton } from "@/components/shared/design-system";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uprApi, type ReportDocumentKind, type ReportDocumentOption } from "@/lib/api/upr-workflow";
import { WorkflowError, workflowDate, workflowError } from "./workflow-ui";

export const reportDocumentKinds = {
  profile: "Profil Risiko Tahunan",
  working_paper: "KK Pemantauan dan Reviu",
  evaluation: "Evaluasi",
} satisfies Record<ReportDocumentKind, string>;

export type ReportDocumentSelection = Record<ReportDocumentKind, string[]>;

export function ReportDocumentPicker({
  token, year, initialSelection, initialKind = "profile", onClose, onApply,
}: {
  token: string;
  year: number;
  initialSelection: ReportDocumentSelection;
  initialKind?: ReportDocumentKind;
  onClose: () => void;
  onApply: (selection: ReportDocumentSelection, options: ReportDocumentOption[]) => void;
}) {
  const [selection, setSelection] = useState(initialSelection);
  const [chosen, setChosen] = useState<Record<string, ReportDocumentOption>>({});
  const [kind, setKind] = useState<ReportDocumentKind>(initialKind);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items: ReportDocumentOption[];
    hasMore: boolean;
    error: string;
  } | null>(null);
  const term = query.trim();
  const requestKey = JSON.stringify([kind, year, term, page, retry]);
  const current = result?.key === requestKey ? result : null;
  const items = current?.items ?? [];

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void uprApi.searchReportDocuments(token, kind, year, term, page, controller.signal).then((data) => {
        if (!controller.signal.aborted) setResult({ ...data, key: requestKey, error: "" });
      }).catch((cause) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, items: [], hasMore: false, error: workflowError(cause) });
        }
      });
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [kind, page, requestKey, term, token, year]);

  function select(item: ReportDocumentOption, checked: boolean) {
    setChosen((options) => ({ ...options, [item.id]: item }));
    setSelection((previous) => ({
      ...previous,
      [kind]: kind === "working_paper"
        ? checked ? [...previous[kind], item.id] : previous[kind].filter((id) => id !== item.id)
        : [item.id],
    }));
  }

  const rows = items.map((item) => {
    const id = `pick-report-document-${item.id}`;
    const checked = selection[kind].includes(item.id);
    return (
      <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
        {kind === "working_paper" ? (
          <Checkbox id={id} checked={checked} disabled={!checked && selection[kind].length >= 50}
            onCheckedChange={(value) => select(item, value === true)} />
        ) : (
          <RadioGroupItem id={id} value={item.id} />
        )}
        <Label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1">
          <span className="wrap-anywhere">{item.title}</span>
          <span className="text-xs font-normal text-muted-foreground">{item.code} · {workflowDate(item.documentDate)}</span>
        </Label>
      </div>
    );
  });
  const count = Object.values(selection).reduce((total, ids) => total + ids.length, 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-4 sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Tambahkan dokumen pendukung</DialogTitle>
          <DialogDescription>Pilih profil tahun {year}, KK yang sudah Selesai, dan Evaluasi yang sudah Final.</DialogDescription>
        </DialogHeader>
        <Tabs value={kind} onValueChange={(value) => {
          setKind(value as ReportDocumentKind);
          setQuery("");
          setPage(1);
        }}>
          <TabsList aria-label="Jenis dokumen" className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="profile">Profil risiko</TabsTrigger>
            <TabsTrigger value="working_paper">KK Pemantauan</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluasi</TabsTrigger>
          </TabsList>
        </Tabs>
        <CollectionSearchField
          aria-label={`Cari ${reportDocumentKinds[kind]}`}
          placeholder="Cari judul, kode, atau tanggal…"
          value={query} maxLength={160}
          containerClassName="sm:w-full"
          onChange={(event) => { setQuery(event.target.value); setPage(1); }}
        />
        <div className="grid min-h-32 content-start gap-3" aria-busy={!current}>
          {!current ? (
            <p role="status" className="text-sm text-muted-foreground">Mencari dokumen…</p>
          ) : current.error ? (
            <WorkflowError message={current.error} retry={() => setRetry((value) => value + 1)} />
          ) : items.length === 0 ? (
            <p role="status" className="text-sm text-muted-foreground">{term ? "Tidak ada dokumen yang cocok." : "Belum ada dokumen yang tersedia."}</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {kind === "working_paper" ? (
                <div role="group" aria-label={reportDocumentKinds[kind]} className="divide-y divide-border">{rows}</div>
              ) : (
                <RadioGroup
                  aria-label={reportDocumentKinds[kind]}
                  className="divide-y divide-border gap-0"
                  value={selection[kind][0] ?? ""}
                  onValueChange={(id) => {
                    const item = items.find((option) => option.id === id);
                    if (item) select(item, true);
                  }}
                >{rows}</RadioGroup>
              )}
            </div>
          )}
          {(page > 1 || current?.hasMore) && (
            <div className="flex items-center justify-between gap-2">
              <ActionButton type="button" variant="outline" size="sm" disabled={page === 1 || !current} onClick={() => setPage(page - 1)}>Sebelumnya</ActionButton>
              <span className="text-xs text-muted-foreground">Halaman {page}</span>
              <ActionButton type="button" variant="outline" size="sm" disabled={!current?.hasMore} onClick={() => setPage(page + 1)}>Berikutnya</ActionButton>
            </div>
          )}
        </div>
        <DialogFooter>
          <span className="self-center text-sm text-muted-foreground sm:me-auto">{count} dipilih</span>
          <CollectionDialogCancel type="button" onClick={onClose}>Batal</CollectionDialogCancel>
          <AccentButton type="button" onClick={() => onApply(selection, Object.values(chosen))}>Terapkan pilihan</AccentButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
