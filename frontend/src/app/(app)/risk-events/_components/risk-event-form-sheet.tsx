"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { toast } from "sonner";

import { createRiskEvent } from "@/lib/api/risk-events";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { RiskEvent, RiskEventCondition, RiskEventSeverity } from "@/types/risk-event";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AccentButton, ActionButton, CollectionDialogCancel, Drawer, DrawerBody,
  DrawerContent, DrawerDescription, DrawerFooter, DrawerHandle, DrawerHeader,
  DrawerTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, Textarea,
} from "@/components/shared/design-system";
import { Lock, Search } from "@/components/ui/icons";

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
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function RiskEventStepDrawer({
  open,
  step,
  title,
  description,
  stepValid,
  submitting,
  isLastStep,
  drawerContentRef,
  drawerBodyContentRef,
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
  drawerContentRef: RefObject<HTMLDivElement | null>;
  drawerBodyContentRef: RefObject<HTMLDivElement | null>;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <Drawer
      direction="bottom"
      open={open}
      onOpenChange={onOpenChange}
      handleOnly
    >
      <DrawerContent
        ref={drawerContentRef}
        dynamicHeight
        className="bottom-2 left-2 right-2 top-auto mx-auto max-h-[calc(100dvh-1rem)] w-auto max-w-3xl"
        showCloseButton={false}
      >
        <DrawerHandle aria-label="Tarik untuk menutup" />
        <DrawerHeader className="mx-auto w-full max-w-3xl pb-4 pr-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <DrawerBody>
          <div ref={drawerBodyContentRef} className="mx-auto w-full max-w-3xl">
            {children}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
  const drawerContentRef = useRef<HTMLDivElement>(null);
  const drawerBodyContentRef = useRef<HTMLDivElement>(null);
  const drawerHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      drawerHeightRef.current = null;
      if (drawerContentRef.current) drawerContentRef.current.style.height = "";
      return;
    }

    const drawer = drawerContentRef.current;
    const bodyContent = drawerBodyContentRef.current;
    if (!drawer || !bodyContent) return;

    let frame = 0;
    let pending = false;

    const measureAndAnimate = () => {
      pending = false;
      if (!drawer.isConnected || drawer.classList.contains("vaul-dragging")) return;

      const currentHeight = drawer.getBoundingClientRect().height;
      // Use the rendered height as the starting point so a quick content change
      // retargets the current transition instead of snapping back to an older
      // target height.
      const previousHeight = currentHeight || drawerHeightRef.current || 0;
      const previousInlineHeight = drawer.style.height;
      const previousInlineMaxHeight = drawer.style.maxHeight;
      const previousInlineTransition = drawer.style.transition;
      const shell = drawer.firstElementChild as HTMLElement | null;
      const previousShellHeight = shell?.style.height ?? "";
      const previousShellMaxHeight = shell?.style.maxHeight ?? "";
      const body = drawer.querySelector<HTMLElement>('[data-slot="drawer-body"]');
      const previousBodyFlex = body?.style.flex ?? "";
      const previousBodyHeight = body?.style.height ?? "";
      const previousBodyMaxHeight = body?.style.maxHeight ?? "";
      const previousBodyOverflow = body?.style.overflow ?? "";

      drawer.style.transition = "none";
      drawer.style.height = "auto";
      drawer.style.maxHeight = "none";
      if (shell) {
        shell.style.height = "auto";
        shell.style.maxHeight = "none";
      }
      if (body) {
        body.style.flex = "none";
        body.style.height = "auto";
        body.style.maxHeight = "none";
        body.style.overflow = "visible";
      }

      // Vaul adds a bottom pseudo-element to the drawer for overscroll. Read
      // the shell's intrinsic height instead so that pseudo-element is not
      // mistaken for form content.
      const naturalHeight = Math.ceil(shell?.scrollHeight ?? drawer.scrollHeight);
      const maxHeight = Math.max(240, window.innerHeight - 16);
      const targetHeight = Math.min(naturalHeight, maxHeight);

      if (body) {
        body.style.flex = previousBodyFlex;
        body.style.height = previousBodyHeight;
        body.style.maxHeight = previousBodyMaxHeight;
        body.style.overflow = previousBodyOverflow;
      }
      if (shell) {
        shell.style.height = previousShellHeight;
        shell.style.maxHeight = previousShellMaxHeight;
      }
      drawer.style.height = previousInlineHeight;
      drawer.style.maxHeight = previousInlineMaxHeight;
      drawer.style.transition = previousInlineTransition;

      if (!targetHeight) return;
      if (drawerHeightRef.current === null || Math.abs(targetHeight - previousHeight) < 1) {
        drawer.style.height = `${targetHeight}px`;
        drawerHeightRef.current = targetHeight;
        return;
      }

      drawer.style.height = `${previousHeight}px`;
      void drawer.offsetHeight;
      drawer.style.height = `${targetHeight}px`;
      drawerHeightRef.current = targetHeight;
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
  }, [open, step, impactTypes, financialLossState, severity, condition]);

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
  const valid = description.trim() && occurredAt && impactTypes.length > 0 && actualImpact.trim() && immediateResponse.trim() &&
    (!impactTypes.includes("other") || otherImpactType.trim()) &&
    (!impactTypes.includes("financial") || (financialLossState && (financialLossState === "unknown" || (financialLoss.trim() !== "" && Number(financialLoss) >= 0)))) &&
    (severity !== "extreme" || extraordinaryReason.trim()) &&
    (!["ongoing", "worsening"].includes(condition) || ongoingAction.trim());
  const factStepValid = Boolean(
    occurredAt && description.trim() && impactTypes.length > 0 &&
    (!impactTypes.includes("other") || otherImpactType.trim()),
  );
  const handlingStepValid = Boolean(
    actualImpact.trim() && immediateResponse.trim() &&
    (!impactTypes.includes("financial") || (financialLossState &&
      (financialLossState === "unknown" || (financialLoss.trim() !== "" && Number(financialLoss) >= 0)))) &&
    (severity !== "extreme" || extraordinaryReason.trim()) &&
    (!["ongoing", "worsening"].includes(condition) || ongoingAction.trim()),
  );
  const stepValid = step === 0 ? factStepValid : step === 1 ? handlingStepValid : Boolean(valid);

  const toggleImpact = (value: string) => setImpactTypes((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const toggleRisk = (id: string) => setRiskIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

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
    <section className="space-y-4" aria-labelledby="risk-event-facts">
      <h2 id="risk-event-facts" className="sr-only">Fakta utama</h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="event-occurred">Waktu kejadian <span className="text-destructive">*</span></Label>
        <Input id="event-occurred" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="event-description">Apa yang terjadi? <span className="text-destructive">*</span></Label>
        <Textarea id="event-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan kejadian secara faktual dan ringkas." />
      </div>
      <fieldset>
        <legend className="mb-2 block text-sm">Jenis dampak <span className="text-destructive">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {impactOptions.map(([value, label]) => (
            <label key={value} className="flex min-h-10 items-center gap-2 rounded-lg border-0 border-shadow px-3 text-sm">
              <Checkbox checked={impactTypes.includes(value)} onCheckedChange={() => toggleImpact(value)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {impactTypes.includes("other") ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-other-impact">Jenis dampak lainnya <span className="text-destructive">*</span></Label>
          <Input id="event-other-impact" value={otherImpactType} onChange={(event) => setOtherImpactType(event.target.value)} />
        </div>
      ) : null}
    </section>
  ) : step === 1 ? (
    <section className="space-y-4" aria-labelledby="risk-event-response">
      <h2 id="risk-event-response" className="sr-only">Dampak dan penanganan</h2>
      {impactTypes.includes("financial") ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Status nilai kerugian <span className="text-destructive">*</span></Label>
            <Select value={financialLossState} onValueChange={(value) => setFinancialLossState(value as "known" | "unknown")}>
              <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
              <SelectContent><SelectItem value="known">Nilai diketahui</SelectItem><SelectItem value="unknown">Belum diketahui</SelectItem></SelectContent>
            </Select>
          </div>
          {financialLossState === "known" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-financial-loss">Nilai kerugian <span className="text-destructive">*</span></Label>
              <Input id="event-financial-loss" type="number" min="0" inputMode="decimal" value={financialLoss} onChange={(event) => setFinancialLoss(event.target.value)} placeholder="0" />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="event-impact">Dampak aktual <span className="text-destructive">*</span></Label>
        <Textarea id="event-impact" rows={3} value={actualImpact} onChange={(e) => setActualImpact(e.target.value)} placeholder="Tuliskan dampak yang benar-benar terjadi." />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Tingkat kejadian <span className="text-destructive">*</span></Label>
        <Select value={severity} onValueChange={(value) => setSeverity(value as RiskEventSeverity)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(severityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {severity === "extreme" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-extraordinary">Alasan tingkat ekstrem <span className="text-destructive">*</span></Label>
          <Textarea id="event-extraordinary" value={extraordinaryReason} onChange={(e) => setExtraordinaryReason(e.target.value)} />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="event-response">Penanganan langsung <span className="text-destructive">*</span></Label>
        <Textarea id="event-response" rows={3} value={immediateResponse} onChange={(e) => setImmediateResponse(e.target.value)} placeholder="Jika belum ada, tuliskan “Belum ada penanganan”." />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Kondisi setelah penanganan <span className="text-destructive">*</span></Label>
        <Select value={condition} onValueChange={(value) => setCondition(value as RiskEventCondition)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(conditionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {["ongoing", "worsening"].includes(condition) ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="event-ongoing">Tindakan yang sedang berjalan <span className="text-destructive">*</span></Label>
          <Textarea id="event-ongoing" value={ongoingAction} onChange={(e) => setOngoingAction(e.target.value)} />
        </div>
      ) : null}
    </section>
  ) : step === 2 ? (
    <section className="space-y-4" aria-labelledby="risk-event-risk">
      <h2 id="risk-event-risk" className="sr-only">Risiko terkait</h2>
      <div className="relative">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input className="pl-9" value={riskQuery} onChange={(e) => setRiskQuery(e.target.value)} placeholder="Cari kode atau nama risiko" />
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto">
        {filteredRisks.length ? filteredRisks.map((risk) => (
          <label key={risk.id} className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/40">
            <Checkbox checked={riskIds.includes(risk.id)} onCheckedChange={() => toggleRisk(risk.id)} />
            <span><span className="font-mono text-xs">{risk.code || "Tanpa kode"}</span><span className="mt-0.5 block text-secondary-foreground">{risk.title}</span></span>
          </label>
        )) : <p className="px-2 py-3 text-sm text-secondary-foreground">Risiko tidak ditemukan.</p>}
      </div>
    </section>
  ) : step === 3 ? (
    <section className="space-y-4" aria-labelledby="risk-event-details">
      <h2 id="risk-event-details" className="sr-only">Detail tambahan</h2>
      <div className="grid gap-4">
        <div className="flex flex-col gap-2"><Label htmlFor="event-location">Lokasi</Label><Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="event-parties">Pihak terdampak</Label><Input id="event-parties" value={affectedParties} onChange={(e) => setAffectedParties(e.target.value)} /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="event-cause">Dugaan penyebab</Label><Textarea id="event-cause" value={suspectedCause} onChange={(e) => setSuspectedCause(e.target.value)} /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="event-duration">Durasi gangguan</Label><Input id="event-duration" value={disruptionDuration} onChange={(e) => setDisruptionDuration(e.target.value)} placeholder="Contoh: 4 jam" /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="event-evidence">Tautan bukti</Label><Input id="event-evidence" type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://" /></div>
      </div>
    </section>
  ) : (
    <section className="space-y-4" aria-labelledby="risk-event-review">
      <h2 id="risk-event-review" className="sr-only">Periksa kejadian</h2>
      <div className="rounded-lg bg-card p-4">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Waktu kejadian</dt><dd className="mt-1 text-foreground">{occurredAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(new Date(occurredAt)) : "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Jenis dampak</dt><dd className="mt-1 text-foreground">{impactTypes.map((impact) => impactLabels[impact] || impact).join(", ") || "-"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Apa yang terjadi</dt><dd className="mt-1 whitespace-pre-wrap text-foreground">{description || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Dampak aktual</dt><dd className="mt-1 whitespace-pre-wrap text-foreground">{actualImpact || "-"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Tingkat kejadian</dt><dd className="mt-1 text-foreground">{severityLabels[severity]}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Kondisi</dt><dd className="mt-1 text-foreground">{conditionLabels[condition]}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Risiko terkait</dt><dd className="mt-1 text-foreground">{selectedRisks.length ? selectedRisks.map((risk) => risk.code || risk.title).join(", ") : "Belum dipetakan"}</dd></div>
        </dl>
      </div>
    </section>
  );

  return (
    <>
      {open ? (
        <RiskEventStepDrawer
          open={open}
          step={step}
          title={steps[step].title}
          description={steps[step].description}
          stepValid={stepValid}
          submitting={submitting}
          isLastStep={step === steps.length - 1}
          drawerContentRef={drawerContentRef}
          drawerBodyContentRef={drawerBodyContentRef}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !submitting) onOpenChange(false);
          }}
          onBack={() => setStep((current) => current - 1)}
          onCancel={() => onOpenChange(false)}
          onNext={() => setStep((current) => current + 1)}
          onConfirm={() => { void submit(); }}
        >
          {stepContent}
        </RiskEventStepDrawer>
      ) : null}
    </>
  );
}
