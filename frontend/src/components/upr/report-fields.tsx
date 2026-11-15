"use client";

import { FieldHeading } from "@/components/ui/field";
import Link from "next/link";
import { Trash2 } from "@/components/shared/icons";
import { ActionButton, FormContainer, FormGroup } from "@/components/shared/design-system";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ReportDraftInput, ReportDocumentOption, ReportDocumentKind } from "@/lib/api/upr-workflow";
import { reportDocumentKinds } from "./report-document-picker";
import { periodLabel, workflowDate } from "./workflow-ui";

export function ReportFields({
  input, documents, readOnly = false, busy = false, needsReason = false, onChange, onPick, onRemove,
}: {
  input: ReportDraftInput;
  documents: ReportDocumentOption[];
  readOnly?: boolean;
  busy?: boolean;
  needsReason?: boolean;
  onChange?: (patch: Partial<ReportDraftInput>) => void;
  onPick?: (kind: ReportDocumentKind, trigger: HTMLButtonElement) => void;
  onRemove?: (kind: ReportDocumentKind, id: string) => void;
}) {
  const disabled = readOnly || busy;
  const validYear = Number.isInteger(input.year) && input.year >= 1900 && input.year <= 9998;
  const selection = {
    profile: input.profileId ? [input.profileId] : [],
    working_paper: input.workingPaperIds,
    evaluation: input.evaluationId ? [input.evaluationId] : [],
  };

  return (
    <>
      <FormContainer title="Isi laporan">
        <FormGroup className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="report-title">Judul laporan</Label>
            <Input id="report-title" required maxLength={160} value={input.title} disabled={disabled}
              onChange={(event) => onChange?.({ title: event.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="report-year">Tahun laporan</Label>
              <Input id="report-year" type="number" min={1900} max={9998} required value={input.year || ""} disabled={disabled}
                onChange={(event) => onChange?.({ year: Number(event.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-semester">Semester</Label>
              <Select value={String(input.semester)} disabled={disabled}
                onValueChange={(value) => onChange?.({ semester: Number(value) })}>
                <SelectTrigger id="report-semester" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="1">Semester I</SelectItem><SelectItem value="2">Semester II</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </FormGroup>
      </FormContainer>
      <section className="grid gap-4" aria-labelledby="supporting-documents-title">
        <h2 id="supporting-documents-title" className="text-sm font-normal text-secondary-foreground">Data pendukung</h2>
        <div className="grid gap-4">
          {(Object.keys(reportDocumentKinds) as ReportDocumentKind[]).map((kind) => (
            <FormContainer key={kind} title={reportDocumentKinds[kind]}>
              <FormGroup className="grid gap-2">
                {selection[kind].length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Belum dipilih</p>
                    {!readOnly && (
                      <ActionButton type="button" disabled={busy || !validYear}
                        onClick={(event) => onPick?.(kind, event.currentTarget)}
                      >Pilih {reportDocumentKinds[kind]}</ActionButton>
                    )}
                  </div>
                ) : (
                  <ul className="grid gap-2">
                    {selection[kind].map((id) => {
                      const document = documents.find((item) => item.id === id && item.kind === kind);
                      const title = document ? (
                        <>
                          <p className="wrap-anywhere text-sm">{document.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {document.code} · {document.period ? `${periodLabel(document.period)} · ` : ""}{workflowDate(document.documentDate)}
                          </p>
                        </>
                      ) : <p className="text-sm text-muted-foreground">Dokumen tidak tersedia</p>;
                      return (
                        <li key={id} className="grid gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {document ? (
                              <Link
                                href={kind === "profile" ? `/risk/annual-profiles/${input.year}?versi=${encodeURIComponent(id)}` : kind === "working_paper" ? `/risk/working-papers/${encodeURIComponent(id)}` : `/evaluations/${encodeURIComponent(id)}`}
                                className="min-w-0 flex-1 rounded-sm no-underline hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                              >{title}</Link>
                            ) : title}
                            {!readOnly && (
                              <ActionButton type="button" variant="ghost" size="icon-sm" disabled={busy}
                                title={`Hapus ${document?.code || reportDocumentKinds[kind]}`}
                                aria-label={`Hapus ${document?.code || reportDocumentKinds[kind]}`}
                                onClick={() => onRemove?.(kind, id)}
                              ><Trash2 aria-hidden="true" className="size-4" /></ActionButton>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </FormGroup>
            </FormContainer>
          ))}
          {(needsReason || (readOnly && input.reason)) && (
            <div className="grid gap-2">
              <FieldHeading>
                <Label htmlFor="report-reason">Alasan memilih versi profil</Label>
                {!readOnly && <p className="leading-4 text-sm text-muted-foreground">Profil ini difinalisasi setelah tanggal batas data.</p>}
              </FieldHeading>
              <Textarea id="report-reason" maxLength={2000} value={input.reason} disabled={disabled}
                onChange={(event) => onChange?.({ reason: event.target.value })} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
