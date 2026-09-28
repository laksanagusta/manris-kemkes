"use client";
import { toast } from "sonner";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
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
} from "@/components/shared/icons";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { useAuth } from "@/contexts/auth-context";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import {
  CollectionPageHeader,
  CollectionEmptyState,
  IllustratedEmptyState,
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";


const levelBadgeVariant: Record<string, BadgeVariant> = {
  Rendah: "secondary",
  Sedang: "outline",
  Tinggi: "destructive",
  "Sangat Tinggi": "destructive",
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
            size="default"
            onClick={handleRunPrediction}
            className=""
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
      <Card className="">
        <CardContent className="">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Ringkasan Eksekutif AI</h3>
              {predictions.length === 0 ? (
                <IllustratedEmptyState
                  title="Belum ada data prediksi"
                  description='Klik tombol "Run Prediction" untuk memulai analisis profil risiko.'
                  size="compact"
                  align="left"
                  className="mt-2"
                />
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
       <Card className="overflow-hidden">
         <Table>
           <TableHeader>
             <TableRow className="hover:bg-transparent">
               <TableHead className="w-20 whitespace-nowrap">Kode</TableHead>
               <TableHead className="px-24 whitespace-nowrap">Risiko</TableHead>
               <TableHead className="w-24 whitespace-nowrap">Level Saat Ini</TableHead>
               <TableHead className="text-center w-12 whitespace-nowrap">→</TableHead>
               <TableHead className="w-24 whitespace-nowrap">Prediksi Level</TableHead>
               <TableHead className="w-16 whitespace-nowrap">Tren</TableHead>
               <TableHead className="w-28 whitespace-nowrap">Confidence</TableHead>
               <TableHead className="whitespace-nowrap">Reasoning</TableHead>
             </TableRow>
           </TableHeader>
          <TableBody>
            {predictions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24">
                  <CollectionEmptyState
                    title="Data prediksi kosong"
                    description='Klik tombol "Run Prediction" untuk memulai analisis profil risiko.'
                  />
                </TableCell>
              </TableRow>
            ) : predictions.map((pred) => (
              <TableRow
                key={pred.riskCode}
                className="hover:bg-muted/30 transition-colors"
              >
                <TableCell className="">
                  {pred.riskCode}
                </TableCell>
                <TableCell className="max-w-[200px] px-24">
                  <span className="line-clamp-1 text-foreground">{pred.title}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={levelBadgeVariant[pred.currentLevel] ?? "secondary"}
                  >
                    {pred.currentLevel}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  →
                </TableCell>
                <TableCell>
                  <Badge
                    variant={levelBadgeVariant[pred.predictedLevel] ?? "secondary"}
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
                <TableCell className="max-w-[250px]">
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
