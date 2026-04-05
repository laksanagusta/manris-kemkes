"use client";
import { toast } from "sonner";
import { KRIReportsList } from "./kri-reports-list";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { FormHeader } from "@/components/shared/form-shell";
import {
  ArrowLeft,
  Activity,
  ArrowDown,
  ArrowUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  TrendingUp,
} from "lucide-react";

interface KRIReport {
  id: string;
  value: number | null;
  status: string;
  periodLabel: string;
  notes: string;
  submittedByName?: string;
  submittedAt?: string;
}

export default function KRIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  
  const [kri, setKri] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReport, setPendingReport] = useState<KRIReport | null>(null);

  useEffect(() => {
    if (!token || !id) return;

    Promise.all([
      api.get<any>(`/kris/${id}`, token),
      api.get<KRIReport[]>(`/kris/${id}/reports`, token).catch(() => [] as KRIReport[]),
    ])
      .then(([kriData, reports]) => {
        setKri(kriData);
        const latest = (reports || []).find((r) => r.status === "submitted");
        setPendingReport(latest ?? null);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Memuat detail KRI...</p>
        </div>
      </div>
    );
  }

  if (!kri) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="size-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">KRI Tidak Ditemukan</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Indikator tidak ditemukan atau Anda tidak memiliki akses.</p>
          <Button onClick={() => router.push("/compliance/monitoring?tab=kri")} variant="outline">Kembali ke tab KRI</Button>
        </div>
      </div>
    );
  }

  function getKRIStatus(k: any): "safe" | "warning" | "breach" {
    if (k.direction === "higher_worse") {
      if (k.currentValue > k.thresholdMax) return "breach";
      if (k.currentValue > k.thresholdMax * 0.8) return "warning";
      return "safe";
    } else {
      if (k.currentValue < k.thresholdMin) return "breach";
      if (k.currentValue < k.thresholdMin * 1.1) return "warning";
      return "safe";
    }
  }

  const status = getKRIStatus(kri);
  
  const statusConfig = {
    safe: { label: "Aman", color: "text-success", icon: CheckCircle },
    warning: { label: "Peringkat", color: "text-risk-medium", icon: Clock },
    breach: { label: "Dilanggar", color: "text-risk-extreme", icon: AlertCircle },
  }[status];

  const StatusIcon = statusConfig.icon;

  function getProgressValue(k: any): number {
    const range = k.thresholdMax - k.thresholdMin;
    if (range === 0) return 100;
    const normalized = ((k.currentValue - k.thresholdMin) / range) * 100;
    return Math.max(0, Math.min(100, normalized));
  }

  const handleDelete = () => {
    toast.promise(
      (async () => {
        await api.delete(`/kris/${kri.id}`, undefined, token || undefined);
        router.push("/compliance/monitoring?tab=kri");
      })(),
      {
        loading: "Menghapus KRI...",
        success: "KRI berhasil dihapus.",
        error: "Gagal menghapus KRI.",
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      {/* Header */}
      <FormHeader
        title={kri.name}
        description={kri.description}
        badges={
          <>
            <Badge variant="outline" className="font-mono text-[10px]">{kri.id.substring(0,8)}</Badge>
            <Badge variant="outline" className={cn("gap-1 bg-transparent border-current", statusConfig.color)}>
              <StatusIcon className="size-3" />
              {statusConfig.label}
            </Badge>
          </>
        }
        backLabel="Kembali ke tab KRI"
        onBack={() => router.push("/compliance/monitoring?tab=kri")}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button variant="outline" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={handleDelete}>
              <Trash2 className="size-4" />
            </Button>
          </>
        }
      />

      {/* Pending report banner */}
      {pendingReport && pendingReport.value != null && (
        <div className="flex items-start gap-3 rounded-xl border border-risk-medium/30 bg-risk-medium/5 px-4 py-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-risk-medium" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              Laporan terbaru ({pendingReport.periodLabel}) menunggu persetujuan
            </p>
            <p className="text-xs text-muted-foreground">
              Nilai yang dilaporkan:{" "}
              <span className="font-semibold text-risk-medium">{pendingReport.value} {kri.metric}</span>
              {pendingReport.notes ? <span className="italic"> — "{pendingReport.notes}"</span> : null}
            </p>
            {pendingReport.submittedByName && (
              <p className="text-[10px] text-muted-foreground">
                Disubmit oleh {pendingReport.submittedByName}
                {pendingReport.submittedAt
                  ? ` pada ${new Date(pendingReport.submittedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                  : null}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Stats */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                    <TrendingUp className="size-4" /> Nilai Saat Ini
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("text-5xl font-bold tracking-tighter", statusConfig.color)}>
                      {kri.currentValue}
                    </span>
                    <span className="text-lg text-muted-foreground font-medium">{kri.metric}</span>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 min-w-[200px]">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">Ambang Batas (Threshold)</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Min Aman:</span>
                      <span className="font-mono font-medium">{kri.thresholdMin} {kri.metric}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Max Aman:</span>
                      <span className="font-mono font-medium">{kri.thresholdMax} {kri.metric}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>{kri.thresholdMin}</span>
                  <span>{kri.thresholdMax}</span>
                </div>
                <div className="h-4 w-full rounded-full bg-muted overflow-hidden relative border border-border/50">
                   <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-success via-risk-medium to-risk-extreme opacity-20" />
                   <div
                    className={cn(
                      "h-full rounded-full transition-all relative z-10 shadow-sm",
                      status === "safe" && "bg-success",
                      status === "warning" && "bg-risk-medium",
                      status === "breach" && "bg-risk-extreme"
                    )}
                    style={{ width: `${Math.min(getProgressValue(kri), 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Activity className="size-3" /> Diperbarui {kri.frequency}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    Arah: {kri.direction === "higher_worse" ? (
                      <><ArrowUp className="size-3 text-destructive" /> Semakin tinggi buruk</>
                    ) : (
                      <><ArrowDown className="size-3 text-destructive" /> Semakin rendah buruk</>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <KRIReportsList kriId={kri.id} metric={kri.metric} />
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/80">
             <CardHeader className="pb-3">
               <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Terkait dengan Risiko</CardTitle>
             </CardHeader>
             <CardContent>
               <Link href={`/risk/register/${kri.riskId}`}>
                 <div className="group p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                   <div className="flex items-center justify-between mb-2">
                     <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-background">
                       {kri.riskCode}
                     </Badge>
                     <ArrowLeft className="size-3.5 text-primary rotate-135 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                   </div>
                   <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                     {kri.riskTitle}
                   </p>
                 </div>
               </Link>
             </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Metadata KRI</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Unit Organisasi</p>
                <p className="text-sm font-medium">{kri.orgName || "Pusat"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dibuat Pada</p>
                <p className="text-sm font-medium">
                  {new Date(kri.createdAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric'})}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pembaruan Nilai Terakhir</p>
                <p className="text-sm font-medium">
                  {new Date(kri.lastUpdated).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
