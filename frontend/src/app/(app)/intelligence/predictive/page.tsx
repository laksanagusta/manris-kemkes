"use client";
import { toast } from "sonner";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  BarChart3,
} from "@/components/ui/icons";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { useAuth } from "@/contexts/auth-context";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import {
  CollectionPageHeader,
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";


const levelColors: Record<string, string> = {
  Rendah: "text-risk-low",
  Sedang: "text-risk-medium",
  Tinggi: "text-risk-high",
  "Sangat Tinggi": "text-risk-extreme",
};

const levelBadgeVariant: Record<string, string> = {
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi": "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 80 ? "bg-success" : value >= 60 ? "bg-risk-medium" : "bg-risk-high"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground">{value}%</span>
    </div>
  );
}

export default function PredictivePage() {
  if (isAIFeaturesDisabled()) {
    return (
      <AIFeaturesDisabledState
        title="Predictive Scoring Dinonaktifkan"
        description="Prediksi tren risiko berbasis AI sedang dimatikan melalui environment frontend."
      />
    );
  }

  return <PredictivePageContent />;
}

function PredictivePageContent() {
  const { token, user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    // try to load existing predictions from simple local state / or we could have loaded it from the backend if we saved it
    // But since it's an AI tool page, maybe we just leave it empty until the user runs it.
  }, []);

  const handleRunPrediction = async () => {
    if (!token) return;
    setIsRunning(true);
    try {
      // 1. Fetch all risks (could limit to top 10 as AI endpoint does)
      const risks = await api.get<any[]>("/risks?status=final", token);
      const sortedRisks = [...risks].sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
      
      // 2. Call AI prediction
      const result = await api.post<any[]>("/ai/predictive-analyses", { risks: sortedRisks.slice(0, 10) }, token);
      
      if (Array.isArray(result)) {
        setPredictions(result);
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal menjalankan AI Prediction");
    } finally {
      setIsRunning(false);
    }
  };

  const upCount = predictions.filter((p) => p.trend === "up").length;
  const downCount = predictions.filter((p) => p.trend === "down").length;
  const stableCount = predictions.filter((p) => p.trend === "stable").length;

  return (
    <PageStack>
      <CollectionPageHeader
        title="AI Predictive Scoring"
        actions={
          <Button
            onClick={handleRunPrediction}
            className="gap-2"
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Predicting...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Run Prediction
              </>
            )}
          </Button>
        }
      />

      {/* Executive Summary */}
      <Card className="bg-card/80">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Ringkasan Eksekutif AI</h3>
              {predictions.length === 0 ? (
                <p className="text-xs text-secondary-foreground mt-1.5 leading-relaxed">
                  Belum ada data prediksi. Klik tombol &quot;Run Prediction&quot; untuk memulai analisis profil risiko.
                </p>
              ) : (
                <p className="text-xs text-secondary-foreground mt-1.5 leading-relaxed">
                  Dari {predictions.length} risiko yang dianalisis,{" "}
                  <span className="font-medium text-success">{downCount} diprediksi membaik</span>,{" "}
                  <span className="font-medium text-risk-extreme">{upCount} diprediksi memburuk</span>, dan{" "}
                  <span className="font-medium text-muted-foreground">{stableCount} stabil</span>.
                  Secara keseluruhan, algoritma AI telah mengkalkulasi tren untuk profil risiko utama Anda.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trend Summary */}
      <MetricGrid className="md:grid-cols-3 xl:grid-cols-3">
        <KpiCard
          label="Tren Naik"
          value={upCount}
          tone="white"
          icon={<TrendingUp className="size-5 text-risk-extreme" />}
        />
        <KpiCard
          label="Tren Turun"
          value={downCount}
          tone="white"
          icon={<TrendingDown className="size-5 text-success" />}
        />
        <KpiCard
          label="Stabil"
          value={stableCount}
          tone="white"
          icon={<Minus className="size-5 text-muted-foreground" />}
        />
      </MetricGrid>

      {/* Predictions Table */}
       <Card className="bg-card/80 overflow-hidden">
         <Table>
           <TableHeader>
             <TableRow className="border-border/50 hover:bg-transparent">
               <TableHead className="w-20 text-sm whitespace-nowrap">Kode</TableHead>
               <TableHead className="text-sm whitespace-nowrap">Risiko</TableHead>
               <TableHead className="text-sm w-24 whitespace-nowrap">Level Saat Ini</TableHead>
               <TableHead className="text-sm text-center w-12 whitespace-nowrap">→</TableHead>
               <TableHead className="text-sm w-24 whitespace-nowrap">Prediksi Level</TableHead>
               <TableHead className="text-sm w-16 whitespace-nowrap">Tren</TableHead>
               <TableHead className="text-sm w-28 whitespace-nowrap">Confidence</TableHead>
               <TableHead className="text-sm whitespace-nowrap">Reasoning</TableHead>
             </TableRow>
           </TableHeader>
          <TableBody>
            {predictions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24">
                  <div className="flex flex-col gap-1 text-left">
                    <p className="text-sm font-medium text-muted-foreground">Data prediksi kosong</p>
                    <p className="text-xs text-muted-foreground/70">Klik tombol "Run Prediction" untuk memulai analisis profil risiko</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : predictions.map((pred) => (
              <TableRow
                key={pred.riskCode}
                className="border-border/30 hover:bg-muted/30 transition-colors"
              >
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {pred.riskCode}
                </TableCell>
                <TableCell className="text-xs font-medium max-w-[200px]">
                  <span className="line-clamp-1 text-foreground">{pred.title}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold border h-5 px-1.5",
                      levelBadgeVariant[pred.currentLevel]
                    )}
                  >
                    {pred.currentLevel}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  →
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold border h-5 px-1.5",
                      levelBadgeVariant[pred.predictedLevel]
                    )}
                  >
                    {pred.predictedLevel}
                  </Badge>
                </TableCell>
                <TableCell>
                  {pred.trend === "up" && (
                    <ArrowUp className="size-4 text-risk-extreme" />
                  )}
                  {pred.trend === "down" && (
                    <ArrowDown className="size-4 text-success" />
                  )}
                  {pred.trend === "stable" && (
                    <Minus className="size-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell>
                  <ConfidenceBar value={pred.confidence} />
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground max-w-[250px]">
                  <span className="line-clamp-2">{pred.reasoning}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageStack>
  );
}
