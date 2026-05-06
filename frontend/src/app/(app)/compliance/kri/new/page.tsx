"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles } from "lucide-react";

import { api } from "@/lib/api";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { useAuth } from "@/contexts/auth-context";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";
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
import { cn } from "@/lib/utils";

interface KRISuggestion {
  name: string;
  description: string;
  metric: string;
  thresholdMin: number;
  thresholdMax: number;
  direction: string;
  frequency: string;
}

interface RiskOption {
  id: string;
  code?: string;
  title: string;
  description?: string;
}

export default function NewKRIPage() {
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const router = useRouter();
  const { token, user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [risks, setRisks] = useState<RiskOption[]>([]);
  const [suggestions, setSuggestions] = useState<KRISuggestion[]>([]);

  const [riskId, setRiskId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("");
  const [thresholdMin, setThresholdMin] = useState(0);
  const [thresholdMax, setThresholdMax] = useState(100);
  const [currentValue, setCurrentValue] = useState(0);
  const [direction, setDirection] = useState("higher_worse");
  const [frequency, setFrequency] = useState("bulanan");

  useEffect(() => {
    if (!token) return;

    api
      .get<RiskOption[]>("/risks?status=approved", token)
      .then((res) => setRisks(res || []))
      .catch(console.error);
  }, [token]);

  const selectedRisk = risks.find((risk) => risk.id === riskId);

  async function handleAIGenerate() {
    if (aiFeaturesDisabled) return;
    if (!riskId || !selectedRisk) {
      toast.error("Pilih risiko terlebih dahulu sebelum meminta saran AI.");
      return;
    }

    setGenerating(true);
    setSuggestions([]);
    try {
      const result = await api.post<{ suggestions: KRISuggestion[] }>(
        "/ai/kris",
        {
          title: selectedRisk.title,
          description: selectedRisk.description || selectedRisk.title,
        },
        token || undefined,
      );

      const nextSuggestions = result?.suggestions || [];
      setSuggestions(nextSuggestions);

      if (nextSuggestions.length > 0) {
        toast.success(`${nextSuggestions.length} saran indikator siap direview.`);
      } else {
        toast.info("Belum ada saran AI yang cukup relevan. Anda bisa isi manual.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Saran AI belum berhasil dibuat. Coba lagi beberapa saat lagi.");
    } finally {
      setGenerating(false);
    }
  }

  function applySuggestion(suggestion: KRISuggestion) {
    setName(suggestion.name);
    setDescription(suggestion.description);
    setMetric(suggestion.metric);
    setThresholdMin(suggestion.thresholdMin);
    setThresholdMax(suggestion.thresholdMax);
    setDirection(suggestion.direction);
    setFrequency(suggestion.frequency);
    setSuggestions([]);
    toast.success("Saran indikator diterapkan. Anda masih bisa mengubah isinya.");
  }

  async function handleSave() {
    if (!riskId || !name) {
      toast.error("Pilih risiko dan isi nama indikator terlebih dahulu.");
      return;
    }

    setSaving(true);
    try {
      await api.post(
        "/kris",
        {
          riskId,
          name,
          description,
          metric,
          thresholdMin: Number(thresholdMin),
          thresholdMax: Number(thresholdMax),
          currentValue: Number(currentValue),
          direction,
          frequency,
          organizationId: user?.organizationId,
        },
        token || undefined,
      );
      router.push("/compliance/monitoring?tab=kri");
    } catch (err) {
      console.error(err);
      toast.error("Indikator KRI belum berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title="Tambah indikator KRI"
        description="Tambahkan indikator pemantauan untuk satu risiko, lalu tetapkan batas aman yang akan dipantau."
        badges={
          <Badge variant="outline" className="border-primary/15 bg-primary/[0.04] text-primary">
            Monitoring risiko
          </Badge>
        }
        backLabel="Kembali ke tab KRI"
        onBack={() => router.push("/compliance/monitoring?tab=kri")}
        actions={
          <>
            <Button
              variant="outline"
              className={cn("gap-2 text-xs", !riskId && "opacity-60")}
              onClick={handleAIGenerate}
              disabled={aiFeaturesDisabled || generating || !riskId}
            >
              {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {generating ? "Memproses..." : "Gunakan saran AI"}
            </Button>
            <Button className="gap-2 text-xs" onClick={handleSave} disabled={saving}>
              <Save className="size-3.5" />
              {saving ? "Menyimpan..." : "Simpan indikator"}
            </Button>
          </>
        }
      />

      <FormSection
        title="Risiko terkait"
        description="Pilih satu risiko sebagai induk indikator ini."
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Risiko<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Select
            value={riskId}
            onValueChange={(value) => {
              setRiskId(value);
              setSuggestions([]);
            }}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Pilih risiko" />
            </SelectTrigger>
            <SelectContent>
              {risks.map((risk) => (
                <SelectItem key={risk.id} value={risk.id} className="text-sm">
                  {risk.code} - {risk.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormSection>

      {suggestions.length > 0 ? (
        <FormSection
          title="Saran AI"
          description="Pilih saran yang paling mendekati kebutuhan Anda, lalu sesuaikan jika perlu."
          className="border-primary/20 bg-primary/[0.03]"
          contentClassName="space-y-3"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.name}-${index}`}
              type="button"
              onClick={() => applySuggestion(suggestion)}
              className="w-full rounded-2xl border border-border/20 bg-background px-4 py-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">{suggestion.name}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{suggestion.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{suggestion.metric || "Tanpa satuan ukur"}</span>
                    <span>
                      {suggestion.thresholdMin} sampai {suggestion.thresholdMax}
                    </span>
                    <span>
                      {suggestion.direction === "higher_worse"
                        ? "Semakin tinggi semakin buruk"
                        : "Semakin rendah semakin buruk"}
                    </span>
                    <span>{suggestion.frequency}</span>
                  </div>
                </div>
                <span className="text-xs font-medium text-primary">Terapkan</span>
              </div>
            </button>
          ))}
        </FormSection>
      ) : null}

      <FormSection
        title="Detail indikator"
        description="Tentukan apa yang diukur dan bagaimana indikator ini dibaca."
        className={cn(!riskId && "opacity-70")}
        contentClassName="space-y-5"
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Nama indikator<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Persentase keterlambatan pengiriman vaksin"
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Deskripsi</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan indikator ini dan apa yang dipantau."
            className="min-h-28 text-sm leading-6"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Satuan ukur</Label>
          <Input
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            placeholder="Contoh: %, hari, jumlah, rupiah"
            className="h-10 text-sm"
          />
        </div>
      </FormSection>

      <FormSection
        title="Batas dan pembaruan"
        description="Tentukan batas aman, nilai terkini, dan frekuensi pembaruan indikator."
        className={cn(!riskId && "opacity-70")}
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Batas bawah</Label>
            <Input
              type="number"
              value={thresholdMin}
              onChange={(e) => setThresholdMin(Number(e.target.value))}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Batas atas</Label>
            <Input
              type="number"
              value={thresholdMax}
              onChange={(e) => setThresholdMax(Number(e.target.value))}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nilai saat ini</Label>
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => setCurrentValue(Number(e.target.value))}
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/15 bg-muted/20 px-4 py-4">
          <p className="text-xs font-medium text-foreground">Preview status</p>
          <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-success via-risk-medium to-risk-extreme" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Aman</span>
            <span>Waspada</span>
            <span>Melewati batas</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Arah indikator</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="higher_worse" className="text-sm">
                  Semakin tinggi semakin buruk
                </SelectItem>
                <SelectItem value="lower_worse" className="text-sm">
                  Semakin rendah semakin buruk
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Frekuensi pembaruan</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="harian" className="text-sm">
                  Harian
                </SelectItem>
                <SelectItem value="mingguan" className="text-sm">
                  Mingguan
                </SelectItem>
                <SelectItem value="bulanan" className="text-sm">
                  Bulanan
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>
    </FormPage>
  );
}
