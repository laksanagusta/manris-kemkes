"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, GitBranch, CheckCircle2 } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  { value: "mandatory_top_down", label: "Top-down" },
  { value: "bottom_up_escalation", label: "Bottom-up" },
] as const;

const statusLabels: Record<string, string> = {
  proposed: "Menunggu Tinjauan",
  analyzed: "Sedang Ditinjau",
  accepted: "Disetujui",
  rejected: "Ditolak",
  implemented: "Selesai",
};

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
        <Button variant="outline" className="w-full justify-between gap-2 font-normal">
          <span className="truncate">
            {selected ? `${selected.code || "Risk"} · ${selected.title || "-"}` : "Pilih risiko asal"}
          </span>
          <Search className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Cari kode atau judul risiko..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat risiko...
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Risiko belum ditemukan.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  value === item.id && "bg-accent",
                )}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <GitBranch className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {item.code || "Risk"} · {item.title || "-"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
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
        <Button variant="outline" className="w-full justify-between gap-2 font-normal">
          <span className="truncate">{selected?.name || triggerLabel}</span>
          <Search className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Cari organisasi..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat organisasi...
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Organisasi belum ditemukan.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
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
  initialCascadeType = "mandatory_top_down",
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
      ? "Buat Eskalasi Risiko"
      : cascade?.cascadeType === "bottom_up_escalation"
        ? "Tinjau Bottom-up"
        : "Tinjau Top-down");

  const dialogDescription =
    description ??
    (mode === "create"
      ? "Pilih risiko asal, organisasi tujuan, dan alasan pengajuan."
      : "Setujui atau tolak usulan dengan catatan keputusan yang jelas.");

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {mode === "create" ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Jenis eskalasi</Label>
                  <Select value={cascadeType} onValueChange={(value) => setCascadeType(value as RiskCascadeType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis eskalasi" />
                    </SelectTrigger>
                    <SelectContent>
                      {createCascadeOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Risiko sumber</Label>
                  <CascadeRiskSelect
                    token={token ?? undefined}
                    value={sourceRiskId}
                    onChange={setSourceRiskId}
                    initialRiskId={initialSourceRiskId}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Organisasi tujuan</Label>
                  <CascadeOrgSelect
                    token={token ?? undefined}
                    value={targetOrgId}
                    onChange={setTargetOrgId}
                    flow={targetOrgFlow}
                    triggerLabel={targetOrgLabel}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alasan eskalasi</Label>
                <Textarea
                  value={analysisNote}
                  onChange={(event) => setAnalysisNote(event.target.value)}
                  placeholder="Contoh: risiko ini perlu diteruskan ke unit tujuan karena temuan SPI..."
                  className="min-h-28"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                    {cascade?.cascadeType ? cascadeTypeLabels[cascade.cascadeType] : "Eskalasi"}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {statusLabels[cascade?.status || "proposed"] || cascade?.status || "proposed"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sumber</p>
                    <p className="mt-1 text-sm font-medium">
                      {cascade?.sourceRiskCode || "Risk"} {cascade?.sourceRiskTitle ? `· ${cascade.sourceRiskTitle}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{cascade?.sourceOrgName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tujuan</p>
                    <p className="mt-1 text-sm font-medium">{cascade?.targetOrgName || "-"}</p>
                    <p className="text-xs text-muted-foreground">{cascade?.targetRiskCode ? `Target risk: ${cascade.targetRiskCode}` : "Belum ada target risk"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cakupan adopsi</Label>
                <Select value={adoptionType} onValueChange={(value) => setAdoptionType(value as "full" | "partial")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih cakupan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Penuh</SelectItem>
                    <SelectItem value="partial">Sebagian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Catatan keputusan</Label>
                <Textarea
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder="Tuliskan alasan setuju atau tolak secara singkat dan jelas."
                  className="min-h-28"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          {mode === "create" ? (
            <Button onClick={handleCreate} disabled={!canSubmitCreate || saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Simpan Eskalasi
            </Button>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={() => handleDecision("reject")}
                disabled={!canSubmitDecision || saving}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Tolak"}
              </Button>
              <Button
                onClick={() => handleDecision("accept")}
                disabled={!canSubmitDecision || saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Setujui
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
