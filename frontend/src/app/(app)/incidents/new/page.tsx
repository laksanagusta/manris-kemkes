"use client";

import { toast } from "sonner";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import type {
  IncidentBatchCreateItem,
  IncidentBatchCreateResultItem,
  IncidentBatchExtraction,
  IncidentDraft,
  IncidentRecord,
  IncidentRiskSuggestion,
  IncidentSeverity,
  ManualIncidentRiskSuggestionRequest,
} from "@/types/incident";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  FileText,
  Link2,
  Loader2,
  PencilLine,
  Search,
  Save,
  ShieldAlert,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";

type RiskOption = {
  id: string;
  code?: string;
  title?: string;
  status?: string;
  orgName?: string;
};

type CandidateItem = {
  clientKey: string;
  selected: boolean;
  incident: IncidentDraft;
  linkedRiskIds: string[];
  riskSuggestions: IncidentRiskSuggestion[];
  missingFields: string[];
  warnings: string[];
  confidence: number;
};

const severityOptions: Array<{
  value: IncidentSeverity;
  label: string;
  description: string;
}> = [
  {
    value: "insignificant",
    label: "Rendah",
    description: "Gangguan terbatas dan dapat ditangani cepat.",
  },
  {
    value: "minor",
    label: "Sedang",
    description: "Ada dampak operasional, tetapi layanan masih terkendali.",
  },
  {
    value: "major",
    label: "Tinggi",
    description: "Ada kerugian nyata pada layanan, aset, atau reputasi.",
  },
  {
    value: "critical",
    label: "Kritis",
    description: "Berisiko pada keselamatan jiwa atau kegagalan layanan besar.",
  },
];

function getSeverityLabel(severity: string) {
  return severityOptions.find((option) => option.value === severity)?.label ?? "Sedang";
}

function buildFallbackTitle(item: CandidateItem) {
  const safeTitle = item.incident.title.trim() || item.incident.what.trim();
  if (safeTitle.length <= 80) return safeTitle;
  return `${safeTitle.slice(0, 77).trimEnd()}...`;
}

function buildCreateItem(item: CandidateItem, organizationId: string | null | undefined): IncidentBatchCreateItem {
  return {
    clientKey: item.clientKey,
    title: buildFallbackTitle(item),
    what: item.incident.what.trim(),
    who: item.incident.who.trim(),
    when: item.incident.when || null,
    where: item.incident.where.trim(),
    whyHow: item.incident.whyHow.trim(),
    severity: item.incident.severity,
    correctiveAction: item.incident.correctiveAction.trim(),
    preventiveAction: item.incident.preventiveAction.trim(),
    linkedRiskIds: item.linkedRiskIds,
    organizationId,
  };
}

function validateCandidate(item: CandidateItem) {
  return (
    item.incident.what.trim().length > 0 &&
    item.incident.who.trim().length > 0 &&
    item.incident.where.trim().length > 0 &&
    Boolean(item.incident.when) &&
    item.incident.severity.trim().length > 0
  );
}

function dedupeRiskIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function isManualSuggestionInputComplete(input: {
  what: string;
  who: string;
  where: string;
  when: string;
  severity: string;
}) {
  return (
    input.what.trim().length > 0 &&
    input.who.trim().length > 0 &&
    input.where.trim().length > 0 &&
    input.when.trim().length > 0 &&
    input.severity.trim().length > 0
  );
}

export function IncidentFormPage({ incidentId }: { incidentId?: string }) {
  const router = useRouter();
  const { token, user } = useAuth();

  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(incidentId ?? null);
  const [isEditLoading, setIsEditLoading] = useState(Boolean(incidentId));
  const [risks, setRisks] = useState<RiskOption[]>([]);
  const [risksLoading, setRisksLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentWarnings, setDocumentWarnings] = useState<string[]>([]);
  const [sourcePreview, setSourcePreview] = useState("");
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [riskSearch, setRiskSearch] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualWhat, setManualWhat] = useState("");
  const [manualWho, setManualWho] = useState("");
  const [manualWhere, setManualWhere] = useState("");
  const [manualWhen, setManualWhen] = useState("");
  const [manualSeverity, setManualSeverity] = useState<IncidentSeverity>("minor");
  const [manualStatus, setManualStatus] = useState("draft");
  const [manualWhyHow, setManualWhyHow] = useState("");
  const [manualCorrectiveAction, setManualCorrectiveAction] = useState("");
  const [manualPreventiveAction, setManualPreventiveAction] = useState("");
  const [manualRiskQuery, setManualRiskQuery] = useState("");
  const [manualLinkedRiskIds, setManualLinkedRiskIds] = useState<string[]>([]);
  const [manualRiskSuggestions, setManualRiskSuggestions] = useState<IncidentRiskSuggestion[]>([]);
  const [isGeneratingRiskSuggestions, setIsGeneratingRiskSuggestions] = useState(false);
  const [manualSuggestionInputKey, setManualSuggestionInputKey] = useState<string | null>(null);
  const [showManualFollowUp, setShowManualFollowUp] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);

  const isEditMode = Boolean(currentIncidentId);

  const deferredRiskSearch = useDeferredValue(riskSearch);
  const deferredManualRiskSearch = useDeferredValue(manualRiskQuery);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setRisksLoading(true);

    api
      .get<RiskOption[]>("/risks", token)
      .then((data) => {
        if (cancelled) return;
        setRisks((data || []).filter((risk) => risk.status !== "draft"));
      })
      .catch((error) => {
        console.error("Failed to load risks:", error);
        if (!cancelled) {
          toast.error("Daftar risiko gagal dimuat. Anda masih bisa review hasil AI terlebih dulu.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRisksLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
	setCurrentIncidentId(incidentId ?? null);
	setIsEditLoading(Boolean(incidentId));
	setShowBatchUpload(false);
  }, [incidentId]);

  useEffect(() => {
	if (!token || !incidentId) {
	  if (!incidentId) {
		setIsEditLoading(false);
	  }
	  return;
	}

	let cancelled = false;
	setIsEditLoading(true);

	api
	  .get<IncidentRecord>(`/incidents/${incidentId}`, token)
	  .then((incident) => {
		if (cancelled) return;
		setCurrentIncidentId(incident.id);
		setManualTitle(incident.title || "");
		setManualWhat(incident.what || "");
		setManualWho(incident.who || "");
		setManualWhere(incident.where || "");
		setManualWhen(incident.when ? incident.when.slice(0, 16) : "");
		setManualSeverity((incident.severity as IncidentSeverity) || "minor");
		setManualStatus(incident.status || "draft");
		setManualWhyHow(incident.whyHow || "");
		setManualCorrectiveAction(incident.correctiveAction || "");
		setManualPreventiveAction(incident.preventiveAction || "");
		setManualLinkedRiskIds((incident.linkedRisks || []).map((risk) => risk.id));
		setManualRiskSuggestions([]);
		setManualSuggestionInputKey(null);
		setShowManualFollowUp(Boolean(incident.whyHow || incident.correctiveAction || incident.preventiveAction));
	  })
	  .catch((error) => {
		console.error("Failed to load incident for editing:", error);
		toast.error("Data insiden gagal dimuat.");
		router.push("/incidents");
	  })
	  .finally(() => {
		if (!cancelled) {
		  setIsEditLoading(false);
		}
	  });

	return () => {
	  cancelled = true;
	};
  }, [incidentId, router, token]);

  const editingCandidate = useMemo(
    () => candidates.find((candidate) => candidate.clientKey === editingKey) ?? null,
    [candidates, editingKey]
  );

  const filteredRiskOptions = useMemo(() => {
    const query = deferredRiskSearch.trim().toLowerCase();
    if (!query) return risks.slice(0, 8);

    return risks
      .filter((risk) => {
        const haystack = [risk.code, risk.title, risk.orgName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 10);
  }, [deferredRiskSearch, risks]);

  const selectedCount = useMemo(
    () => candidates.filter((candidate) => candidate.selected).length,
    [candidates]
  );

  const validSelectedCount = useMemo(
    () => candidates.filter((candidate) => candidate.selected && validateCandidate(candidate)).length,
    [candidates]
  );

  const filteredManualRiskOptions = useMemo(() => {
    const query = deferredManualRiskSearch.trim().toLowerCase();
    if (!query) return risks.slice(0, 8);

    return risks
      .filter((risk) => {
        const haystack = [risk.code, risk.title, risk.orgName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 10);
  }, [deferredManualRiskSearch, risks]);

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Hanya file PDF yang didukung untuk v1.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setDocumentName(file.name);
    setCandidates([]);
    setDocumentWarnings([]);
    setSourcePreview("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (user?.organizationId) {
        formData.append("organizationId", user.organizationId);
      }

      const result = await api.postForm<IncidentBatchExtraction>(
        "/ai/incidents/extract-batch",
        formData,
        token
      );

      const nextCandidates: CandidateItem[] = (result.items || []).map((item) => ({
        clientKey: item.clientKey,
        selected: true,
        incident: {
          ...item.incident,
          severity: (item.incident.severity || "minor") as IncidentSeverity,
        },
        linkedRiskIds: dedupeRiskIds(item.riskSuggestions.map((risk) => risk.riskId)),
        riskSuggestions: item.riskSuggestions || [],
        missingFields: item.missingFields || [],
        warnings: item.warnings || [],
        confidence: item.confidence ?? 0,
      }));

      setCandidates(nextCandidates);
      setDocumentWarnings(result.documentWarnings || []);
      setSourcePreview(result.sourcePreview || "");
      setEditingKey(nextCandidates[0]?.clientKey ?? null);

      if (nextCandidates.length === 0) {
        toast.warning("AI belum menemukan kandidat insiden yang cukup jelas dari PDF ini.");
      } else {
        toast.success(`${nextCandidates.length} kandidat insiden berhasil diekstrak.`);
      }
    } catch (error) {
      console.error("Failed to extract incidents:", error);
      toast.error("PDF belum berhasil diekstrak. Pastikan file berupa PDF teks dan ukurannya tidak terlalu besar.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleToggleCandidate = (clientKey: string) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.clientKey === clientKey
          ? { ...candidate, selected: !candidate.selected }
          : candidate
      )
    );
  };

  const handleFieldChange = (clientKey: string, field: keyof IncidentDraft, value: string) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.clientKey === clientKey
          ? {
              ...candidate,
              incident: {
                ...candidate.incident,
                [field]: value,
              },
            }
          : candidate
      )
    );
  };

  const handleToggleRisk = (clientKey: string, riskId: string) => {
    setCandidates((current) =>
      current.map((candidate) => {
        if (candidate.clientKey !== clientKey) return candidate;

        const exists = candidate.linkedRiskIds.includes(riskId);
        return {
          ...candidate,
          linkedRiskIds: exists
            ? candidate.linkedRiskIds.filter((id) => id !== riskId)
            : dedupeRiskIds([...candidate.linkedRiskIds, riskId]),
        };
      })
    );
  };

  const handleRemoveRisk = (clientKey: string, riskId: string) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.clientKey === clientKey
          ? {
              ...candidate,
              linkedRiskIds: candidate.linkedRiskIds.filter((id) => id !== riskId),
            }
          : candidate
      )
    );
  };

  const handleSaveBatch = async () => {
    if (!token) return;

    const selectedItems = candidates.filter((candidate) => candidate.selected);
    if (selectedItems.length === 0) {
      toast.error("Pilih minimal satu kandidat insiden untuk disimpan.");
      return;
    }

    const invalidCount = selectedItems.filter((candidate) => !validateCandidate(candidate)).length;
    if (invalidCount > 0) {
      toast.error(`Masih ada ${invalidCount} kandidat yang belum lengkap. Review dulu sebelum simpan batch.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        items: selectedItems.map((item) => buildCreateItem(item, user?.organizationId)),
      };

      const result = await api.post<{ items: IncidentBatchCreateResultItem[] }>(
        "/incidents/batch",
        payload,
        token
      );

      const createdItems = result.items.filter((item) => item.status === "created" && item.id);
      const failedItems = result.items.filter((item) => item.status !== "created");

      if (createdItems.length > 0) {
        await Promise.all(
          createdItems.map(async (item) => {
            try {
              await api.post(
                "/approvals/submit",
                {
                  requestType: "incident",
                  entityId: item.id,
                  notes: "",
                },
                token
              );
            } catch (approvalError) {
              console.error(`Failed to submit approval for ${item.id}`, approvalError);
            }
          })
        );
      }

      if (failedItems.length > 0) {
        toast.warning(
          `${createdItems.length} insiden tersimpan, ${failedItems.length} item masih gagal dan perlu dicek lagi.`
        );
        const failedKeys = new Set(failedItems.map((item) => item.clientKey));
        setCandidates((current) =>
          current
            .filter((candidate) => failedKeys.has(candidate.clientKey))
            .map((candidate) => ({ ...candidate, selected: true }))
        );
        setEditingKey(failedItems[0]?.clientKey ?? null);
        return;
      }

      toast.success(`${createdItems.length} insiden berhasil dibuat dan dikirim ke jalur approval.`);
      router.push("/incidents");
    } catch (error) {
      console.error("Failed to save incident batch:", error);
      toast.error("Batch insiden belum tersimpan. Periksa koneksi atau hasil review item.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRiskRecords = useMemo(() => {
    if (!editingCandidate) return [];
    return editingCandidate.linkedRiskIds
      .map((riskId) => risks.find((risk) => risk.id === riskId))
      .filter(Boolean) as RiskOption[];
  }, [editingCandidate, risks]);

  const manualSelectedRiskRecords = useMemo(
    () =>
      manualLinkedRiskIds
        .map((riskId) => risks.find((risk) => risk.id === riskId))
        .filter(Boolean) as RiskOption[],
    [manualLinkedRiskIds, risks]
  );

  const manualSuggestionInputKeyCurrent = useMemo(
    () =>
      JSON.stringify({
        title: manualTitle.trim(),
        what: manualWhat.trim(),
        who: manualWho.trim(),
        when: manualWhen.trim(),
        where: manualWhere.trim(),
        whyHow: manualWhyHow.trim(),
        severity: manualSeverity,
      }),
    [manualTitle, manualWhat, manualWho, manualWhen, manualWhere, manualWhyHow, manualSeverity]
  );

  const canGenerateManualSuggestions = isManualSuggestionInputComplete({
    what: manualWhat,
    who: manualWho,
    where: manualWhere,
    when: manualWhen,
    severity: manualSeverity,
  });

  const manualSuggestionStale =
    manualSuggestionInputKey !== null && manualSuggestionInputKey !== manualSuggestionInputKeyCurrent;

  const hasGeneratedManualSuggestions = manualSuggestionInputKey !== null;

  const handleToggleManualRisk = (riskId: string) => {
    setManualLinkedRiskIds((current) =>
      current.includes(riskId)
        ? current.filter((id) => id !== riskId)
        : dedupeRiskIds([...current, riskId])
    );
  };

  const handleGenerateManualSuggestions = async () => {
    if (!token) return;

    if (!canGenerateManualSuggestions) {
      toast.error("Lengkapi fakta inti insiden dulu sebelum meminta saran risiko.");
      return;
    }

    setIsGeneratingRiskSuggestions(true);
    try {
      const payload: ManualIncidentRiskSuggestionRequest = {
        title: manualTitle.trim() || undefined,
        what: manualWhat.trim(),
        who: manualWho.trim(),
        when: new Date(manualWhen).toISOString(),
        where: manualWhere.trim(),
        whyHow: manualWhyHow.trim() || undefined,
        severity: manualSeverity,
        organizationId: user?.organizationId,
      };

      const result = await api.post<IncidentRiskSuggestion[]>(
        "/ai/incidents/suggest-risks",
        payload,
        token
      );

      setManualRiskSuggestions(result || []);
      setManualSuggestionInputKey(manualSuggestionInputKeyCurrent);

      if ((result || []).length === 0) {
        toast.warning("AI belum menemukan risiko existing yang cukup relevan untuk insiden ini.");
      } else {
        toast.success(`${result.length} saran risiko berhasil dibuat.`);
      }
    } catch (error) {
      console.error("Failed to generate manual incident risk suggestions:", error);
      toast.error("Saran risiko belum berhasil dibuat. Anda tetap bisa memilih risiko secara manual.");
    } finally {
      setIsGeneratingRiskSuggestions(false);
    }
  };

  const handleSaveManual = async () => {
    if (!token) return;

    if (!manualWhat.trim() || !manualWho.trim() || !manualWhere.trim() || !manualWhen.trim()) {
      toast.error("Lengkapi dulu ringkasan kejadian, pihak terlibat, lokasi, dan waktu kejadian.");
      return;
    }

    setIsManualSaving(true);
    try {
      if (currentIncidentId) {
        await api.put(
          `/incidents/${currentIncidentId}`,
          {
            title: manualTitle.trim() || manualWhat.trim().slice(0, 80),
            what: manualWhat.trim(),
            who: manualWho.trim(),
            when: new Date(manualWhen).toISOString(),
            where: manualWhere.trim(),
            whyHow: manualWhyHow.trim(),
            severity: manualSeverity,
            status: manualStatus || "draft",
            correctiveAction: manualCorrectiveAction.trim(),
            preventiveAction: manualPreventiveAction.trim(),
            linkedRiskIDs: manualLinkedRiskIds,
            organizationId: user?.organizationId ?? null,
          },
          token
        );

        toast.success("Insiden berhasil diperbarui.", {
          description: "Perubahan tersimpan dan Anda tetap berada di form edit.",
        });
        router.replace(`/incidents/${currentIncidentId}`);
        return;
      }

      const payload = {
        items: [
          {
            clientKey: "manual-entry",
            title: manualTitle.trim() || manualWhat.trim().slice(0, 80),
            what: manualWhat.trim(),
            who: manualWho.trim(),
            when: new Date(manualWhen).toISOString(),
            where: manualWhere.trim(),
            whyHow: manualWhyHow.trim(),
            severity: manualSeverity,
            correctiveAction: manualCorrectiveAction.trim(),
            preventiveAction: manualPreventiveAction.trim(),
            linkedRiskIds: manualLinkedRiskIds,
            organizationId: user?.organizationId,
          },
        ],
      };

      const result = await api.post<{ items: IncidentBatchCreateResultItem[] }>(
        "/incidents/batch",
        payload,
        token
      );

      const createdItem = result.items.find((item) => item.status === "created" && item.id);
      if (!createdItem?.id) {
        toast.error(result.items[0]?.error || "Incident manual belum berhasil disimpan.");
        return;
      }

      try {
        await api.post(
          "/approvals/submit",
          {
            requestType: "incident",
            entityId: createdItem.id,
            notes: "",
          },
          token
        );
      } catch (approvalError) {
        console.error("Failed to submit manual incident approval", approvalError);
      }

      toast.success("Incident manual berhasil dibuat.", {
        description: "Draft tetap terbuka agar Anda bisa langsung meninjau hasil simpan.",
      });
      router.replace(`/incidents/${createdItem.id}`);
    } catch (error) {
      console.error("Failed to save manual incident:", error);
      toast.error("Incident manual belum tersimpan. Periksa kembali isian form.");
    } finally {
      setIsManualSaving(false);
    }
  };

  if (isEditLoading) {
    return (
      <FormPage className="max-w-7xl pb-16">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Memuat data insiden...</p>
          </div>
        </div>
      </FormPage>
    );
  }

  return (
    <FormPage className="max-w-7xl pb-16">
      <FormHeader
        title={showBatchUpload ? "Upload PDF batch" : isEditMode ? "Edit insiden" : "Laporan insiden baru"}
        description={
          showBatchUpload
            ? "Upload dokumen narasi untuk mengekstrak beberapa kandidat insiden, lalu review sebelum disimpan."
            : isEditMode
              ? "Perbarui detail kejadian, analisis, dan tautan risiko menggunakan form yang sama seperti input manual."
              : "Mulai dari fakta inti terlebih dahulu. Jika punya dokumen narasi, pindah ke mode upload PDF dari tombol di samping."
        }
        badges={
          <Badge variant="outline" className="border-primary/15 bg-primary/[0.04] text-primary">
            {showBatchUpload ? "Ekstraksi AI" : isEditMode ? "Mode edit" : "Input manual"}
          </Badge>
        }
        backLabel="Kembali ke register insiden"
        onBack={() => router.push("/incidents")}
        actions={
          <>
            {showBatchUpload ? (
              <div className="mr-2 hidden text-right xl:block">
                <p className="text-xs text-muted-foreground">
                  {selectedCount} dipilih dari {candidates.length} kandidat
                </p>
                <p className="text-xs font-medium text-foreground">
                  {validSelectedCount} siap disimpan
                </p>
              </div>
            ) : (
              <div className="mr-2 hidden text-right xl:block">
                <p className="text-xs text-muted-foreground">
                  {manualLinkedRiskIds.length} risiko dipilih
                </p>
                <p className="text-xs font-medium text-foreground">
                  {getSeverityLabel(manualSeverity)}
                </p>
              </div>
            )}
            {!isEditMode ? (
              <Button
                variant="outline"
                className="gap-2 text-xs"
                onClick={() => setShowBatchUpload((value) => !value)}
              >
                <Upload className="size-3.5" />
                {showBatchUpload ? "Kembali ke input manual" : "Upload PDF batch"}
              </Button>
            ) : null}
            {showBatchUpload ? (
              <Button
                className="gap-2 text-xs"
                onClick={handleSaveBatch}
                disabled={isSaving || selectedCount === 0}
              >
                {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {isSaving ? "Menyimpan..." : "Simpan batch"}
              </Button>
            ) : (
              <Button
                className="gap-2 text-xs"
                onClick={handleSaveManual}
                disabled={isManualSaving}
              >
                {isManualSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                {isManualSaving ? "Menyimpan..." : isEditMode ? "Update insiden" : "Simpan insiden"}
              </Button>
            )}
          </>
        }
      />

      {showBatchUpload ? (
        <section className="space-y-6">
          <div className="space-y-6">
              <Card className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Upload PDF
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-6 py-6">
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/[0.18] px-6 py-12 text-center transition-colors hover:border-primary/40 hover:bg-muted/[0.28]">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-background text-primary">
                      {isUploading ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Upload className="size-5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {isUploading ? "Mengekstrak PDF..." : "Pilih PDF teks"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Maks. 10 MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={isUploading}
                      onChange={handleUploadFile}
                    />
                  </label>

                  {documentName ? (
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <FileText className="size-4 text-muted-foreground" />
                      <span>{documentName}</span>
                    </div>
                  ) : null}

                  {documentWarnings.length > 0 ? (
                    <div className="space-y-1 rounded-2xl border border-risk-high/20 bg-risk-high/5 px-4 py-3">
                      {documentWarnings.map((warning) => (
                        <p key={warning} className="text-sm text-risk-high">
                          {warning}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {sourcePreview ? (
                    <div className="rounded-2xl border border-border/60 bg-background px-4 py-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Preview teks
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {sourcePreview}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Kandidat insiden
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-6 py-6">
                  {candidates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/60 bg-background px-5 py-10 text-center text-sm text-muted-foreground">
                      Belum ada hasil ekstraksi.
                    </div>
                  ) : (
                    candidates.map((candidate) => {
                      const linkedRiskCount = candidate.linkedRiskIds.length;
                      const reviewNotes = [];

                      if (candidate.missingFields.length > 0) {
                        reviewNotes.push(`${candidate.missingFields.length} field perlu dicek`);
                      }
                      if (candidate.warnings.length > 0) {
                        reviewNotes.push(`${candidate.warnings.length} catatan`);
                      }
                      if (linkedRiskCount > 0) {
                        reviewNotes.push(`${linkedRiskCount} risiko`);
                      }

                      return (
                        <div
                          key={candidate.clientKey}
                          className={cn(
                            "rounded-[20px] border px-4 py-4 transition-colors",
                            candidate.selected
                              ? "border-primary/20 bg-primary/[0.03]"
                              : "border-border/60 bg-background"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-2">
                              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <input
                                  type="checkbox"
                                  checked={candidate.selected}
                                  onChange={() => handleToggleCandidate(candidate.clientKey)}
                                  className="size-4"
                                />
                                Pilih
                              </label>
                              <div className="space-y-1">
                                <p className="text-base font-semibold text-foreground">
                                  {buildFallbackTitle(candidate) || "Tanpa judul"}
                                </p>
                                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                                  {candidate.incident.what || "Ringkasan kejadian belum cukup jelas."}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>{getSeverityLabel(candidate.incident.severity)}</span>
                                {candidate.incident.when ? (
                                  <span>{new Date(candidate.incident.when).toLocaleString("id-ID")}</span>
                                ) : null}
                                {reviewNotes.map((note) => (
                                  <span key={`${candidate.clientKey}-${note}`}>{note}</span>
                                ))}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 gap-2"
                              onClick={() => {
                                setEditingKey(candidate.clientKey);
                                setRiskSearch("");
                              }}
                            >
                              <PencilLine className="size-4" />
                              Review
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
          </div>
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)] xl:items-start">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[24px] border border-border/20 bg-card">
              <CardHeader className="border-b border-border/35 pb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Fakta inti
                    </p>
                    <CardTitle className="text-base font-semibold text-foreground">
                      Form insiden manual
                    </CardTitle>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Isi kronologi inti lebih dulu agar laporan cepat tercatat. Analisis lanjutan bisa
                      dilengkapi setelah situasi lebih stabil.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-border/60 bg-background text-foreground">
                      {getSeverityLabel(manualSeverity)}
                    </Badge>
                    <Badge variant="outline" className="border-primary/15 bg-primary/[0.04] text-primary">
                      {manualLinkedRiskIds.length} risiko ditautkan
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-8 px-6 py-6">
                <div className="space-y-3">
                  <Label>
                    Apa yang terjadi? <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={manualWhat}
                    onChange={(event) => setManualWhat(event.target.value)}
                    placeholder="Ringkasan kejadian"
                    className="min-h-32 leading-6"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Judul singkat</Label>
                  <Input
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    placeholder="Contoh: Gangguan genset gudang vaksin pusat"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label>
                      Siapa yang terlibat? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={manualWho}
                      onChange={(event) => setManualWho(event.target.value)}
                      placeholder="Pihak terlibat"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>
                      Di mana kejadian terjadi? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={manualWhere}
                      onChange={(event) => setManualWhere(event.target.value)}
                      placeholder="Lokasi kejadian"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label>
                      Kapan kejadian berlangsung? <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      value={manualWhen}
                      onChange={(event) => setManualWhen(event.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>
                      Seberapa serius dampaknya? <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={manualSeverity}
                      onValueChange={(value) => setManualSeverity(value as IncidentSeverity)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tingkat keparahan" />
                      </SelectTrigger>
                      <SelectContent>
                        {severityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-[22px] border border-border/40 bg-muted/[0.16] p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Analisis lanjutan</p>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                        Lengkapi bagian ini jika Anda sudah punya penjelasan penyebab dan tindak
                        lanjut awal.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowManualFollowUp((value) => !value)}
                    >
                      {showManualFollowUp ? "Sembunyikan analisis" : "Lengkapi analisis"}
                    </Button>
                  </div>

                  {showManualFollowUp ? (
                    <div className="mt-5 space-y-6 border-t border-border/35 pt-5">
                      <div className="space-y-3">
                        <Label>Mengapa dan bagaimana insiden ini bisa terjadi?</Label>
                        <Textarea
                          value={manualWhyHow}
                          onChange={(event) => setManualWhyHow(event.target.value)}
                          placeholder="Penyebab atau urutan kejadian"
                          className="min-h-32 leading-6"
                        />
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-3 rounded-2xl border border-success/10 bg-success/5 p-5">
                          <Label>Tindakan korektif awal</Label>
                          <Textarea
                            value={manualCorrectiveAction}
                            onChange={(event) => setManualCorrectiveAction(event.target.value)}
                            placeholder="Tindakan korektif"
                            className="min-h-28"
                          />
                        </div>
                        <div className="space-y-3 rounded-2xl border border-primary/8 bg-primary/5 p-5">
                          <Label>Tindakan pencegahan</Label>
                          <Textarea
                            value={manualPreventiveAction}
                            onChange={(event) => setManualPreventiveAction(event.target.value)}
                            placeholder="Tindakan pencegahan"
                            className="min-h-28"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      Tampilkan hanya saat Anda perlu menambahkan penyebab, tindakan korektif, dan
                      pencegahan.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 xl:sticky xl:top-24">
            <Card className="overflow-hidden rounded-[24px] border border-border/20 bg-card">
              <CardHeader className="border-b border-border/35">
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <ShieldAlert className="size-3.5" />
                    Relasi risiko
                  </p>
                  <CardTitle className="text-base font-semibold text-foreground">
                    Risiko terkait
                  </CardTitle>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Tautkan risiko yang paling relevan agar jalur tindak lanjut tetap tersambung.
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 px-6 py-6">
                <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Saran AI</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Generate daftar risiko terkait setelah fakta inti insiden terisi.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={handleGenerateManualSuggestions}
                      disabled={!canGenerateManualSuggestions || isGeneratingRiskSuggestions}
                    >
                      {isGeneratingRiskSuggestions ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      {isGeneratingRiskSuggestions ? "Menganalisis..." : "Generate suggestion"}
                    </Button>
                  </div>
                  {manualSuggestionStale ? (
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      Data insiden berubah. Generate ulang agar saran AI sesuai kondisi terbaru.
                    </p>
                  ) : null}
                  {!canGenerateManualSuggestions ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Isi ringkasan kejadian, pihak terlibat, lokasi, waktu, dan tingkat keparahan terlebih dahulu.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <Label>Cari risiko</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={manualRiskQuery}
                      onChange={(event) => setManualRiskQuery(event.target.value)}
                      placeholder="Cari kode atau judul"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/[0.14] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Dipilih
                  </p>
                  {manualSelectedRiskRecords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {manualSelectedRiskRecords.map((risk) => (
                        <button
                          key={risk.id}
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-primary/12 bg-primary/8 px-3 py-1 text-xs text-primary"
                          onClick={() => handleToggleManualRisk(risk.id)}
                        >
                          {risk.code || "Tanpa kode"} - {risk.title || "Tanpa judul"}
                          <XCircle className="size-3" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Belum ada risiko dipilih. Anda tetap bisa menyimpan insiden tanpa tautan, lalu
                      menambahkan relasinya nanti.
                    </p>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-border/40 bg-background p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="size-4 text-primary" />
                    Saran AI
                  </div>
                  {manualRiskSuggestions.length > 0 ? (
                    manualRiskSuggestions.map((suggestion) => {
                      const active = manualLinkedRiskIds.includes(suggestion.riskId);
                      return (
                        <button
                          key={`manual-suggestion-${suggestion.riskId}`}
                          type="button"
                          onClick={() => handleToggleManualRisk(suggestion.riskId)}
                          className={cn(
                            "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                            active ? "border-primary/20 bg-primary/10" : "border-border/60 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {suggestion.riskCode} - {suggestion.riskTitle}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                {suggestion.reason}
                              </p>
                            </div>
                            <Badge variant="outline">{suggestion.confidence}%</Badge>
                          </div>
                        </button>
                      );
                    })
                  ) : hasGeneratedManualSuggestions ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      AI belum menemukan risiko existing yang cukup relevan. Gunakan pencarian manual jika perlu.
                    </p>
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      Belum ada suggestion. Jalankan analisis AI untuk melihat daftar risiko yang mungkin terkait.
                    </p>
                  )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-border/20 bg-background">
                  {risksLoading ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      Memuat daftar risiko...
                    </div>
                  ) : filteredManualRiskOptions.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted-foreground">
                      Tidak ada risiko yang cocok dengan pencarian ini.
                    </div>
                  ) : (
                    <div className="max-h-[28rem] overflow-y-auto">
                      {filteredManualRiskOptions.map((risk, index) => {
                        const active = manualLinkedRiskIds.includes(risk.id);
                        return (
                          <button
                            key={risk.id}
                            type="button"
                            onClick={() => handleToggleManualRisk(risk.id)}
                            className={cn(
                              "flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50",
                              active && "bg-primary/5",
                              index !== filteredManualRiskOptions.length - 1 &&
                                "border-b border-border/15",
                            )}
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">
                                {risk.code || "Tanpa kode"} - {risk.title || "Tanpa judul"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {risk.orgName || "Unit kerja tidak tersedia"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <Link2 className="size-4" />
                              {active ? "Dipilih" : "Pilih"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <Dialog
        open={Boolean(editingCandidate)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingKey(null);
            setRiskSearch("");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          {editingCandidate ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit kandidat insiden</DialogTitle>
                <DialogDescription>
                  Koreksi hasil AI, pastikan fakta inti valid, lalu pilih beberapa risiko existing yang paling relevan.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label>Ringkasan kejadian</Label>
                    <Textarea
                      value={editingCandidate.incident.what}
                      onChange={(event) =>
                        handleFieldChange(editingCandidate.clientKey, "what", event.target.value)
                      }
                      className="min-h-32"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Judul singkat</Label>
                    <Input
                      value={editingCandidate.incident.title}
                      onChange={(event) =>
                        handleFieldChange(editingCandidate.clientKey, "title", event.target.value)
                      }
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Siapa yang terlibat</Label>
                      <Input
                        value={editingCandidate.incident.who}
                        onChange={(event) =>
                          handleFieldChange(editingCandidate.clientKey, "who", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Lokasi kejadian</Label>
                      <Input
                        value={editingCandidate.incident.where}
                        onChange={(event) =>
                          handleFieldChange(editingCandidate.clientKey, "where", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Waktu kejadian</Label>
                      <Input
                        type="datetime-local"
                        value={
                          editingCandidate.incident.when
                            ? editingCandidate.incident.when.slice(0, 16)
                            : ""
                        }
                        onChange={(event) =>
                          handleFieldChange(
                            editingCandidate.clientKey,
                            "when",
                            event.target.value ? new Date(event.target.value).toISOString() : ""
                          )
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Tingkat keparahan</Label>
                      <Select
                        value={editingCandidate.incident.severity}
                        onValueChange={(value) =>
                          handleFieldChange(
                            editingCandidate.clientKey,
                            "severity",
                            value as IncidentSeverity
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {severityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label} - {option.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Mengapa / bagaimana kejadian terjadi</Label>
                    <Textarea
                      value={editingCandidate.incident.whyHow}
                      onChange={(event) =>
                        handleFieldChange(editingCandidate.clientKey, "whyHow", event.target.value)
                      }
                      className="min-h-28"
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label>Tindakan korektif awal</Label>
                      <Textarea
                        value={editingCandidate.incident.correctiveAction}
                        onChange={(event) =>
                          handleFieldChange(
                            editingCandidate.clientKey,
                            "correctiveAction",
                            event.target.value
                          )
                        }
                        className="min-h-28"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Tindakan pencegahan</Label>
                      <Textarea
                        value={editingCandidate.incident.preventiveAction}
                        onChange={(event) =>
                          handleFieldChange(
                            editingCandidate.clientKey,
                            "preventiveAction",
                            event.target.value
                          )
                        }
                        className="min-h-28"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ShieldAlert className="size-4 text-primary" />
                      Risiko terpilih
                    </div>
                    {selectedRiskRecords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRiskRecords.map((risk) => (
                          <button
                            key={risk.id}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary"
                            onClick={() => handleRemoveRisk(editingCandidate.clientKey, risk.id)}
                          >
                            {risk.code || "Tanpa kode"} - {risk.title || "Tanpa judul"}
                            <XCircle className="size-3" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada risiko dipilih untuk item ini.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 rounded-3xl border border-border/60 bg-background p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Sparkles className="size-4 text-primary" />
                      Saran AI
                    </div>
                    {editingCandidate.riskSuggestions.length > 0 ? (
                      editingCandidate.riskSuggestions.map((suggestion) => {
                        const active = editingCandidate.linkedRiskIds.includes(suggestion.riskId);
                        return (
                          <button
                            key={`${editingCandidate.clientKey}-${suggestion.riskId}`}
                            type="button"
                            className={cn(
                              "w-full rounded-2xl border px-3 py-3 text-left transition-colors",
                              active
                                ? "border-primary/20 bg-primary/10"
                                : "border-border/60 hover:bg-muted/40"
                            )}
                            onClick={() => handleToggleRisk(editingCandidate.clientKey, suggestion.riskId)}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {suggestion.riskCode} - {suggestion.riskTitle}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  {suggestion.reason}
                                </p>
                              </div>
                              <Badge variant="outline">{suggestion.confidence}%</Badge>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        AI belum memberi saran risiko untuk item ini.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 rounded-3xl border border-border/60 bg-background p-4">
                    <Label className="text-sm font-semibold text-foreground">
                      Cari risiko existing lain
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={riskSearch}
                        onChange={(event) => setRiskSearch(event.target.value)}
                        placeholder="Cari kode, judul, atau unit kerja"
                        className="pl-9"
                      />
                    </div>
                    <div className="space-y-2">
                      {risksLoading ? (
                        <p className="text-sm text-muted-foreground">Memuat daftar risiko...</p>
                      ) : filteredRiskOptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Tidak ada risiko yang cocok.</p>
                      ) : (
                        filteredRiskOptions.map((risk) => {
                          const active = editingCandidate.linkedRiskIds.includes(risk.id);
                          return (
                            <button
                              key={risk.id}
                              type="button"
                              className={cn(
                                "flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
                                active
                                  ? "border-primary/20 bg-primary/10"
                                  : "border-border/60 hover:bg-muted/40"
                              )}
                              onClick={() => handleToggleRisk(editingCandidate.clientKey, risk.id)}
                            >
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {risk.code || "Tanpa kode"} - {risk.title || "Tanpa judul"}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {risk.orgName || "Unit kerja tidak tersedia"}
                                </p>
                              </div>
                              <Link2 className="mt-0.5 size-4 text-primary" />
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingKey(null)}>
                  Tutup editor
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </FormPage>
  );
}

export default function IncidentBatchUploadPage() {
  const searchParams = useSearchParams();
  const incidentId = searchParams.get("id") || undefined;

  return <IncidentFormPage incidentId={incidentId} />;
}
