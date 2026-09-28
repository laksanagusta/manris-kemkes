"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, MoreHorizontal } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { IllustratedEmptyState, PopoverSelectField } from "@/components/shared/design-system";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import type { MitigationItem } from "@/components/shared/mitigation-table";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";

const typeOptions = [
  { value: "reduce_probability", label: "Turunkan probabilitas" },
  { value: "reduce_impact", label: "Turunkan dampak" },
  { value: "reduce_both", label: "Turunkan probabilitas dan dampak" },
] as const;
const detailFields = [
  ["activityStage", "Tahap aktivitas"],
  ["expectedOutput", "Output yang diharapkan"],
  ["quantitativeTarget", "Target kuantitatif"],
  ["supportingUnit", "Unit pendukung"],
  ["resourcesRequired", "Sumber daya dibutuhkan"],
  ["contingencyPlan", "Rencana kontinjensi"],
  ["potentialObstacle", "Hambatan potensial"],
] as const;

type Props = {
  items: MitigationItem[];
  onChange: (items: MitigationItem[]) => void;
  disabled?: boolean;
  actionErrors?: Array<string | undefined>;
  showPlaceholders?: boolean;
  emptyStatePresentation?: "illustrated" | "plain";
  hideAddButton?: boolean;
  loadPicOptions?: (params: { q: string; page: number; limit: number }) => Promise<{
    options: UserPickerOption[]; total: number; page: number; limit: number;
  }>;
};

export function MitigationPlanList({
  items,
  onChange,
  disabled,
  actionErrors,
  showPlaceholders = true,
  emptyStatePresentation = "illustrated",
  hideAddButton = false,
  loadPicOptions,
}: Props) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<MitigationItem>({ action: "", owner: "", mitigationType: "reduce_probability" });
  const [modal, setModal] = useState<HTMLDivElement | null>(null);
  const [bodyContent, setBodyContent] = useState<HTMLDivElement | null>(null);
  const previousHeightRef = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const picId = draft.ownerUserId ?? draft.treatmentOwnerId ?? draft.externalPicId ?? draft.owner;
  const valid = Boolean(draft.action.trim() && String(picId ?? "").trim());

  const begin = (index: number | null) => {
    setEditingIndex(index);
    setDraft(index === null ? { action: "", owner: "", mitigationType: "reduce_probability", isBreakthroughActivity: false, isExistingControl: false } : { ...items[index] });
    setStep(0);
    setOpen(true);
  };
  const save = () => {
    if (!valid || disabled) return;
    const saved = { ...draft, action: draft.action.trim() };
    onChange(editingIndex === null ? [...items, saved] : items.map((item, index) => index === editingIndex ? saved : item));
    setOpen(false);
  };
  const changeStep = (next: number) => {
    setStep(next);
    // Keep keyboard focus on the newly presented step after its fields mount.
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  useLayoutEffect(() => {
    if (!open) {
      previousHeightRef.current = null;
      return;
    }

    if (!modal || !bodyContent) return;

    let frame = 0;
    let pending = false;

    const measureAndAnimate = () => {
      pending = false;
      if (!modal.isConnected) return;

      // DialogContent opens with a zoom transform. offsetHeight reads the
      // layout height without that transform, keeping the first measurement accurate.
      const currentHeight = modal.offsetHeight;
      // Use the rendered height as the starting point so a quick content change
      // retargets the current transition instead of snapping back to an older
      // target height.
      const previousHeight = currentHeight || previousHeightRef.current || 0;
      const previousInlineHeight = modal.style.height;
      const previousInlineMaxHeight = modal.style.maxHeight;
      const previousInlineTransition = modal.style.transition;
      const body = modal.querySelector<HTMLElement>('[data-slot="modal-body"]');
      const previousBodyFlex = body?.style.flex ?? "";
      const previousBodyHeight = body?.style.height ?? "";
      const previousBodyMaxHeight = body?.style.maxHeight ?? "";
      const previousBodyOverflow = body?.style.overflow ?? "";

      modal.style.transition = "none";
      modal.style.height = "auto";
      modal.style.maxHeight = "none";
      if (body) {
        body.style.flex = "none";
        body.style.height = "auto";
        body.style.maxHeight = "none";
        body.style.overflow = "visible";
      }

      const naturalHeight = modal.offsetHeight;
      const maxHeight = Math.max(0, window.innerHeight - 16);
      const targetHeight = Math.min(naturalHeight, maxHeight);

      if (body) {
        body.style.flex = previousBodyFlex;
        body.style.height = previousBodyHeight;
        body.style.maxHeight = previousBodyMaxHeight;
        body.style.overflow = previousBodyOverflow;
      }
      modal.style.height = previousInlineHeight;
      modal.style.maxHeight = previousInlineMaxHeight;
      modal.style.transition = previousInlineTransition;

      if (!targetHeight) return;
      if (previousHeightRef.current === null || Math.abs(targetHeight - previousHeight) < 1) {
        modal.style.height = `${targetHeight}px`;
        previousHeightRef.current = targetHeight;
        return;
      }

      modal.style.height = `${previousHeight}px`;
      void modal.offsetHeight;
      modal.style.height = `${targetHeight}px`;
      previousHeightRef.current = targetHeight;
    };

    const scheduleMeasure = () => {
      if (pending) return;
      pending = true;
      frame = window.requestAnimationFrame(measureAndAnimate);
    };

    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(bodyContent);
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [open, step, modal, bodyContent]);

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        emptyStatePresentation === "plain" ? (
          <p className="py-4 text-sm text-muted-foreground">Belum ada rencana mitigasi.</p>
        ) : (
          <IllustratedEmptyState title="Belum ada rencana mitigasi." description="Tambahkan rencana mitigasi untuk mulai mencatat penanganan risiko." />
        )
      ) : (
        <ul className="space-y-2" aria-label="Rencana mitigasi">
          {items.map((item, index) => (
            <li key={item.id ?? index}>
              <div className="flex items-center gap-2 rounded-xl bg-card-subtle-surface px-4 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                  disabled={disabled}
                  aria-label={`Edit rencana mitigasi ${index + 1}: ${item.action || "Belum diisi"}`}
                  onClick={() => begin(index)}
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" aria-hidden="true">
                    <ShieldCheck className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-medium text-foreground">{item.action || `Rencana mitigasi ${index + 1}`}</span>
                      <span className="mt-1 block break-words text-sm text-secondary-foreground">{item.owner || "PIC belum dipilih"}</span>
                    </span>
                    <Badge variant="secondary" className="shrink-0 border-transparent bg-white text-secondary-foreground dark:bg-white dark:text-foreground">
                      {typeOptions.find((option) => option.value === (item.mitigationType ?? "reduce_probability"))?.label}
                    </Badge>
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Aksi rencana mitigasi ${index + 1}`}><MoreHorizontal className="size-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => begin(index)}><Pencil />Edit</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 />Hapus</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {actionErrors?.[index] ? <p role="alert" className="mt-1 text-xs text-destructive">{actionErrors[index]}</p> : null}
            </li>
          ))}
        </ul>
      )}
      {!hideAddButton ? (
        <Button type="button" variant="outline" onClick={() => begin(null)} disabled={disabled}><Plus data-icon="inline-start" />Tambah Rencana Penanganan</Button>
      ) : null}
      <Dialog open={open && !disabled} onOpenChange={setOpen}>
        <DialogContent ref={setModal} data-dynamic-height="true" showCloseButton={false} className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl">
          <DialogHeader className="w-full shrink-0 gap-0.5 p-4 text-left">
            <DialogTitle ref={headingRef} tabIndex={-1} className="outline-none">{step === 0 ? editingIndex === null ? "Tambah rencana mitigasi" : "Edit rencana mitigasi" : "Detail mitigasi"}</DialogTitle>
            <DialogDescription>{step === 0 ? "Isi rencana penanganan, PIC, dan tipe mitigasi." : "Lengkapi rincian pelaksanaan rencana mitigasi."}</DialogDescription>
          </DialogHeader>
          <Separator />
          <div data-slot="modal-body" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div ref={setBodyContent}>
              {step === 0 ? (
                <FieldGroup>
                  <Field><FieldLabel htmlFor={`${fieldId}-action`}>Rencana penanganan <span className="text-destructive">*</span></FieldLabel><Textarea id={`${fieldId}-action`} value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} placeholder={showPlaceholders ? "Uraian rencana penanganan" : undefined} rows={3} aria-required="true" /></Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field>
                      {loadPicOptions ? <>
                        <FieldLabel>PIC <span className="text-destructive">*</span></FieldLabel>
                        <RemoteUserPicker title="Pilih PIC" description="Cari dan pilih PIC untuk rencana penanganan ini" placeholder="Pilih PIC" emptyMessage="Tidak ada user ditemukan." value={picId ? { id: picId, name: draft.owner || picId } : null} onSelect={(option) => setDraft({ ...draft, ownerUserId: option.id, treatmentOwnerId: option.id, externalPicId: undefined, owner: option.name })} presentation="assignee" loadOptions={loadPicOptions} />
                      </> : <><FieldLabel htmlFor={`${fieldId}-owner`}>PIC <span className="text-destructive">*</span></FieldLabel><Input id={`${fieldId}-owner`} value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} required /></>}
                    </Field>
                    <Field><FieldLabel htmlFor={`${fieldId}-type`}>Tipe mitigasi</FieldLabel>
                      <PopoverSelectField
                        id={`${fieldId}-type`}
                        value={draft.mitigationType ?? "reduce_probability"}
                        onValueChange={(value) => setDraft({ ...draft, mitigationType: value as MitigationItem["mitigationType"] })}
                        options={typeOptions}
                        placeholder="Pilih tipe mitigasi"
                        ariaLabel="Tipe mitigasi"
                      />
                    </Field>
                  </div>
                </FieldGroup>
              ) : (
                <FieldGroup>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {detailFields.map(([key, label]) => (
                      <Field key={key}><FieldLabel htmlFor={`${fieldId}-${key}`}>{label}</FieldLabel>
                        {key === "activityStage" || key === "supportingUnit" ? <Input id={`${fieldId}-${key}`} value={draft[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /> : <Textarea id={`${fieldId}-${key}`} rows={2} value={draft[key] || ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />}
                      </Field>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldLabel><Field orientation="horizontal"><Checkbox checked={Boolean(draft.isBreakthroughActivity)} onCheckedChange={(checked) => setDraft({ ...draft, isBreakthroughActivity: checked === true })} /><span>Breakthrough activity</span></Field></FieldLabel>
                    <FieldLabel><Field orientation="horizontal"><Checkbox checked={Boolean(draft.isExistingControl)} onCheckedChange={(checked) => setDraft({ ...draft, isExistingControl: checked === true })} /><span>Existing control</span></Field></FieldLabel>
                  </div>
                </FieldGroup>
              )}
            </div>
          </div>
          <Separator />
          <DialogFooter className="m-0 shrink-0 rounded-none border-0 bg-transparent p-4 sm:flex-col">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2" role="status" aria-label={`Langkah ${step + 1} dari 2`}>
                {[0, 1].map((index) => <span key={index} aria-hidden="true" className={`size-2 rounded-full transition-colors duration-150 motion-reduce:transition-none ${index === step ? "bg-foreground" : "bg-border"}`} />)}
                <span className="sr-only">Langkah {step + 1} dari 2</span>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => step === 0 ? setOpen(false) : changeStep(0)}>{step === 0 ? "Batal" : "Kembali"}</Button>
                <Button type="button" className="flex-1 sm:flex-none" disabled={!valid} onClick={() => step === 0 ? changeStep(1) : save()}>{step === 0 ? "Lanjut" : "Simpan"}</Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
