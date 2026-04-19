"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  RefreshCw,
  Check,
  ChevronRight,
  ChevronLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  HelpCircle,
  Plus,
  X,
  BarChart3,
  Target,
  Percent,
  Info,
  ListFilter,
} from "lucide-react";
import type { Risk } from "@/types/risk";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";

// Types
interface CBAVariable {
  name: string;
  category: string;
  unit: string;
  multiplierType: string;
  value: number;
  description: string;
  source: string;
}

interface CBARecommendation {
  biayaMedis: CBAVariable[];
  biayaOperasional: CBAVariable[];
  biayaProduktivitas: CBAVariable[];
  biayaIntervensi: CBAVariable[];
}

interface SelectedVariable extends CBAVariable {
  selected: boolean;
  value: number;
  isManual?: boolean;
  isCostOfAction?: boolean;
}

interface CBAResult {
  costOfInaction: number;
  costOfAction: number;
  netBenefit: number;
  roi: number;
  benefitCostRatio: number;
  isPositive: boolean;
  breakdown: {
    inactionByCategory: Record<string, number>;
    actionByCategory: Record<string, number>;
  };
}

const STEPS = [
  { id: 1, title: "Deskripsi Risiko", icon: ShieldAlert },
  { id: 2, title: "Input Biaya", icon: DollarSign },
  { id: 3, title: "Dashboard", icon: BarChart3 },
];

const CATEGORY_LABELS: Record<string, string> = {
  biaya_medis: "Biaya Medis Langsung",
  biaya_operasional: "Biaya Operasional / Respons",
  biaya_produktivitas: "Biaya Produktivitas Sosial",
  biaya_intervensi: "Biaya Intervensi Program",
};

const CATEGORY_COLORS: Record<string, string> = {
  biaya_medis: "text-blue-400",
  biaya_operasional: "text-amber-400",
  biaya_produktivitas: "text-emerald-400",
  biaya_intervensi: "text-sky-400",
};

function getMultiplierLabel(type: string | undefined): string {
  switch (type) {
    case "per_case":
      return "Dikali Estimasi Kasus";
    case "per_population":
      return "Dikali Populasi Target";
    default:
      return "Biaya Tetap (Lump Sum)";
  }
}

function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)} Jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)} Rb`;
  }
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("id-ID");
}

export default function CBAPage() {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [riskDescription, setRiskDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Existing risks from DB
  const [existingRisks, setExistingRisks] = useState<Risk[]>([]);
  const [selectedRiskId, setSelectedRiskId] = useState<string>("");

  // Step 1 state
  const [variables, setVariables] = useState<SelectedVariable[]>([]);
  const [hasRecommended, setHasRecommended] = useState(false);

  // Step 2 state
  const [effectivity, setEffectivity] = useState(70);
  const [coverage, setCoverage] = useState(80);
  const [population, setPopulation] = useState(0);
  const [caseCount, setCaseCount] = useState(0);

  // Cost of Action variables (manual)
  const [actionVariables, setActionVariables] = useState<SelectedVariable[]>([]);

  // Step 3 state
  const [result, setResult] = useState<CBAResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Manual variable input
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("biaya_medis");
  const [manualMultiplier, setManualMultiplier] = useState("fixed");

  // Manual Cost of Action variable
  const [actionName, setActionName] = useState("");
  const [actionMultiplier, setActionMultiplier] = useState("fixed");

  // Fetch existing risks on mount
  useEffect(() => {
    async function fetchRisks() {
      try {
        const data = await api.get<Risk[]>("/risks", token || undefined);
        setExistingRisks(data || []);
      } catch {
        // silently fail — user can still type manually
      }
    }
    if (token) fetchRisks();
  }, [token]);

  const handleSelectExistingRisk = (riskId: string) => {
    setSelectedRiskId(riskId);
    if (riskId === "") return;
    const risk = existingRisks.find((r) => r.id === riskId);
    if (risk) {
      setRiskDescription(`${risk.title}. ${risk.description}`);
    }
  };

  const handleRecommend = async () => {
    if (!riskDescription.trim()) {
      toast.error("Masukkan deskripsi risiko terlebih dahulu");
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.post<CBARecommendation>(
        "/cba/recommend",
        { riskDescription },
        token || undefined
      );

      const allVars: SelectedVariable[] = [
        ...(data.biayaMedis || []).map((v) => ({ ...v, selected: true, value: v.value || 0 })),
        ...(data.biayaOperasional || []).map((v) => ({ ...v, selected: true, value: v.value || 0 })),
        ...(data.biayaProduktivitas || []).map((v) => ({ ...v, selected: true, value: v.value || 0 })),
      ];
      setVariables(allVars);

      // Auto-populate Cost of Action variables from AI
      const actionVars: SelectedVariable[] = [
        ...(data.biayaIntervensi || []).map((v) => ({
          ...v,
          selected: true,
          value: v.value || 0,
          isCostOfAction: true,
        })),
      ];
      setActionVariables(actionVars);

      setHasRecommended(true);
      toast.success(`${allVars.length + actionVars.length} variabel biaya berhasil direkomendasikan`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghasilkan rekomendasi variabel");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVariable = (index: number) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, selected: !v.selected } : v))
    );
  };

  const updateVariableValue = (index: number, value: number) => {
    setVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, value } : v))
    );
  };

  const updateActionVariableValue = (index: number, value: number) => {
    setActionVariables((prev) =>
      prev.map((v, i) => (i === index ? { ...v, value } : v))
    );
  };

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const removeActionVariable = (index: number) => {
    setActionVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualVariable = () => {
    if (!manualName.trim()) return;
    setVariables((prev) => [
      ...prev,
      {
        name: manualName,
        category: manualCategory,
        unit: "Rp",
        multiplierType: manualMultiplier,
        description: "Variabel ditambahkan manual oleh pengguna",
        source: "Input Manual Pengguna",
        selected: true,
        value: 0,
        isManual: true,
      },
    ]);
    setManualName("");
  };

  const addActionVariable = () => {
    if (!actionName.trim()) return;
    setActionVariables((prev) => [
      ...prev,
      {
        name: actionName,
        category: "biaya_intervensi",
        unit: "Rp",
        multiplierType: actionMultiplier,
        description: "Biaya intervensi program",
        source: "Input Manual Pengguna",
        selected: true,
        value: 0,
        isManual: true,
        isCostOfAction: true,
      },
    ]);
    setActionName("");
  };

  const selectedVariables = useMemo(
    () => variables.filter((v) => v.selected),
    [variables]
  );

  const groupedVariables = useMemo(() => {
    const groups: Record<string, SelectedVariable[]> = {
      biaya_medis: [],
      biaya_operasional: [],
      biaya_produktivitas: [],
    };
    for (const v of variables) {
      if (groups[v.category]) {
        groups[v.category].push(v);
      }
    }
    return groups;
  }, [variables]);

  const handleCalculate = async () => {
    const inactionVars = selectedVariables.map((v) => ({
      name: v.name,
      category: v.category,
      value: v.value,
      unit: v.unit,
      multiplierType: v.multiplierType || "fixed",
    }));

    const actionVars = actionVariables.map((v) => ({
      name: v.name,
      category: v.category,
      value: v.value,
      unit: v.unit,
      multiplierType: v.multiplierType || "fixed",
    }));

    if (inactionVars.length === 0) {
      toast.error("Pilih minimal satu variabel Cost of Inaction");
      return;
    }

    if (actionVars.length === 0) {
      toast.error("Tambahkan minimal satu variabel Cost of Action (biaya program)");
      return;
    }

    setIsCalculating(true);
    try {
      const data = await api.post<CBAResult>(
        "/cba/calculate",
        {
          riskDescription,
          population: population,
          caseCount: caseCount,
          programEffectivity: effectivity,
          populationCoverage: coverage,
          costOfInactionVars: inactionVars,
          costOfActionVars: actionVars,
        },
        token || undefined
      );
      setResult(data);
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghitung CBA");
    } finally {
      setIsCalculating(false);
    }
  };

  // Chart data for Step 3
  const chartData = useMemo(() => {
    if (!result) return [];
    return [
      {
        name: "Cost of Inaction\n(Kerugian)",
        value: result.costOfInaction,
        fill: "hsl(0, 72%, 51%)",
      },
      {
        name: "Cost of Action\n(Biaya Program)",
        value: result.costOfAction,
        fill: "hsl(217, 91%, 60%)",
      },
    ];
  }, [result]);

  const breakdownChartData = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.breakdown.inactionByCategory).map(
      ([cat, val]) => ({
        name: CATEGORY_LABELS[cat] || cat,
        value: val,
      })
    );
  }, [result]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="size-6 text-primary" />
          CBA Advokasi Ekonomi Kesehatan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analisis <em>Cost-Benefit</em> berbasis AI untuk advokasi anggaran pencegahan penyakit
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={cn(
                    "h-px w-8 sm:w-12",
                    isDone ? "bg-primary" : "bg-border"
                  )}
                />
              )}
              <button
                onClick={() => {
                  if (isDone) setStep(s.id);
                }}
                disabled={!isDone && !isActive}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                  isDone && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                  !isActive && !isDone && "bg-muted/30 text-muted-foreground cursor-not-allowed"
                )}
              >
                <StepIcon className="size-3.5" />
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Step 1: Risk Description + AI Recommender */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary" />
                Deskripsi Risiko Kesehatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing risk picker */}
              {existingRisks.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <ListFilter className="size-3" />
                    Pilih dari Risk Register
                  </Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-muted/20 px-3 text-sm"
                    value={selectedRiskId}
                    onChange={(e) => handleSelectExistingRisk(e.target.value)}
                  >
                    <option value="">— Atau ketik manual di bawah —</option>
                    {existingRisks.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.riskCode}] {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Textarea
                placeholder='Deskripsikan risiko kesehatan yang ingin dianalisis...&#10;&#10;Contoh:&#10;"Potensi KLB TB Resisten Obat di Kabupaten X dengan estimasi 500 kasus baru per tahun"&#10;"Risiko keracunan pangan MBG di 100 sekolah dasar dengan 15.000 siswa"'
                className="min-h-[140px] text-sm bg-muted/20 border-border/50 resize-none"
                value={riskDescription}
                onChange={(e) => {
                  setRiskDescription(e.target.value);
                  if (selectedRiskId) setSelectedRiskId("");
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground max-w-md">
                  AI akan merekomendasikan variabel biaya berdasarkan framework  
                  Evaluasi Ekonomi Kesehatan WHO (Perspektif Sosial)
                </p>
                <Button
                  onClick={handleRecommend}
                  disabled={isLoading || !riskDescription.trim()}
                  className="gap-2 shadow-lg shadow-primary/20"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate Variabel
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Variable recommendations */}
          {hasRecommended && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Variabel Biaya (Cost of Inaction)</h2>
                  <p className="text-xs text-muted-foreground">
                    Pilih variabel yang relevan. AI merekomendasikan {variables.length} variabel.
                    Terpilih: {selectedVariables.length}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  <Sparkles className="size-3 mr-1" />
                  AI Generated
                </Badge>
              </div>

              {Object.entries(groupedVariables).map(([category, vars]) => {
                if (vars.length === 0) return null;
                return (
                  <Card key={category} className="border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <CardTitle
                        className={cn(
                          "text-sm font-semibold flex items-center gap-2",
                          CATEGORY_COLORS[category]
                        )}
                      >
                        {CATEGORY_LABELS[category]}
                        <Badge variant="secondary" className="text-[9px] h-4">
                          {vars.filter((v) => v.selected).length}/{vars.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {vars.map((v) => {
                        const idx = variables.indexOf(v);
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-start gap-3 rounded-lg p-3 transition-all border",
                              v.selected
                                ? "bg-primary/5 border-primary/20"
                                : "bg-muted/10 border-border/30 opacity-60"
                            )}
                          >
                            <button
                              onClick={() => toggleVariable(idx)}
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-all",
                                v.selected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border bg-background"
                              )}
                            >
                              {v.selected && <Check className="size-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{v.name}</span>
                                {v.isManual && (
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                                    Manual
                                  </Badge>
                                )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="size-3.5 text-muted-foreground/50 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs font-medium mb-1">{v.description}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Sumber: {v.source}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {v.description}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                📎 {v.source} · Unit: {v.unit}
                              </p>
                            </div>
                            {v.isManual && (
                              <button
                                onClick={() => removeVariable(idx)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="size-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Add manual variable */}
              <Card className="border-dashed border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3">
                    Tambah Variabel Manual (Cost of Inaction)
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nama variabel biaya..."
                      className="text-sm h-9"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addManualVariable()}
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[140px]"
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                    >
                      <option value="biaya_medis">Biaya Medis</option>
                      <option value="biaya_operasional">Biaya Operasional</option>
                      <option value="biaya_produktivitas">Biaya Produktivitas</option>
                    </select>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-xs min-w-[120px]"
                      value={manualMultiplier}
                      onChange={(e) => setManualMultiplier(e.target.value)}
                    >
                      <option value="fixed">Biaya Tetap (Total)</option>
                      <option value="per_case">Dikali Jml Kasus</option>
                      <option value="per_population">Dikali Populasi</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1 shrink-0"
                      onClick={addManualVariable}
                      disabled={!manualName.trim()}
                    >
                      <Plus className="size-3.5" />
                      Tambah
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Next button */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={selectedVariables.length === 0}
                  className="gap-2 shadow-lg shadow-primary/20"
                >
                  Lanjut ke Input Biaya
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Dynamic Cost Input Form */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Sensitivity sliders */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Parameter Simulasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Population and Case Count (New) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    Populasi Target / Berisiko
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          Digunakan sebagai pengali otomatis untuk variabel yang bersatuan "tiap orang", "jiwa", dsb.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Contoh: 15000"
                    value={population || ""}
                    onChange={(e) => setPopulation(Number(e.target.value))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1.5">
                    Estimasi Jumlah Kasus
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          Digunakan sebagai pengali otomatis untuk variabel yang bersatuan "per kasus", "pasien", dsb.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Contoh: 500"
                    value={caseCount || ""}
                    onChange={(e) => setCaseCount(Number(e.target.value))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Percent className="size-3" />
                    Efektivitas Program
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Persentase keberhasilan program dalam mencegah kerugian
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="text-sm font-bold text-primary">{effectivity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={effectivity}
                  onChange={(e) => setEffectivity(Number(e.target.value))}
                  className="w-full accent-primary h-2 rounded-lg appearance-none cursor-pointer bg-muted/30"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Percent className="size-3" />
                    Cakupan Populasi
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3 text-muted-foreground/50" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Persentase populasi target yang tercakup program
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <span className="text-sm font-bold text-primary">{coverage}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={coverage}
                  onChange={(e) => setCoverage(Number(e.target.value))}
                  className="w-full accent-primary h-2 rounded-lg appearance-none cursor-pointer bg-muted/30"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost of Inaction variable values */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-red-400">
                <TrendingDown className="size-4" />
                Cost of Inaction — Kerugian Jika Tidak Bertindak
                <Badge variant="secondary" className="text-[9px] h-4">
                  {selectedVariables.length} variabel
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedVariables.map((v) => {
                  const idx = variables.indexOf(v);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-lg bg-muted/10 p-3 border border-border/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium truncate">{v.name}</span>
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-normal text-muted-foreground border-border/50 bg-muted/30">
                            {getMultiplierLabel(v.multiplierType)}
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="size-3 text-muted-foreground/50 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{v.description}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Sumber: {v.source}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{v.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground font-mono">{v.unit}</span>
                        <Input
                          type="number"
                          className="w-40 h-8 text-sm text-right"
                          placeholder="0"
                          value={v.value || ""}
                          onChange={(e) =>
                            updateVariableValue(idx, Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cost of Action variables */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-blue-400">
                <TrendingUp className="size-4" />
                Cost of Action — Biaya Program Intervensi
                <Badge variant="secondary" className="text-[9px] h-4">
                  {actionVariables.length} variabel
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionVariables.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-muted/10 p-3 border border-border/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium truncate">{v.name}</span>
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 font-normal text-muted-foreground border-border/50 bg-muted/30">
                        {getMultiplierLabel(v.multiplierType)}
                      </Badge>
                      {!v.isManual && (
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-sky-400/30 text-sky-400">
                          AI
                        </Badge>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="size-3 text-muted-foreground/50 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs">{v.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Sumber: {v.source}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{v.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">{v.unit}</span>
                    <Input
                      type="number"
                      className="w-40 h-8 text-sm text-right"
                      placeholder="0"
                      value={v.value || ""}
                      onChange={(e) =>
                        updateActionVariableValue(i, Number(e.target.value))
                      }
                    />
                    <button
                      onClick={() => removeActionVariable(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add action variable */}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Tambah biaya program (misal: Biaya Vaksinasi, Pelatihan Petugas)..."
                  className="text-sm h-9"
                  value={actionName}
                  onChange={(e) => setActionName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addActionVariable()}
                />
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs w-32 shrink-0"
                  value={actionMultiplier}
                  onChange={(e) => setActionMultiplier(e.target.value)}
                >
                  <option value="fixed">Biaya Tetap</option>
                  <option value="per_case">Dikali Kasus</option>
                  <option value="per_population">Dikali Populasi</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-1 shrink-0"
                  onClick={addActionVariable}
                  disabled={!actionName.trim()}
                >
                  <Plus className="size-3.5" />
                  Tambah
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                <Info className="size-3 inline mr-1" />
                Masukkan semua komponen biaya yang dibutuhkan untuk menjalankan program pencegahan
              </p>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ChevronLeft className="size-4" />
              Kembali
            </Button>
            <Button
              onClick={handleCalculate}
              disabled={isCalculating || actionVariables.length === 0}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Menghitung...
                </>
              ) : (
                <>
                  <Calculator className="size-4" />
                  Hitung CBA
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Dashboard */}
      {step === 3 && result && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Economic Benefit */}
            <Card
              className={cn(
                "border-l-4 transition-all",
                result.isPositive
                  ? "border-l-green-500 bg-green-500/5"
                  : "border-l-red-500 bg-red-500/5"
              )}
            >
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Net Economic Benefit
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold mt-1",
                    result.isPositive ? "text-green-400" : "text-red-400"
                  )}
                >
                  {formatRupiah(Math.abs(result.netBenefit))}
                </p>
                <Badge
                  className={cn(
                    "mt-2 text-[9px]",
                    result.isPositive
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  )}
                >
                  {result.isPositive ? (
                    <>
                      <TrendingUp className="size-3 mr-1" />
                      Layak Investasi
                    </>
                  ) : (
                    <>
                      <TrendingDown className="size-3 mr-1" />
                      Belum Layak
                    </>
                  )}
                </Badge>
              </CardContent>
            </Card>

            {/* ROI */}
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Return on Investment
                </p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {result.roi.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Setiap Rp 1 yang dikeluarkan menghasilkan Rp {result.benefitCostRatio.toFixed(2)} manfaat
                </p>
              </CardContent>
            </Card>

            {/* Cost of Inaction */}
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Cost of Inaction (Kerugian)
                </p>
                <p className="text-2xl font-bold mt-1 text-red-400">
                  {formatRupiah(result.costOfInaction)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Total kerugian jika tidak ada intervensi
                </p>
              </CardContent>
            </Card>

            {/* Cost of Action */}
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Cost of Action (Biaya Program)
                </p>
                <p className="text-2xl font-bold mt-1 text-blue-400">
                  {formatRupiah(result.costOfAction)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Total biaya program pencegahan
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Comparative Bar Chart */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                Perbandingan Biaya: Kerugian vs Anggaran Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={80}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      tickFormatter={(v) => formatRupiah(v)}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <RechartsTooltip
                      formatter={(value) => [
                        `Rp ${formatNumber(Number(value))}`,
                        "",
                      ]}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sensitivity playback */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Simulasi Sensitivitas (Real-time)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="size-3.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Geser slider untuk melihat dampak perubahan parameter terhadap hasil CBA
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Efektivitas Program</Label>
                    <span className="text-sm font-bold text-primary">{effectivity}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={effectivity}
                    onChange={(e) => setEffectivity(Number(e.target.value))}
                    className="w-full accent-primary h-2 rounded-lg appearance-none cursor-pointer bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Cakupan Populasi</Label>
                    <span className="text-sm font-bold text-primary">{coverage}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={coverage}
                    onChange={(e) => setCoverage(Number(e.target.value))}
                    className="w-full accent-primary h-2 rounded-lg appearance-none cursor-pointer bg-muted/30"
                  />
                </div>
              </div>

              <Separator />

              {/* Real-time recalculated values */}
              <SensitivityResult
                costOfInaction={result.costOfInaction}
                costOfAction={result.costOfAction}
                effectivity={effectivity}
                coverage={coverage}
              />

              <div className="flex justify-center">
                <Button
                  onClick={handleCalculate}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="size-3.5" />
                  Hitung Ulang dengan Parameter Baru
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown table */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">
                Rincian Biaya per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-red-400 mb-2">Cost of Inaction</h4>
                  {Object.entries(result.breakdown.inactionByCategory).map(([cat, val]) => (
                    <div
                      key={cat}
                      className="flex justify-between items-center py-2 border-b border-border/20 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span className="text-sm font-semibold">
                        {formatRupiah(val)}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-blue-400 mb-2">Cost of Action</h4>
                  {Object.entries(result.breakdown.actionByCategory).map(([cat, val]) => (
                    <div
                      key={cat}
                      className="flex justify-between items-center py-2 border-b border-border/20 last:border-0"
                    >
                      <span className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span className="text-sm font-semibold">
                        {formatRupiah(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ChevronLeft className="size-4" />
              Edit Input
            </Button>
            <Button variant="outline" onClick={() => { setStep(1); setHasRecommended(false); setVariables([]); setActionVariables([]); setResult(null); }} className="gap-2">
              Analisis Baru
              <RefreshCw className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sensitivity sub-component for real-time recalculation
function SensitivityResult({
  costOfInaction,
  costOfAction,
  effectivity,
  coverage,
}: {
  costOfInaction: number;
  costOfAction: number;
  effectivity: number;
  coverage: number;
}) {
  const eff = effectivity / 100;
  const cov = coverage / 100;
  const avertedLoss = costOfInaction * eff * cov;
  const netBenefit = avertedLoss - costOfAction;
  const roi = costOfAction > 0 ? (netBenefit / costOfAction) * 100 : 0;
  const bcr = costOfAction > 0 ? avertedLoss / costOfAction : 0;
  const isPositive = netBenefit > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="rounded-lg bg-muted/20 p-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase">Kerugian Tercegah</p>
        <p className="text-lg font-bold text-amber-400 mt-1">{formatRupiah(avertedLoss)}</p>
      </div>
      <div className="rounded-lg bg-muted/20 p-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase">Net Benefit</p>
        <p
          className={cn(
            "text-lg font-bold mt-1",
            isPositive ? "text-green-400" : "text-red-400"
          )}
        >
          {isPositive ? "+" : "-"}
          {formatRupiah(Math.abs(netBenefit))}
        </p>
      </div>
      <div className="rounded-lg bg-muted/20 p-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase">ROI</p>
        <p className="text-lg font-bold text-primary mt-1">{roi.toFixed(1)}%</p>
      </div>
      <div className="rounded-lg bg-muted/20 p-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase">Benefit-Cost Ratio</p>
        <p className="text-lg font-bold text-primary mt-1">{bcr.toFixed(2)}x</p>
      </div>
    </div>
  );
}
