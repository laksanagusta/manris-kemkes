"use client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowLeft,
  Activity,
  Save,
  Sparkles,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
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

export default function NewKRIPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [risks, setRisks] = useState<any[]>([]);
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
    api.get<any[]>("/risks", token)
      .then(res => setRisks(res || []))
      .catch(console.error);
  }, [token]);

  // Get selected risk data
  const selectedRisk = risks.find(r => r.id === riskId);

  async function handleAIGenerate() {
    if (!riskId || !selectedRisk) {
      toast.error("Pilih risiko terlebih dahulu sebelum menggunakan AI Generate");
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
        token || undefined
      );

      const sug = result?.suggestions || [];
      setSuggestions(sug);

      if (sug.length > 0) {
        toast.success(`AI menghasilkan ${sug.length} saran KRI. Pilih salah satu di bawah.`);
      } else {
        toast.info("AI tidak menghasilkan saran KRI. Silakan isi manual.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghasilkan KRI dari AI. Silakan coba lagi.");
    } finally {
      setGenerating(false);
    }
  }

  function applySuggestion(sug: KRISuggestion) {
    setName(sug.name);
    setDescription(sug.description);
    setMetric(sug.metric);
    setThresholdMin(sug.thresholdMin);
    setThresholdMax(sug.thresholdMax);
    setDirection(sug.direction);
    setFrequency(sug.frequency);
    setSuggestions([]); // Clear suggestions after selection
    toast.success("Saran KRI diterapkan! Anda bisa mengedit sebelum menyimpan.");
  }

  async function handleSave() {
    if (!riskId || !name) {
      toast("Pilih risiko dan nama KRI wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload = {
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
      };

      await api.post<any>("/kris", payload, token || undefined);
      router.push("/compliance/kri");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menambahkan KRI");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tambah KRI</h1>
            <p className="text-sm text-muted-foreground">Pasang indikator risiko kunci baru pada risiko</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={cn(
              "gap-2 text-xs transition-all",
              !riskId && "opacity-50 cursor-not-allowed"
            )}
            onClick={handleAIGenerate}
            disabled={generating || !riskId}
            title={!riskId ? "Pilih risiko terlebih dahulu" : "Generate KRI menggunakan AI"}
          >
            {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {generating ? "Memproses..." : "AI Generate KRI"}
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5" /> {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {/* Step 1: Link to Risk */}
      <Card className={cn(
        "border-border/50 bg-card/80 transition-all",
        !riskId && "ring-2 ring-primary/30"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center size-5 rounded-full text-[10px] font-bold",
              riskId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {riskId ? <CheckCircle className="size-3" /> : "1"}
            </div>
            <Activity className="size-4 text-primary" /> Risiko Terkait
            {!riskId && <span className="text-[10px] text-primary ml-auto animate-pulse">← Pilih risiko dulu</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-xs">Pilih Risiko <span className="text-destructive">*</span></Label>
            <Select value={riskId} onValueChange={(val) => {
              setRiskId(val);
              // Clear suggestions when risk changes
              setSuggestions([]);
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih risiko untuk KRI ini..." /></SelectTrigger>
              <SelectContent>
                {risks.map(r => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">{r.code} — {r.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Saran KRI dari AI
              <span className="text-[10px] text-muted-foreground ml-auto">Klik untuk menerapkan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => applySuggestion(sug)}
                className="w-full text-left p-3 rounded-lg border border-border/50 bg-background/80
                  hover:border-primary/50 hover:bg-primary/5 hover:shadow-md
                  transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold group-hover:text-primary transition-colors">
                      {sug.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                      {sug.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded">
                        {sug.metric}
                      </span>
                      <span>
                        {sug.thresholdMin} — {sug.thresholdMax}
                      </span>
                      <span>
                        {sug.direction === "higher_worse" ? "↑ = buruk" : "↓ = buruk"}
                      </span>
                      <span>
                        {sug.frequency}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    Terapkan →
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: KRI Details */}
      <Card className={cn(
        "border-border/50 bg-card/80 transition-all",
        !riskId && "opacity-60 pointer-events-none"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center size-5 rounded-full text-[10px] font-bold",
              name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {name ? <CheckCircle className="size-3" /> : "2"}
            </div>
            Detail Indikator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nama KRI <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Persentase keterlambatan pengiriman vaksin" className="text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Penjelasan indikator dan apa yang diukur..." className="min-h-[60px] text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Satuan Ukur (Metric)</Label>
            <Input value={metric} onChange={e => setMetric(e.target.value)} placeholder="Contoh: %, jumlah, hari, Rp" className="text-xs" />
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Threshold & Current Value */}
      <Card className={cn(
        "border-border/50 bg-card/80 transition-all",
        !riskId && "opacity-60 pointer-events-none"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="flex items-center justify-center size-5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
              3
            </div>
            Threshold & Nilai
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Batas Bawah (Min Aman)</Label>
              <Input type="number" value={thresholdMin} onChange={e => setThresholdMin(Number(e.target.value))} placeholder="0" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Batas Atas (Max Aman)</Label>
              <Input type="number" value={thresholdMax} onChange={e => setThresholdMax(Number(e.target.value))} placeholder="100" className="text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nilai Saat Ini</Label>
              <Input type="number" value={currentValue} onChange={e => setCurrentValue(Number(e.target.value))} placeholder="Masukkan nilai..." className="text-xs" />
            </div>
          </div>

          {/* Visual indicator preview */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">Preview Status</p>
            <div className="relative h-3 bg-gradient-to-r from-success via-risk-medium to-risk-extreme rounded-full overflow-hidden">
              <div className="absolute top-0 left-[35%] w-0.5 h-full bg-white/80" />
              <div className="absolute top-0 left-[70%] w-0.5 h-full bg-white/80" />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-success font-medium">Aman</span>
              <span className="text-[9px] text-risk-medium font-medium">Warning</span>
              <span className="text-[9px] text-risk-extreme font-medium">Breach</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Arah Indikator</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher_worse" className="text-xs">↑ Semakin tinggi semakin buruk</SelectItem>
                  <SelectItem value="lower_worse" className="text-xs">↓ Semakin rendah semakin buruk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frekuensi Update</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="harian" className="text-xs">Harian</SelectItem>
                  <SelectItem value="mingguan" className="text-xs">Mingguan</SelectItem>
                  <SelectItem value="bulanan" className="text-xs">Bulanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
