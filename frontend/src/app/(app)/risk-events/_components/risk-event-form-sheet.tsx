"use client";

import { createDisplayDateFormatter } from "@/lib/display-date";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { createRiskEvent } from "@/lib/api/risk-events";
import { cn } from "@/lib/utils";
import type { RiskEvent, RiskEventSeverity, CreateRiskEventInput } from "@/types/risk-event";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AccentButton, ActionButton, CollectionDialogCancel, Dialog, DialogContent,
  DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, Textarea,
} from "@/components/shared/design-system";
import { Calendar as CalendarIcon, Lock } from "@/components/shared/icons";

import { RiskEventSourceCard } from "@/components/shared/risk-event-source-card";


const impactOptions = [
  ["operational", "Operasional"], ["service", "Layanan"], ["financial", "Keuangan"],
  ["health_safety", "Kesehatan/keselamatan"], ["reputation", "Reputasi"],
  ["compliance", "Kepatuhan"], ["other", "Lainnya"],
] as const;
const impactLabels = Object.fromEntries(impactOptions) as Record<string, string>;

const severityLabels: Record<RiskEventSeverity, string> = {
  low: "Rendah", medium: "Sedang", high: "Tinggi", extreme: "Ekstrem",
};

const steps = [
  { title: "Fakta utama", description: "Mulai dari apa yang benar-benar terjadi." },
  { title: "Tingkat kejadian", description: "Tentukan tingkat kejadian dan kerugian keuangan jika ada." },
  { title: "Periksa", description: "Pastikan ringkasan sudah tepat sebelum record dikunci." },
] as const;

function localDateTimeValue() {
  return `${formatLocalDate(new Date())}T12:00`;
}

function parseLocalDate(value: string) {
  const [datePart] = value.split("T");
  if (!datePart) return undefined;

  const [year, month, day] = datePart.split("-").map(Number);
  if ([year, month, day].some(Number.isNaN)) return undefined;

  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function RiskEventStepModal({
  open,
  step,
  title,
  description,
  stepValid,
  submitting,
  isLastStep,
  modalContentRef,
  modalBodyContentRef,
  onOpenChange,
  onBack,
  onCancel,
  onNext,
  onConfirm,
  children,
}: {
  open: boolean;
  step: number;
  title: string;
  description: string;
  stepValid: boolean;
  submitting: boolean;
  isLastStep: boolean;
  modalContentRef: (node: HTMLDivElement | null) => void;
  modalBodyContentRef: (node: HTMLDivElement | null) => void;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={modalContentRef}
        data-dynamic-height="true"
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <DialogHeader className="w-full shrink-0 gap-0.5 p-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div data-slot="modal-body" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div ref={modalBodyContentRef} className="w-full">
            {children}
          </div>
        </div>
        <DialogFooter className="m-0 shrink-0 rounded-none border-0 bg-transparent p-4 sm:flex-col">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2" role="status" aria-label={`Langkah ${step + 1} dari ${steps.length}`}>
              {steps.map((item, index) => (
                <span
                  key={item.title}
                  className={cn("size-2 rounded-full transition-colors duration-150 ease-(--ease-out) motion-reduce:transition-none", index === step ? "bg-foreground" : "bg-border")}
                  aria-hidden="true"
                />
              ))}
              <span className="sr-only">Langkah {step + 1} dari {steps.length}</span>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {step > 0 ? (
                <ActionButton type="button" className="flex-1 sm:flex-none" onClick={onBack}>Kembali</ActionButton>
              ) : (
                <CollectionDialogCancel type="button" className="flex-1 sm:flex-none" onClick={onCancel}>Batal</CollectionDialogCancel>
              )}
              {isLastStep ? (
                <AccentButton type="button" className="flex-1 sm:flex-none" icon={<Lock className="size-3.5" />} disabled={!stepValid || submitting} onClick={onConfirm}>Simpan</AccentButton>
              ) : (
                <AccentButton type="button" className="flex-1 sm:flex-none" disabled={!stepValid} onClick={onNext}>Lanjut</AccentButton>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RiskEventFormDialog({
  open, onOpenChange, token, organizationId, initialRiskId, onCreated, initialDraft, missingFields,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  organizationId?: string;
  initialRiskId?: string;
  initialDraft?: Partial<CreateRiskEventInput>;
  missingFields?: string[];
  onCreated: (event: RiskEvent) => void;
}) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const requiresOrganization = !organizationId && !initialRiskId;
  const resolvedOrganizationId = organizationId || selectedOrganizationId || undefined;
  const organizationValid = !requiresOrganization || Boolean(resolvedOrganizationId);
  const [description, setDescription] = useState(initialDraft?.description ?? "");
  const [occurredAt, setOccurredAt] = useState(initialDraft ? (initialDraft.occurredAt ? `${initialDraft.occurredAt.slice(0, 10)}T12:00` : "") : localDateTimeValue());
  const [impactTypes, setImpactTypes] = useState<string[]>(initialDraft?.impactTypes ?? []);
  const [otherImpactType, setOtherImpactType] = useState(initialDraft?.otherImpactType ?? "");
  const [financialLossState, setFinancialLossState] = useState<"" | "known" | "unknown">(initialDraft?.financialLossKnown === true ? "known" : initialDraft?.financialLossKnown === false ? "unknown" : "");
  const [financialLoss, setFinancialLoss] = useState(initialDraft?.financialLoss != null ? String(initialDraft.financialLoss) : "");
  const [severity, setSeverity] = useState<RiskEventSeverity | "">(initialDraft ? initialDraft.severity ?? "" : "medium");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [modalContentElement, setModalContentElement] = useState<HTMLDivElement | null>(null);
  const [modalBodyContentElement, setModalBodyContentElement] = useState<HTMLDivElement | null>(null);
  const modalHeightRef = useRef<number | null>(null);
  const occurredDate = parseLocalDate(occurredAt);

  useLayoutEffect(() => {
    if (!open) {
      modalHeightRef.current = null;
      return;
    }

    const modal = modalContentElement;
    const bodyContent = modalBodyContentElement;
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
      const previousHeight = currentHeight || modalHeightRef.current || 0;
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
      if (modalHeightRef.current === null || Math.abs(targetHeight - previousHeight) < 1) {
        modal.style.height = `${targetHeight}px`;
        modalHeightRef.current = targetHeight;
        return;
      }

      modal.style.height = `${previousHeight}px`;
      void modal.offsetHeight;
      modal.style.height = `${targetHeight}px`;
      modalHeightRef.current = targetHeight;
    };

    const scheduleMeasure = () => {
      if (pending) return;
      pending = true;
      frame = window.requestAnimationFrame(measureAndAnimate);
    };

    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(bodyContent);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [open, step, impactTypes, financialLossState, severity, modalContentElement, modalBodyContentElement]);

  useEffect(() => {
    if (!open) {
      setStep(0);
    }
  }, [open]);
  useEffect(() => {
    if (!open || !token || !requiresOrganization) return;
    let cancelled = false;
    listAllOrganizations(token).then((items) => { if (!cancelled) setOrganizations(items); }).catch(() => { if (!cancelled) toast.error("Daftar unit gagal dimuat. Tutup lalu buka kembali form untuk mencoba lagi."); });
    return () => { cancelled = true; };
  }, [open, token, requiresOrganization]);
  const valid = organizationValid && description.trim() && occurredAt && impactTypes.length > 0 &&
    (!impactTypes.includes("other") || otherImpactType.trim()) &&
    (!impactTypes.includes("financial") || (financialLossState && (financialLossState === "unknown" || (financialLoss.trim() !== "" && Number(financialLoss) >= 0)))) &&
    Boolean(severity);
  const factStepValid = Boolean(
    organizationValid && occurredAt && description.trim() && impactTypes.length > 0 &&
    (!impactTypes.includes("other") || otherImpactType.trim()),
  );
  const handlingStepValid = Boolean(
    Boolean(severity) && (!impactTypes.includes("financial") ||
      (financialLossState &&
        (financialLossState === "unknown" || (financialLoss.trim() !== "" && Number(financialLoss) >= 0)))),
  );
  const stepValid = step === 0 ? factStepValid : step === 1 ? handlingStepValid : Boolean(valid);

  const toggleImpact = (value: string) => setImpactTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const updateOccurredDate = (date: Date | undefined) => {
    if (!date) return;
    setOccurredAt(`${formatLocalDate(date)}T12:00`);
  };

  const submit = async () => {
    if (!valid || submitting || !token || !severity) return;
    setSubmitting(true);
    try {
      const event = await createRiskEvent(token, {
        description: description.trim(), occurredAt: new Date(occurredAt).toISOString(), impactTypes, otherImpactType: otherImpactType.trim(),
        severity, organizationId: resolvedOrganizationId, riskIds: initialRiskId ? [initialRiskId] : [],
        sourceDocumentName: initialDraft?.sourceDocumentName, sourceRefs: initialDraft?.sourceRefs, extractionKey: initialDraft?.extractionKey,
        financialLossKnown: impactTypes.includes("financial") ? financialLossState === "known" : undefined,
        financialLoss: impactTypes.includes("financial") && financialLossState === "known" ? Number(financialLoss) : undefined,
      });
      toast.success("Kejadian tersimpan permanen dalam LED.");
      setStep(0); onOpenChange(false); onCreated(event);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kejadian gagal disimpan.");
    } finally { setSubmitting(false); }
  };

  const stepContent = step === 0 ? (
    <section aria-labelledby="risk-event-facts">
      <h2 id="risk-event-facts" className="sr-only">Fakta utama</h2>
      <FieldGroup>
        {requiresOrganization ? <Field>
          <FieldLabel htmlFor="event-organization">Unit pemilik <span className="text-destructive">*</span></FieldLabel>
          <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
            <SelectTrigger id="event-organization" className="w-full"><SelectValue placeholder="Pilih unit pemilik" /></SelectTrigger>
            <SelectContent>{organizations.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field> : null}
        <Field>
          <FieldLabel htmlFor="event-occurred-date">Tanggal kejadian <span className="text-destructive">*</span></FieldLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="event-occurred-date"
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon aria-hidden="true" data-icon="inline-start" />
                <span data-date-time="">{occurredDate
                  ? createDisplayDateFormatter("id-ID", { dateStyle: "long" }).format(occurredDate)
                  : "Pilih tanggal"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={occurredDate}
                onSelect={updateOccurredDate}
              />
            </PopoverContent>
          </Popover>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="event-description">Apa yang terjadi? <span className="text-destructive">*</span></FieldLabel>
            <FieldDescription id="event-description-help" className="text-xs leading-5">
              Tulis apa yang terjadi dan akibat yang sudah terlihat.
            </FieldDescription>
          </FieldContent>
          <Textarea id="event-description" aria-describedby="event-description-help" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <FieldSet className="gap-2" aria-describedby="event-impact-types-help">
          <legend className="mb-0.5 text-sm leading-snug font-medium">Jenis dampak <span className="text-destructive">*</span></legend>
          <FieldDescription id="event-impact-types-help" className="text-xs leading-5 nth-last-2:mt-0">
            Pilih semua dampak yang terjadi.
          </FieldDescription>
          <div className="grid gap-2 sm:grid-cols-2">
            {impactOptions.map(([value, label]) => (
              <FieldLabel key={value}>
                <Field orientation="horizontal">
                  <Checkbox checked={impactTypes.includes(value)} onCheckedChange={() => toggleImpact(value)} />
                  <span>{label}</span>
                </Field>
              </FieldLabel>
            ))}
          </div>
        </FieldSet>
        {impactTypes.includes("other") ? (
          <Field>
            <FieldLabel htmlFor="event-other-impact">Jenis dampak lainnya <span className="text-destructive">*</span></FieldLabel>
            <Input id="event-other-impact" value={otherImpactType} onChange={(event) => setOtherImpactType(event.target.value)} />
          </Field>
        ) : null}
      </FieldGroup>
    </section>
  ) : step === 1 ? (
    <section aria-labelledby="risk-event-response">
      <h2 id="risk-event-response" className="sr-only">Tingkat kejadian</h2>
      <FieldGroup>
        {impactTypes.includes("financial") ? (
          <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-loss-status">Status nilai kerugian <span className="text-destructive">*</span></FieldLabel>
            <Select value={financialLossState} onValueChange={(value) => setFinancialLossState(value as "known" | "unknown")}>
              <SelectTrigger id="event-loss-status" className="w-full"><SelectValue placeholder="Pilih status" /></SelectTrigger>
              <SelectContent><SelectItem value="known">Nilai diketahui</SelectItem><SelectItem value="unknown">Belum diketahui</SelectItem></SelectContent>
            </Select>
          </Field>
          {financialLossState === "known" ? (
            <Field>
              <FieldLabel htmlFor="event-financial-loss">Nilai kerugian (Rp) <span className="text-destructive">*</span></FieldLabel>
              <Input id="event-financial-loss" type="number" min="0" inputMode="decimal" value={financialLoss} onChange={(event) => setFinancialLoss(event.target.value)} />
            </Field>
          ) : null}
          </div>
        ) : null}
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="event-severity">Tingkat kejadian <span className="text-destructive">*</span></FieldLabel>
            <FieldDescription id="event-severity-help" className="text-xs leading-5">
              Nilai tingkat kejadian dari dampak yang sudah terjadi.
            </FieldDescription>
          </FieldContent>
          <Select value={severity} onValueChange={(value) => setSeverity(value as RiskEventSeverity)}>
            <SelectTrigger id="event-severity" aria-describedby="event-severity-help" className="w-full"><SelectValue placeholder="Pilih tingkat kejadian" /></SelectTrigger>
            <SelectContent>{Object.entries(severityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </section>
  ) : (
    <section className="space-y-4" aria-labelledby="risk-event-review">
      <h2 id="risk-event-review" className="sr-only">Periksa kejadian</h2>
      <Card>
        <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {requiresOrganization ? <div><dt className="text-xs text-muted-foreground">Unit pemilik</dt><dd className="mt-1 text-foreground">{organizations.find((unit) => unit.id === selectedOrganizationId)?.name}</dd></div> : null}
          <div><dt className="text-xs text-muted-foreground">Tanggal kejadian</dt><dd className="mt-1 text-foreground"><span data-date-time="">{occurredDate ? createDisplayDateFormatter("id-ID", { dateStyle: "long" }).format(occurredDate) : "-"}</span></dd></div>
          <div><dt className="text-xs text-muted-foreground">Jenis dampak</dt><dd className="mt-1 text-foreground">{impactTypes.map((impact) => impact === "other" ? otherImpactType : impactLabels[impact] || impact).join(", ") || "-"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Apa yang terjadi</dt><dd className="mt-1 whitespace-pre-wrap text-foreground">{description || "-"}</dd></div>
          {impactTypes.includes("financial") ? <div><dt className="text-xs text-muted-foreground">Kerugian keuangan</dt><dd className="mt-1 text-foreground">{financialLossState === "known" ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(Number(financialLoss)) : "Belum diketahui"}</dd></div> : null}
          <div><dt className="text-xs text-muted-foreground">Tingkat kejadian</dt><dd className="mt-1 text-foreground">{severity ? severityLabels[severity] : "Belum dipilih"}</dd></div>
        </dl>
        </CardContent>
      </Card>
    </section>
  );

  return (
    <RiskEventStepModal
      open={open}
      step={step}
      title={steps[step].title}
      description={steps[step].description}
      stepValid={stepValid && (step !== steps.length - 1 || Boolean(token))}
      submitting={submitting}
      isLastStep={step === steps.length - 1}
      modalContentRef={setModalContentElement}
      modalBodyContentRef={setModalBodyContentElement}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onOpenChange(false);
      }}
      onBack={() => setStep((current) => current - 1)}
      onCancel={() => onOpenChange(false)}
      onNext={() => setStep((current) => current + 1)}
      onConfirm={() => { void submit(); }}
    >
      {initialDraft && (step === 0 || step === 2) ? (
        <div className="mb-5 space-y-3">
          {missingFields?.length ? <p className="text-sm text-secondary-foreground">Belum tercantum dalam dokumen: {missingFields.join(", ")}. Lengkapi informasi yang diketahui sebelum menyimpan.</p> : null}
          <RiskEventSourceCard name={initialDraft.sourceDocumentName} sources={initialDraft.sourceRefs} />
        </div>
      ) : null}
      {stepContent}
    </RiskEventStepModal>
  );
}
