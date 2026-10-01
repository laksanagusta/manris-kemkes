"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { createRiskEvent } from "@/lib/api/risk-events";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RiskEvent, RiskEventCondition, RiskEventSeverity } from "@/types/risk-event";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  AccentButton, ActionButton, CollectionDialogCancel, Dialog, DialogContent,
  DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, Textarea,
} from "@/components/shared/design-system";
import { Calendar as CalendarIcon, Lock, Search } from "@/components/shared/icons";

type RiskOption = { id: string; code?: string; title: string; organizationId?: string };

const impactOptions = [
  ["operational", "Operasional"], ["service", "Layanan"], ["financial", "Keuangan"],
  ["health_safety", "Kesehatan/keselamatan"], ["reputation", "Reputasi"],
  ["compliance", "Kepatuhan"], ["other", "Lainnya"],
] as const;
const impactLabels = Object.fromEntries(impactOptions) as Record<string, string>;

const severityLabels: Record<RiskEventSeverity, string> = {
  low: "Rendah", medium: "Sedang", high: "Tinggi", extreme: "Ekstrem",
};
const conditionLabels: Record<RiskEventCondition, string> = {
  recovered: "Pulih", controlled: "Terkendali", ongoing: "Masih berlangsung",
  worsening: "Memburuk", unknown: "Belum diketahui",
};

const steps = [
  { title: "Fakta utama", description: "Mulai dari apa yang benar-benar terjadi." },
  { title: "Dampak & penanganan", description: "Lengkapi dampak dan kondisi setelah respons awal." },
  { title: "Risiko terkait", description: "Pilih risiko yang berkaitan dengan kejadian ini." },
  { title: "Detail tambahan", description: "Tambahkan konteks yang sudah tersedia sebelum record dikunci." },
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
        <Separator />
        <div data-slot="modal-body" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div ref={modalBodyContentRef} className="w-full">
            {children}
          </div>
        </div>
        <Separator />
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
  open, onOpenChange, token, organizationId, initialRiskId, onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  organizationId?: string;
  initialRiskId?: string;
  onCreated: (event: RiskEvent) => void;
}) {
  const [risks, setRisks] = useState<RiskOption[]>([]);
  const [riskQuery, setRiskQuery] = useState("");
  const [riskIds, setRiskIds] = useState<string[]>(initialRiskId ? [initialRiskId] : []);
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(localDateTimeValue);
  const [impactTypes, setImpactTypes] = useState<string[]>([]);
  const [actualImpact, setActualImpact] = useState("");
  const [otherImpactType, setOtherImpactType] = useState("");
  const [financialLossState, setFinancialLossState] = useState<"" | "known" | "unknown">("");
  const [financialLoss, setFinancialLoss] = useState("");
  const [severity, setSeverity] = useState<RiskEventSeverity>("medium");
  const [immediateResponse, setImmediateResponse] = useState("");
  const [condition, setCondition] = useState<RiskEventCondition>("unknown");
  const [location, setLocation] = useState("");
  const [affectedParties, setAffectedParties] = useState("");
  const [suspectedCause, setSuspectedCause] = useState("");
  const [disruptionDuration, setDisruptionDuration] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [extraordinaryReason, setExtraordinaryReason] = useState("");
  const [ongoingAction, setOngoingAction] = useState("");
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
  }, [open, step, impactTypes, financialLossState, severity, condition, modalContentElement, modalBodyContentElement]);

  useEffect(() => {
    if (!open || !token) return;
    api.get<RiskOption[]>("/risks", token).then(setRisks).catch(() => toast.error("Daftar risiko gagal dimuat."));
  }, [open, token]);
  useEffect(() => {
    if (!open) {
      setStep(0);
    }
  }, [open]);
  useEffect(() => { if (initialRiskId) setRiskIds([initialRiskId]); }, [initialRiskId]);

  const filteredRisks = useMemo(() => {
    const query = riskQuery.trim().toLowerCase();
    return risks.filter((risk) => (!organizationId || risk.organizationId === organizationId) && (!query || `${risk.code ?? ""} ${risk.title}`.toLowerCase().includes(query))).slice(0, 10);
  }, [organizationId, riskQuery, risks]);
  const selectedRisks = risks.filter((risk) => riskIds.includes(risk.id));
  const valid = description.trim() && occurredAt && impactTypes.length > 0 &&
    (!impactTypes.includes("other") || otherImpactType.trim()) &&
    (!impactTypes.includes("financial") || (financialLossState && (financialLossState === "unknown" || (financialLoss.trim() !== "" && Number(financialLoss) >= 0)))) &&
    Boolean(severity);
  const factStepValid = Boolean(
    occurredAt && description.trim() && impactTypes.length > 0 &&
    (!impactTypes.includes("other") || otherImpactType.trim()),
  );
  const handlingStepValid = Boolean(
    !impactTypes.includes("financial") ||
      (financialLossState &&
        (financialLossState === "unknown" || (financialLoss.trim() !== "" && Number(financialLoss) >= 0))),
  );
  const stepValid = step === 0 ? factStepValid : step === 1 ? handlingStepValid : Boolean(valid);

  const toggleImpact = (value: string) => setImpactTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const toggleRisk = (id: string) => setRiskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const updateOccurredDate = (date: Date | undefined) => {
    if (!date) return;
    setOccurredAt(`${formatLocalDate(date)}T12:00`);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const event = await createRiskEvent(token, {
        description: description.trim(), occurredAt: new Date(occurredAt).toISOString(), impactTypes, otherImpactType: otherImpactType.trim(),
        actualImpact: actualImpact.trim(), severity, immediateResponse: immediateResponse.trim(),
        postResponseCondition: condition, location: location.trim(), affectedParties: affectedParties.trim(),
        suspectedCause: suspectedCause.trim(), disruptionDuration: disruptionDuration.trim(),
        extraordinaryReason: extraordinaryReason.trim(), ongoingAction: ongoingAction.trim(),
        evidenceUrl: evidenceUrl.trim(), organizationId, riskIds,
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
                {occurredDate
                  ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(occurredDate)
                  : "Pilih tanggal"}
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
          <FieldLabel htmlFor="event-description">Apa yang terjadi? <span className="text-destructive">*</span></FieldLabel>
          <Textarea id="event-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan kejadian secara faktual dan ringkas." />
        </Field>
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">Jenis dampak <span className="text-destructive">*</span></legend>
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
        </fieldset>
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
      <h2 id="risk-event-response" className="sr-only">Dampak dan penanganan</h2>
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
              <FieldLabel htmlFor="event-financial-loss">Nilai kerugian <span className="text-destructive">*</span></FieldLabel>
              <Input id="event-financial-loss" type="number" min="0" inputMode="decimal" value={financialLoss} onChange={(event) => setFinancialLoss(event.target.value)} placeholder="0" />
            </Field>
          ) : null}
          </div>
        ) : null}
        <Field>
          <FieldLabel htmlFor="event-impact">Dampak aktual</FieldLabel>
          <Textarea id="event-impact" rows={3} value={actualImpact} onChange={(e) => setActualImpact(e.target.value)} placeholder="Tuliskan dampak yang benar-benar terjadi." />
        </Field>
        <Field>
          <FieldLabel htmlFor="event-severity">Tingkat kejadian <span className="text-destructive">*</span></FieldLabel>
          <Select value={severity} onValueChange={(value) => setSeverity(value as RiskEventSeverity)}>
            <SelectTrigger id="event-severity" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(severityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {severity === "extreme" ? (
          <Field>
            <FieldLabel htmlFor="event-extraordinary">Alasan tingkat ekstrem</FieldLabel>
            <Textarea id="event-extraordinary" value={extraordinaryReason} onChange={(e) => setExtraordinaryReason(e.target.value)} />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="event-response">Penanganan langsung</FieldLabel>
          <Textarea id="event-response" rows={3} value={immediateResponse} onChange={(e) => setImmediateResponse(e.target.value)} placeholder="Jika belum ada, tuliskan “Belum ada penanganan”." />
        </Field>
        <Field>
          <FieldLabel htmlFor="event-condition">Kondisi setelah penanganan</FieldLabel>
          <Select value={condition} onValueChange={(value) => setCondition(value as RiskEventCondition)}>
            <SelectTrigger id="event-condition" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(conditionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {["ongoing", "worsening"].includes(condition) ? (
          <Field>
            <FieldLabel htmlFor="event-ongoing">Tindakan yang sedang berjalan</FieldLabel>
            <Textarea id="event-ongoing" value={ongoingAction} onChange={(e) => setOngoingAction(e.target.value)} />
          </Field>
        ) : null}
      </FieldGroup>
    </section>
  ) : step === 2 ? (
    <section className="space-y-4" aria-labelledby="risk-event-risk">
      <h2 id="risk-event-risk" className="sr-only">Risiko terkait</h2>
      <InputGroup>
        <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput aria-label="Cari risiko terkait" value={riskQuery} onChange={(e) => setRiskQuery(e.target.value)} placeholder="Cari kode atau nama risiko" />
      </InputGroup>
      <div className="max-h-52 space-y-2 overflow-y-auto" role="group" aria-label="Pilihan risiko terkait">
        {filteredRisks.length ? filteredRisks.map((risk) => (
          <FieldLabel key={risk.id}>
            <Field orientation="horizontal">
              <Checkbox checked={riskIds.includes(risk.id)} onCheckedChange={() => toggleRisk(risk.id)} />
              <span className="min-w-0">
                <span className="block font-mono text-xs text-muted-foreground">{risk.code || "Tanpa kode"}</span>
                <span className="mt-0.5 block text-sm text-foreground">{risk.title}</span>
              </span>
            </Field>
          </FieldLabel>
        )) : <p className="py-3 text-sm text-muted-foreground">Risiko tidak ditemukan.</p>}
      </div>
    </section>
  ) : step === 3 ? (
    <section aria-labelledby="risk-event-details">
      <h2 id="risk-event-details" className="sr-only">Detail tambahan</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field><FieldLabel htmlFor="event-location">Lokasi</FieldLabel><Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
        <Field><FieldLabel htmlFor="event-parties">Pihak terdampak</FieldLabel><Input id="event-parties" value={affectedParties} onChange={(e) => setAffectedParties(e.target.value)} /></Field>
        <Field className="sm:col-span-2"><FieldLabel htmlFor="event-cause">Dugaan penyebab</FieldLabel><Textarea id="event-cause" value={suspectedCause} onChange={(e) => setSuspectedCause(e.target.value)} /></Field>
        <Field><FieldLabel htmlFor="event-duration">Durasi gangguan</FieldLabel><Input id="event-duration" value={disruptionDuration} onChange={(e) => setDisruptionDuration(e.target.value)} placeholder="Contoh: 4 jam" /></Field>
        <Field><FieldLabel htmlFor="event-evidence">Tautan bukti</FieldLabel><Input id="event-evidence" type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://" /></Field>
      </div>
    </section>
  ) : (
    <section className="space-y-4" aria-labelledby="risk-event-review">
      <h2 id="risk-event-review" className="sr-only">Periksa kejadian</h2>
      <Card>
        <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Tanggal kejadian</dt><dd className="mt-1 text-foreground">{occurredDate ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(occurredDate) : "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Jenis dampak</dt><dd className="mt-1 text-foreground">{impactTypes.map((impact) => impactLabels[impact] || impact).join(", ") || "-"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Apa yang terjadi</dt><dd className="mt-1 whitespace-pre-wrap text-foreground">{description || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Dampak aktual</dt><dd className="mt-1 whitespace-pre-wrap text-foreground">{actualImpact || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Tingkat kejadian</dt><dd className="mt-1 text-foreground">{severityLabels[severity]}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Kondisi</dt><dd className="mt-1 text-foreground">{conditionLabels[condition]}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Risiko terkait</dt><dd className="mt-1 text-foreground">{selectedRisks.length ? selectedRisks.map((risk) => risk.code || risk.title).join(", ") : "Belum dipetakan"}</dd></div>
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
      stepValid={stepValid}
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
      {stepContent}
    </RiskEventStepModal>
  );
}
