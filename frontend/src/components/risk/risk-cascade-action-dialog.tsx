"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, GitBranch, CheckCircle2, ChevronDown } from "@/components/shared/icons";

import { useAuth } from "@/contexts/auth-context";
import {
  AccentButton,
  CollectionDialogCancel,
  DestructiveButton,
  PopoverSelectField,
} from "@/components/shared/design-system";
import { listOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { listRiskRegister, type RiskRegisterListItem } from "@/lib/api/risk-register";
import {
  createBottomUpRiskCascade,
  createMandatoryRiskCascade,
  decideRiskCascade,
  type DecideRiskCascadeRequest,
  type CreateRiskCascadeRequest,
} from "@/lib/api/risk-cascades";
import type {
  RiskCascadeRecord,
  RiskCascadeType,
} from "@/types/risk-cascade";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/shared/search-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { toast } from "sonner";

type Mode = "create" | "decision";
type OrgFlow = "downstream" | "upstream" | "any";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(handle);
  }, [delay, value]);

  return debouncedValue;
}

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  cascade?: RiskCascadeRecord | null;
  initialSourceRiskId?: string;
  initialCascadeType?: RiskCascadeType;
  title?: string;
  description?: string;
  onSaved?: () => void;
};

const cascadeTypeLabels: Record<RiskCascadeType, string> = {
  mandatory_top_down: "Top-down",
  recommended_top_down: "Top-down",
  bottom_up_escalation: "Bottom-up",
};

const createCascadeOptions = [
  { value: "bottom_up_escalation", label: "Bottom-up" },
] as const;

const adoptionOptions = [
  { value: "full", label: "Penuh" },
  { value: "partial", label: "Sebagian" },
] as const;

const statusLabels: Record<string, string> = {
  proposed: "Menunggu Tinjauan",
  analyzed: "Sedang Ditinjau",
  accepted: "Disetujui",
  rejected: "Ditolak",
  implemented: "Selesai",
};

const statusBadgeTones = {
  proposed: "warning",
  analyzed: "info",
  accepted: "success",
  rejected: "danger",
  implemented: "success",
} as const;

const cascadePickerContentClassName = "w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] gap-0 p-1";
const cascadePickerSearchRowClassName = "group flex items-center gap-2 border-b px-2.5";
const cascadePickerSearchIconClassName = "size-4 shrink-0 text-muted-foreground group-focus-within:text-foreground";
const cascadePickerSearchInputClassName = "h-8 min-w-0 rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:border-transparent focus-visible:ring-0";
const cascadePickerOptionClassName = "flex min-h-10 w-full items-center gap-2 rounded-control px-2.5 py-1 text-left text-sm hover:bg-sidebar-accent focus-visible:bg-sidebar-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-pressed:bg-sidebar-accent pointer-coarse:min-h-11";

function CascadeRiskSelect({
  token,
  value,
  onChange,
  initialRiskId,
}: {
  token?: string;
  value: string;
  onChange: (value: string) => void;
  initialRiskId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<RiskRegisterListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 500);

  useEffect(() => {
    if (!token || !open) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await listRiskRegister(token, {
          limit: 100,
          q: debouncedQuery || undefined,
        });
        if (!active) return;
        setItems(res.data ?? []);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedQuery, open, token]);

  useEffect(() => {
    if (initialRiskId && !value) {
      onChange(initialRiskId);
    }
  }, [initialRiskId, onChange, value]);

  const selected = useMemo(
    () => items.find((item) => item.id === value),
    [items, value],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id="cascade-source-risk"
          data-slot="button"
          data-sidebar-hover=""
          type="button"
          variant="outline"
          className="w-full justify-between"
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selected ? `${selected.code || "Risk"} · ${selected.title || "-"}` : "Pilih risiko asal"}
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cascadePickerContentClassName}
        align="start"
        sideOffset={6}
      >
        <div className={cascadePickerSearchRowClassName}>
          <Search aria-hidden="true" className={cascadePickerSearchIconClassName} />
          <SearchInput
            type="search"
            className={cascadePickerSearchInputClassName}
            aria-label="Cari kode atau judul risiko"
            placeholder="Cari kode atau judul risiko..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto pt-1">
          {loading ? (
            <div role="status" className="flex min-h-8 items-center gap-2 px-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat risiko...
            </div>
          ) : items.length === 0 ? (
            <p role="status" className="px-2.5 py-1.5 text-sm text-muted-foreground">
              Risiko belum ditemukan.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={value === item.id}
                className={cascadePickerOptionClassName}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <GitBranch aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-5">
                    {item.code || "Risk"} · {item.title || "-"}
                  </span>
                  <span className="block truncate text-xs leading-4 text-muted-foreground">
                    {item.orgName || "Organisasi belum dipetakan"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CascadeOrgSelect({
  token,
  value,
  onChange,
  flow,
  triggerLabel,
}: {
  token?: string;
  value: string;
  onChange: (value: string) => void;
  flow: OrgFlow;
  triggerLabel: string;
}) {
  const [items, setItems] = useState<OrganizationListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 500);

  useEffect(() => {
    if (!token || !open) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const response = await listOrganizations(token, {
          q: debouncedQuery || undefined,
          page: 1,
          limit: 6,
        });
        if (!active) return;
        const orgs = response.data ?? [];
        const filtered = orgs.filter((item) => {
          if (flow === "downstream") return item.uprLevel !== "kementerian";
          if (flow === "upstream") return item.uprLevel === "kementerian";
          return true;
        });
        setItems(filtered);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedQuery, flow, open, token]);

  const selected = useMemo(() => items.find((item) => item.id === value), [items, value]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id="cascade-target-organization"
          data-slot="button"
          data-sidebar-hover=""
          type="button"
          variant="outline"
          className="w-full justify-between"
        >
          <span className="min-w-0 flex-1 truncate text-left">{selected?.name || triggerLabel}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cascadePickerContentClassName}
        align="start"
        sideOffset={6}
      >
        <div className={cascadePickerSearchRowClassName}>
          <Search aria-hidden="true" className={cascadePickerSearchIconClassName} />
          <SearchInput
            type="search"
            className={cascadePickerSearchInputClassName}
            aria-label="Cari organisasi tujuan"
            placeholder="Cari organisasi..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto pt-1">
          {loading ? (
            <div role="status" className="flex min-h-8 items-center gap-2 px-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat organisasi...
            </div>
          ) : items.length === 0 ? (
            <p role="status" className="px-2.5 py-1.5 text-sm text-muted-foreground">
              Organisasi belum ditemukan.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={value === item.id}
                className={cascadePickerOptionClassName}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium leading-5">{item.name}</span>
                  <span className="block truncate text-xs leading-4 text-muted-foreground">
                    {item.uprLevel || "Organisasi"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RiskCascadeActionDialog({
  open,
  onOpenChange,
  mode,
  cascade,
  initialSourceRiskId = "",
  initialCascadeType = "bottom_up_escalation",
  title,
  description,
  onSaved,
}: DialogProps) {
  const { token } = useAuth();
  const [sourceRiskId, setSourceRiskId] = useState(initialSourceRiskId);
  const [targetOrgId, setTargetOrgId] = useState("");
  const [cascadeType, setCascadeType] = useState<RiskCascadeType>(initialCascadeType);
  const [analysisNote, setAnalysisNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [adoptionType, setAdoptionType] = useState<"full" | "partial">("full");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSourceRiskId(initialSourceRiskId);
    setCascadeType(initialCascadeType);
    setTargetOrgId("");
    setAnalysisNote("");
    setDecisionNote("");
    setAdoptionType("full");
  }, [open, initialCascadeType, initialSourceRiskId]);

  const targetOrgFlow: OrgFlow =
    cascadeType === "bottom_up_escalation"
      ? "upstream"
      : cascadeType === "mandatory_top_down" || cascadeType === "recommended_top_down"
        ? "downstream"
        : "any";

  const targetOrgLabel =
    targetOrgFlow === "upstream"
      ? "Pilih organisasi di atas"
      : targetOrgFlow === "downstream"
        ? "Pilih organisasi di bawah"
        : "Pilih organisasi tujuan";

  useEffect(() => {
    if (!open) return;
    setTargetOrgId("");
  }, [cascadeType, open]);

  const dialogTitle =
    title ??
    (mode === "create"
      ? "Buat eskalasi risiko"
      : cascade?.cascadeType === "bottom_up_escalation"
        ? "Tinjau bottom-up"
        : "Tinjau top-down");

  const dialogDescription =
    description ??
    (mode === "create"
      ? "Tentukan risiko asal, organisasi tujuan, dan alasan pengajuan."
      : "Tinjau usulan lalu berikan keputusan dengan catatan yang jelas.");

  const canSubmitCreate = Boolean(sourceRiskId && targetOrgId && token);
  const canSubmitDecision = Boolean(cascade && token && decisionNote.trim());

  async function handleCreate() {
    if (!token || !sourceRiskId || !targetOrgId) return;
    try {
      setSaving(true);
      const payload: CreateRiskCascadeRequest = {
        sourceRiskId,
        targetOrgId,
        analysisNote,
      };
      const created =
        cascadeType === "bottom_up_escalation"
          ? await createBottomUpRiskCascade(token, payload)
          : await createMandatoryRiskCascade(token, payload);
      toast.success("Eskalasi risiko berhasil dibuat.");
      onOpenChange(false);
      onSaved?.();
      return created;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Eskalasi belum berhasil dibuat.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecision(decision: "accept" | "reject") {
    if (!token || !cascade) return;
    try {
      setSaving(true);
      const payload: DecideRiskCascadeRequest = {
        decision,
        adoptionType: decision === "accept" ? adoptionType : undefined,
        decisionNote,
      };
      await decideRiskCascade(token, cascade.id, payload);
      toast.success(decision === "accept" ? "Eskalasi disetujui." : "Eskalasi ditolak.");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Keputusan belum berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl no-scrollbar" showCloseButton={false}>
        <div className="flex min-h-0 flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-base">{dialogTitle}</DialogTitle>
            <DialogDescription className="max-w-[48ch]">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          {mode === "create" ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cascade-type">Jenis eskalasi</Label>
                <PopoverSelectField
                  id="cascade-type"
                  value={cascadeType}
                  onValueChange={(value) =>
                    setCascadeType(value as RiskCascadeType)
                  }
                  options={createCascadeOptions}
                  placeholder="Pilih jenis eskalasi"
                  ariaLabel="Jenis eskalasi"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cascade-source-risk">Risiko sumber</Label>
                <CascadeRiskSelect
                  token={token ?? undefined}
                  value={sourceRiskId}
                  onChange={setSourceRiskId}
                  initialRiskId={initialSourceRiskId}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cascade-target-organization">
                  Organisasi tujuan
                </Label>
                <CascadeOrgSelect
                  token={token ?? undefined}
                  value={targetOrgId}
                  onChange={setTargetOrgId}
                  flow={targetOrgFlow}
                  triggerLabel={targetOrgLabel}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cascade-analysis-note">Alasan eskalasi</Label>
                <Textarea
                  id="cascade-analysis-note"
                  value={analysisNote}
                  onChange={(event) => setAnalysisNote(event.target.value)}
                  placeholder="Contoh: risiko ini perlu diteruskan ke unit tujuan karena temuan SPI..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg bg-muted/20 p-4 ring-1 ring-inset ring-border/60">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {cascade?.cascadeType ? cascadeTypeLabels[cascade.cascadeType] : "Eskalasi"}
                  </Badge>
                  <Badge variant={toBadgeVariant(statusBadgeTones[cascade?.status || "proposed"] ?? "neutral")}
                    className={getStatusBadgeClassName(statusBadgeTones[cascade?.status || "proposed"] ?? "neutral")}
                  >
                    {statusLabels[cascade?.status || "proposed"] || cascade?.status || "proposed"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Sumber
                    </p>
                    <p className="break-words text-sm font-medium text-foreground">
                      {cascade?.sourceRiskCode || "Risk"} {cascade?.sourceRiskTitle ? `· ${cascade.sourceRiskTitle}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{cascade?.sourceOrgName || "-"}</p>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Tujuan
                    </p>
                    <p className="break-words text-sm font-medium text-foreground">
                      {cascade?.targetOrgName || "-"}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      {cascade?.targetRiskCode
                        ? `Target risiko: ${cascade.targetRiskCode}`
                        : "Belum ada risiko target"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cascade-adoption-type">Cakupan adopsi</Label>
                <PopoverSelectField
                  id="cascade-adoption-type"
                  value={adoptionType}
                  onValueChange={(value) =>
                    setAdoptionType(value as "full" | "partial")
                  }
                  options={adoptionOptions}
                  placeholder="Pilih cakupan"
                  ariaLabel="Cakupan adopsi"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cascade-decision-note">
                  Catatan keputusan
                  <span className="ml-0.5 text-destructive" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Textarea
                  id="cascade-decision-note"
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder="Tuliskan alasan setuju atau tolak secara singkat dan jelas."
                  className=""
                  aria-required="true"
                />
              </div>
            </div>
          )}

          <DialogFooter className="sm:flex-row">
            <CollectionDialogCancel
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </CollectionDialogCancel>
            {mode === "create" ? (
              <AccentButton
                onClick={handleCreate}
                disabled={!canSubmitCreate || saving}
                icon={
                  saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )
                }
              >
                Simpan eskalasi
              </AccentButton>
            ) : (
              <>
                <DestructiveButton
                  onClick={() => handleDecision("reject")}
                  disabled={!canSubmitDecision || saving}
                  loading={saving}
                >
                  Tolak
                </DestructiveButton>
                <AccentButton
                  onClick={() => handleDecision("accept")}
                  disabled={!canSubmitDecision || saving}
                  icon={
                    saving ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )
                  }
                >
                  Setujui
                </AccentButton>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
