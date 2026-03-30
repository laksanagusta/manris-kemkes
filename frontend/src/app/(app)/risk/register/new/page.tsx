
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Sparkles, Loader2, Fish,
  Users, BookOpen, Settings2, Package, Globe2,
  ChevronDown, ChevronUp, X, Check,
  History, Save, ArrowLeft, Send,
  MessageSquare, Shield, Activity, Trash2, Plus,
} from "lucide-react";

import { getRiskLevel, getRiskLevelLabel, levelToColor } from "@/lib/risk";
import { EditableList } from "@/components/shared/editable-list";
import { EditableItemsTable, type EditableItem } from "@/components/shared/editable-items-table";
import { MitigationTable, type MitigationItem } from "@/components/shared/mitigation-table";
import { MitigationPicker } from "@/components/shared/mitigation-picker";
import { MitigationProgressTab } from "@/components/shared/mitigation-progress-tab";
import type { Controllability, ControlEffectiveness, TreatmentOption } from "@/types/risk";

const CATEGORY_TITLES: Record<string, string> = {
  manusia: "Manusia", metode: "Metode", mesin: "Mesin", material: "Material", lingkungan: "Lingkungan",
};
const CATEGORY_ORDER: string[] = ["manusia", "metode", "mesin", "material", "lingkungan"];

function AiFieldButton({ loading, disabled, onClick, label }: { loading: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled || loading}
      className="h-6 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10 border-primary/20 shrink-0">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
    </Button>
  );
}

// ----------------------
// Zod Schema
// ----------------------
const formSchema = z.object({
  title: z.string().min(3, "Judul risiko minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  organizationId: z.string().optional(),
  riskCode: z.string().optional(),
  
  causes: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, "Sebab tidak boleh kosong")
  })).min(1, "Minimal pilih/isi 1 sebab"),

  riskSource: z.string().optional(),
  controllability: z.enum(["C", "UC"]).default("C"),

  impacts: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, "Dampak tidak boleh kosong")
  })).min(1, "Minimal isi 1 dampak"),

  existingControl: z.string().optional(),
  controlEffectiveness: z.string().optional(),
  probability: z.number().min(1).max(5).default(3),
  impact: z.number().min(1).max(5).default(3),
  weight: z.number().min(0.1).default(1.0),

  riskPriority: z.number().min(0).default(0),
  riskAppetite: z.string().optional(),
  treatmentOption: z.string().optional(),

  mitigations: z.array(z.object({
    id: z.string().optional(),
    action: z.string(),
    owner: z.string().default(""),
    treatmentOwnerId: z.string().optional(),
    dueDate: z.string().optional(),
    frequency: z.string().default("insidental"),
    recurringInterval: z.string().optional(),
    reportDay: z.number().optional(),
    reportDate: z.number().optional(),
  })).default([]),

  targetProbability: z.number().min(1).max(5).default(1),
  targetImpact: z.number().min(1).max(5).default(1),
  targetWeight: z.number().min(0.1).default(1.0),
  nextReviewDate: z.string().optional(),
});

const draftSchema = z.object({
  title: z.string().min(3, "Judul risiko minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  organizationId: z.string().optional(),
}).passthrough();

type FormValues = z.infer<typeof formSchema>;

export default function RiskInputPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  
  const [riskId, setRiskId] = useState<string | null>(null);
  const [riskStatus, setRiskStatus] = useState<string>("draft");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string }[]>([]);
  const submitTarget = useRef<"draft" | "finalize">("draft");

  const resolver = (data: any, context: any, options: any) => {
    const isDraft = submitTarget.current === "draft";
    const currentSchema = isDraft ? draftSchema : formSchema;
    return zodResolver(currentSchema)(data, context, options);
  };

  const form = useForm<any>({
    resolver,
    defaultValues: {
      title: "",
      description: "",
      organizationId: "",
      riskCode: "",
      causes: [],
      impacts: [],
      riskSource: "",
      controllability: "C",
      existingControl: "",
      controlEffectiveness: "",
      probability: 3,
      impact: 3,
      weight: 1.0,
      riskPriority: 0,
      riskAppetite: "",
      treatmentOption: "",
      mitigations: [],
      targetProbability: 1,
      targetImpact: 1,
      targetWeight: 1.0,
      nextReviewDate: "",
    }
  });

  const { watch, control, formState: { errors }, setValue, handleSubmit, reset, clearErrors } = form;
  
  const title = watch("title");
  const description = watch("description");
  const causes = watch("causes");
  const impacts = watch("impacts");
  const probability = watch("probability");
  const impact = watch("impact");
  const mitigations = watch("mitigations");
  const targetProbability = watch("targetProbability");
  const targetImpact = watch("targetImpact");
  const existingControl = watch("existingControl");
  const treatmentOption = watch("treatmentOption");
  const nextReviewDate = watch("nextReviewDate");

  useEffect(() => {
    if (token) {
      api.get<{ id: string; name: string }[]>("/organizations", token)
        .then(res => setOrganizations(res))
        .catch(console.error);

      api.get<any[]>("/users", token)
        .then(res => {
          // Hanya ambil user dengan role 'unit' (PIC yang sesuai) atau semua
          // Anda bisa sesuaikan filter. Jika ingin semua:
          // setAvailableUsers(res.map(u => ({ id: u.id, name: u.name })));
          
          const mappedUsers = res
            .filter(u => u.role === 'unit' || u.role === 'reviewer' || u.role === 'pimpinan') // Sesuaikan logic
            .map(u => ({ id: u.id, name: u.name }));
          setAvailableUsers(mappedUsers);
        })
        .catch(console.error);
    }
    if (user?.organizationId) {
      setValue("organizationId", user.organizationId);
    }

    const searchParams = new URLSearchParams(window.location.search);
    const existingRiskId = searchParams.get('id');

    if (existingRiskId && token) {
      loadRiskData(existingRiskId);
    }
  }, [user, token]);

  async function loadRiskData(id: string) {
    try {
      setIsSubmitting(true);
      const risk = await api.get<any>(`/risks/${id}`, token ?? undefined);

      setRiskId(risk.id);
      setRiskStatus(risk.status || "draft");
      
      const loadedCauses = Array.isArray(risk.cause) 
        ? risk.cause.filter((l: string) => l.trim()).map((l: string, i: number) => ({ id: `c-${i}`, text: l.trim() })) 
        : (typeof risk.cause === 'string' && risk.cause ? risk.cause.split("\\n").filter((l: string) => l.trim()).map((l: string, i: number) => ({ id: `c-${i}`, text: l.trim() })) : []);
      const loadedImpacts = Array.isArray(risk.impactDesc) 
        ? risk.impactDesc.filter((l: string) => l.trim()).map((l: string, i: number) => ({ id: `i-${i}`, text: l.trim() })) 
        : (typeof risk.impactDesc === 'string' && risk.impactDesc ? risk.impactDesc.split("\\n").filter((l: string) => l.trim()).map((l: string, i: number) => ({ id: `i-${i}`, text: l.trim() })) : []);

      reset({
        title: risk.title || "",
        description: risk.description || "",
        organizationId: risk.organizationId || "",
        riskCode: risk.code || "",
        causes: loadedCauses,
        impacts: loadedImpacts,
        riskSource: risk.riskSource || "",
        controllability: (risk.controllability as any) || "C",
        existingControl: risk.existingControl || "",
        controlEffectiveness: risk.controlEffectiveness || "",
        probability: risk.probability || 3,
        impact: risk.impact || 3,
        weight: risk.weight || 1.0,
        riskPriority: risk.riskPriority || 0,
        riskAppetite: risk.riskAppetite || "",
        treatmentOption: risk.treatmentOption || "",
        mitigations: Array.isArray(risk.mitigations) ? risk.mitigations.map((m: any) => ({
          ...m,
          treatmentOwnerId: m.ownerUserId || m.treatmentOwnerId,
        })) : [],
        targetProbability: risk.targetProbability || 1,
        targetImpact: risk.targetImpact || 1,
        targetWeight: risk.targetWeight || 1.0,
        nextReviewDate: risk.nextReviewDate || "",
      });

    } catch (err) {
      console.error("Failed to load risk data:", err);
      toast.error("Gagal memuat data risiko. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // UI state
  const [generatingCause, setGeneratingCause] = useState(false);
  const [generatingImpact, setGeneratingImpact] = useState(false);
  const [generatingRisk, setGeneratingRisk] = useState(false);
  const [riskSuggestions, setRiskSuggestions] = useState<{ title: string; description: string }[]>([]);
  const [showRiskSuggestions, setShowRiskSuggestions] = useState(false);

  // Computed
  const score = probability * impact;
  const level = useMemo(() => getRiskLevel(score), [score]);
  const targetScore = targetProbability * targetImpact;
  const targetLevel = useMemo(() => getRiskLevel(targetScore), [targetScore]);

  // Completeness
  const completenessItems = [
    { label: "Identifikasi", done: title.trim().length > 0 && description.trim().length > 0 && causes.length > 0 && impacts.length > 0 },
    { label: "Analisis", done: (existingControl || "").trim().length > 0 && score > 0 },
    { label: "Evaluasi", done: !!treatmentOption },
    { label: "Penanganan", done: mitigations.length > 0 },
    { label: "Target", done: targetScore > 0 },
    { label: "Jadwal", done: !!nextReviewDate },
  ];

  const buildPayload = (data: FormValues, status: string) => {
    let orgId: string | null = null;
    if (user?.role === "unit" && user.organizationId) {
      orgId = user.organizationId;
    } else if (data.organizationId && data.organizationId.trim() !== "") {
      orgId = data.organizationId;
    }

    return {
      title: data.title,
      description: data.description,
      status, 
      organizationId: orgId,
      cause: (data.causes || []).map((c: any) => c.text).filter((t: string) => t.trim()),
      riskSource: data.riskSource,
      controllability: data.controllability,
      impactDesc: (data.impacts || []).map((i: any) => i.text).filter((t: string) => t.trim()),
      existingControl: data.existingControl,
      controlEffectiveness: data.controlEffectiveness,
      probability: data.probability,
      impact: data.impact,
      weight: data.weight,
      riskPriority: data.riskPriority,
      riskAppetite: data.riskAppetite,
      treatmentOption: data.treatmentOption,
      targetProbability: data.targetProbability,
      targetImpact: data.targetImpact,
      targetWeight: data.targetWeight,
      nextReviewDate: data.nextReviewDate && data.nextReviewDate.trim() !== "" ? data.nextReviewDate : null,
      mitigations: (data.mitigations || []).map((m: any) => ({
        action: m.action,
        owner: m.owner,
        ...(m.treatmentOwnerId ? { ownerUserId: m.treatmentOwnerId } : {}),
        dueDate: m.dueDate && m.dueDate.trim() !== "" ? m.dueDate : null,
        frequency: m.frequency,
        recurringInterval: m.frequency === "rutin" ? (m.recurringInterval && m.recurringInterval.trim() !== "" ? m.recurringInterval : "mingguan") : null,
        reportDay: m.frequency === "rutin" && (m.recurringInterval === "mingguan" || !m.recurringInterval) ? (m.reportDay ?? 5) : null,
        reportDate: m.frequency === "rutin" && (m.recurringInterval === "bulanan" || m.recurringInterval === "triwulan") ? (m.reportDate ?? 5) : null,
        targetCost: 0,
      })),
    };
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const isDraft = submitTarget.current === "draft";
      const payload = buildPayload(data, "draft");

      let currentRiskId = riskId;

      if (currentRiskId) {
        await api.put<any>(`/risks/${currentRiskId}`, payload, token || undefined);
      } else {
        const res = await api.post<any>("/risks", payload, token || undefined);
        setRiskId(res.id);
        setValue("riskCode", res.code);
        currentRiskId = res.id;
      }

      if (isDraft) {
        toast.success("Draft berhasil disimpan!");
      } else {
        // Finalize
        try {
          await api.post("/approvals/submit", {
            requestType: "risk",
            entityId: currentRiskId,
            notes: ""
          }, token || undefined);
          toast.success("Risk berhasil disimpan dan diajukan untuk approval!");
          router.push("/risk/register");
        } catch (approvalErr: any) {
          const errorMsg = approvalErr?.message || approvalErr?.error || "Unknown error";
          toast.success(`Risk disimpan, namun gagal diajukan: ${errorMsg}`);
          router.push("/risk/register");
        }
      }
    } catch (err: any) {
      console.error("Failed to save", err);
      const errorMessage = err?.message || err?.error || "Gagal menyimpan data.";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertToDraft = async () => {
    if (!riskId) return;
    if (!confirm("Kembalikan dokumen ini ke status draft? (Akan menghapus status persetujuan saat ini)")) return;
    try {
      setIsSubmitting(true);
      const payload = buildPayload(form.getValues(), "draft");
      await api.put<any>(`/risks/${riskId}`, payload, token || undefined);
      toast.success("Berhasil dikembalikan ke status Draft.");
      setRiskStatus("draft");
    } catch (err: any) {
      toast.error(`Error: ${err?.message || err?.error || "Gagal mengubah status."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onValidationError = (errors: any) => {
    toast.error("Ada form isian yang wajib diisi atau masih salah. Periksa teks merah di bawah form.");
    console.error("Form Validation Errors: ", errors);
  };

  const FormErrorMessage = ({ error }: { error?: any }) => {
    if (!error) return null;
    return <span className="text-[10px] text-destructive mt-1 font-medium">{error}</span>;
  };

  // AI Generators
  async function handleGenerateRisk() {
    setGeneratingRisk(true);
    setShowRiskSuggestions(false);
    try {
      const res = await api.post<{ suggestions: { title: string; description: string }[] }>("/ai/risk-suggestions", { existingRisks: [] }, token || undefined);
      setRiskSuggestions(res.suggestions || []);
      setShowRiskSuggestions(true);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingRisk(false);
    }
  }

  async function handleGenerateCause() {
    if (!title.trim() || !description.trim()) {
      toast.error("Isi judul dan deskripsi dulu untuk AI");
      return;
    }
    setGeneratingCause(true);
    try {
      const res = await api.post<any>("/ai/causes", { title, description }, token || undefined);
      const newItems: { id: string; text: string }[] = [];
      let idx = 0;
      CATEGORY_ORDER.forEach((category) => {
        const categoryItems = res.categories[category] || [];
        categoryItems.forEach((itemText: string) => {
          newItems.push({ 
            id: `cause-${Date.now()}-${idx++}`, 
            text: `[${CATEGORY_TITLES[category]}] ${itemText}` 
          });
        });
      });
      setValue("causes", newItems.length > 0 ? newItems : [], { shouldValidate: true });
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCause(false);
    }
  }

  async function handleGenerateImpact() {
    if (!title.trim() || !description.trim()) {
      toast.error("Isi judul dan deskripsi dulu untuk AI");
      return;
    }
    setGeneratingImpact(true);
    try {
      const res = await api.post<any>("/ai/impacts", { title, description }, token || undefined);
      if (res.impactDescription) {
        const lines = res.impactDescription.split("\n").filter((line: string) => line.trim());
        const items = lines.map((line: string, idx: number) => ({
          id: `impact-${Date.now()}-${idx}`,
          text: line.replace(/^\d+\.\s*/, "").trim(),
        })).filter((i: any) => i.text);

        setValue("impacts", items.length > 0 ? items : [{ id: "impact-1", text: res.impactDescription }], { shouldValidate: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingImpact(false);
    }
  }

  return (
    <div className="animate-fade-in pb-20">
      <div className="flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border/50 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Input Risiko</h1>
            <p className="text-sm text-muted-foreground">Identifikasi risiko unit kerja sesuai framework ISO 31000</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {riskId && (riskStatus === "final" || riskStatus === "approved" || riskStatus === "rejected") && (
            <Button variant="outline" className="gap-2 text-xs text-destructive hover:bg-destructive/10" onClick={handleRevertToDraft} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="size-3.5 border border-current rounded-full p-0.5" />} Kembalikan ke Draft
            </Button>
          )}

          {riskId && <Button variant="outline" className="gap-2 text-xs"><History className="size-3.5" /> Riwayat Versi</Button>}
          
          {(riskStatus === "draft" || !riskId) && (
            <>
              <Button variant="outline" className="gap-2 text-xs" onClick={() => { submitTarget.current = "draft"; clearErrors(); handleSubmit(onSubmit, onValidationError)(); }} disabled={isSubmitting}>
                {isSubmitting && submitTarget.current === "draft" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="size-3.5" />} Simpan Draft
              </Button>
              <Button className="gap-2 shadow-lg shadow-primary/20 text-xs" onClick={() => { submitTarget.current = "finalize"; clearErrors(); handleSubmit(onSubmit, onValidationError)(); }} disabled={isSubmitting}>
                {isSubmitting && submitTarget.current === "finalize" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="size-3.5" />} Finalisasi
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="form" className="w-full">
        {riskId && (
          <TabsList className="bg-muted/40 border border-border/50 mb-6">
            <TabsTrigger value="form" className="gap-2">
              <BookOpen className="size-3.5" /> Form Registrasi Risiko
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <Activity className="size-3.5" /> Progress Mitigasi
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-2">
              <MessageSquare className="size-3.5" /> Log & Komunikasi
            </TabsTrigger>
          </TabsList>
        )}
        
        <TabsContent value="form" className="m-0">
          <div className="flex flex-col xl:flex-row gap-6 items-start">
            <form onSubmit={(e) => e.preventDefault()} className="w-full xl:w-2/3 space-y-6">

          {/* SECTION 1 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">1. Identifikasi Risiko</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              
              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Risiko <span className="text-muted-foreground">*</span></Label>
                  <AiFieldButton loading={generatingRisk} disabled={false} onClick={handleGenerateRisk} label="" />
                </div>
                <Controller name="title" control={control} render={({ field }) => (
                  <Input {...field} placeholder="Contoh: Terjadi kebakaran di gudang bahan baku" className={cn("text-xs", errors.title && "border-destructive")} />
                )} />
                <FormErrorMessage error={errors.title?.message} />

                {showRiskSuggestions && riskSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-lg shadow-lg">
                    {/* popup AI title... */}
                    <div className="max-h-[300px] overflow-y-auto">
                      {riskSuggestions.map((suggestion, idx) => (
                        <button key={idx} type="button" onClick={() => { setValue("title", suggestion.title); setValue("description", suggestion.description); setShowRiskSuggestions(false); }} className="w-full p-3 text-left border-b border-border/50 hover:bg-muted/30">
                          <p className="text-xs font-medium text-foreground">{suggestion.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{suggestion.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Deskripsi Kejadian Risiko <span className="text-muted-foreground">*</span></Label>
                <Controller name="description" control={control} render={({ field }) => (
                  <Textarea {...field} placeholder="Contoh: Mesin A mati secara tiba-tiba..." className={cn("min-h-[100px] text-xs", errors.description && "border-destructive")} />
                )} />
                <FormErrorMessage error={errors.description?.message} />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Kode Risiko</Label>
                  <Controller name="riskCode" control={control} render={({ field }) => (
                    <Input {...field} placeholder="R-XXX (Auto)" disabled className="text-xs" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit Kerja</Label>
                  <Controller name="organizationId" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih Unit Kerja" /></SelectTrigger>
                      <SelectContent>
                        {organizations.map((u, idx) => <SelectItem key={`${u.id}-${idx}`} value={u.id} className="text-xs">{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Sebab <span className="text-muted-foreground">*</span></Label>
                  <AiFieldButton loading={generatingCause} disabled={false} onClick={handleGenerateCause} label="" />
                </div>
                <Controller name="causes" control={control} render={({ field }) => (
                  <EditableItemsTable items={field.value} onChange={field.onChange} placeholder="Tulis penyebab..." addItemLabel="Tambah Sebab" emptyMessage="Belum ada sebab" />
                )} />
                <FormErrorMessage error={errors.causes?.message} />
              </div>



              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sumber Risiko</Label>
                  <Controller name="riskSource" control={control} render={({ field }) => (
                    <Input {...field} placeholder="Internal, SDM..." className="text-xs" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Controllable / Uncontrollable</Label>
                  <Controller name="controllability" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="C" className="text-xs">Controllable</SelectItem>
                        <SelectItem value="UC" className="text-xs">Uncontrollable</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Dampak <span className="text-muted-foreground">*</span></Label>
                  <AiFieldButton loading={generatingImpact} disabled={false} onClick={handleGenerateImpact} label="" />
                </div>
                <Controller name="impacts" control={control} render={({ field }) => (
                  <EditableItemsTable items={field.value} onChange={field.onChange} placeholder="Tulis dampak..." addItemLabel="Tambah Dampak" />
                )} />
                <FormErrorMessage error={errors.impacts?.message} />
              </div>

            </CardContent>
          </Card>

          {/* SECTION 2 */}
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">2. Analisis Risiko</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs">Pengendalian yang Ada</Label>
                <Controller name="existingControl" control={control} render={({ field }) => (
                  <EditableList value={field.value || ""} onChange={field.onChange} placeholder="Tulis pengendalian..." />
                )} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Efektivitas Pengendalian</Label>
                  <Controller name="controlEffectiveness" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— Belum dinilai —" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efektif" className="text-xs">Efektif</SelectItem>
                        <SelectItem value="tidak_efektif" className="text-xs">Tidak Efektif</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bobot</Label>
                  <Controller name="weight" control={control} render={({ field }) => (
                    <Input type="number" step="0.1" value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value))} className="text-xs" />
                  )} />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">P — Probabilitas (1-5)</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button key={val} type="button" onClick={() => setValue("probability", val, {shouldValidate: true})}
                        className={cn("h-9 rounded-md text-xs font-semibold border",
                          val === probability ? `${levelToColor(getRiskLevel(val * impact))} font-bold ring-1` : "bg-muted/30"
                        )}>{val}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">D — Dampak (1-5)</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button key={val} type="button" onClick={() => setValue("impact", val, {shouldValidate: true})}
                        className={cn("h-9 rounded-md text-xs font-semibold border",
                          val === impact ? `${levelToColor(getRiskLevel(probability * val))} font-bold ring-1` : "bg-muted/30"
                        )}>{val}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={cn("rounded-lg p-4 flex items-center justify-between border", levelToColor(level))}>
                <div><p className="text-xs font-semibold">Hasil Asesmen</p></div>
                <div className="text-right"><p className="text-lg font-bold">{getRiskLevelLabel(level)}</p><p className="text-xs font-mono">Skor: {score}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3 */}
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">3. Evaluasi Risiko</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prioritas Risiko</Label>
                  <Controller name="riskPriority" control={control} render={({ field }) => (
                    <Input type="number" value={field.value} onChange={(e) => field.onChange(parseInt(e.target.value)||0)} className="text-xs" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Selera Risiko</Label>
                  <Controller name="riskAppetite" control={control} render={({ field }) => (
                     <Input {...field} className="text-xs" />
                  )} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pilihan Penanganan</Label>
                <Controller name="treatmentOption" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="— Belum ditentukan —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avoid" className="text-xs">Avoid</SelectItem>
                      <SelectItem value="mitigate" className="text-xs">Mitigate</SelectItem>
                      <SelectItem value="transfer" className="text-xs">Transfer</SelectItem>
                      <SelectItem value="accept" className="text-xs">Accept</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4 */}
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">4. Rencana Penanganan Risiko</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Controller name="mitigations" control={control} render={({ field }) => (
                <MitigationTable items={field.value} onChange={field.onChange} users={availableUsers} />
              )} />
              <FormErrorMessage error={errors.mitigations?.message} />
              
              <MitigationPicker 
                description={description} 
                cause={(causes || []).map((c: any) => c.text).join("\\n")} 
                impactDescription={(impacts || []).map((i: any) => i.text).join("\\n")}
                onSelect={(action) => setValue("mitigations", [...(mitigations || []), { action, owner: "", dueDate: "", frequency: "insidental" }])}
                existingActions={(mitigations || []).map((m: any) => m.action)}
              />
            </CardContent>
          </Card>

          {/* SECTION 5 */}
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">5. Target Penurunan</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target P (1-5)</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button key={val} type="button" onClick={() => setValue("targetProbability", val)}
                        className={cn("h-9 rounded-md text-xs font-semibold border",
                          val === targetProbability ? `${levelToColor(getRiskLevel(val * targetImpact))} font-bold ring-1` : "bg-muted/30"
                        )}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Target D (1-5)</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button key={val} type="button" onClick={() => setValue("targetImpact", val)}
                        className={cn("h-9 rounded-md text-xs font-semibold border",
                          val === targetImpact ? `${levelToColor(getRiskLevel(targetProbability * val))} font-bold ring-1` : "bg-muted/30"
                        )}>
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Bobot</Label>
                  <Controller name="targetWeight" control={control} render={({ field }) => (
                    <Input type="number" step="0.1" value={field.value} onChange={e => field.onChange(parseFloat(e.target.value))} className="text-xs" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Jadwal Review</Label>
                  <Controller name="nextReviewDate" control={control} render={({ field }) => (
                    <Input type="date" value={field.value || ""} onChange={field.onChange} className="text-xs" />
                  )} />
                </div>
              </div>
              <div className={cn("rounded-lg p-4 flex items-center justify-between border", levelToColor(targetLevel))}>
                <div><p className="text-xs font-semibold">Target Residual Risk</p></div>
                <div className="text-right"><p className="text-lg font-bold">{getRiskLevelLabel(targetLevel)}</p><p className="text-xs font-mono">Skor: {targetScore}</p></div>
              </div>
            </CardContent>
          </Card>
        </form>

        <div className="w-full xl:w-1/3 space-y-4 xl:sticky xl:top-24">
          <Card>
            <CardContent className="pt-5 pb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Kelengkapan Form</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {completenessItems.map((item) => (
                  <div key={item.label} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border", item.done ? "bg-success/10 text-success border-success/20" : "bg-muted/30 text-muted-foreground")}>
                    <div className={cn("w-2 h-2 rounded-full", item.done ? "bg-success" : "bg-muted-foreground/30")} />
                    {item.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        {riskId && (
          <>
            <TabsContent value="progress" className="m-0 space-y-6">
              <MitigationProgressTab riskId={riskId} token={token || ""} />
            </TabsContent>

            <TabsContent value="log" className="m-0 space-y-6">
              <Card className="border-border/50">
                <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/50">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <MessageSquare className="size-4" /> Log Komunikasi & Aktivitas
                  </CardTitle>
                  <Button size="sm" className="gap-2 text-xs h-8">
                    <Plus className="size-3.5" /> Tambah Log
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/60 rounded-lg bg-muted/10">
                    <MessageSquare className="size-8 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium">Belum Ada Catatan Komunikasi</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Gunakan tab ini untuk mencatat hasil rapat, email konsultasi, dan persetujuan terkait risiko ini (Sesuai Prinsip ISO 31000).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
