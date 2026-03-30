"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Link2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;

    api.get<any>(`/incidents/${id}`, token)
      .then(data => {
        setIncident(data);
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
          <p className="text-sm text-muted-foreground">Memuat detail insiden...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="size-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">Insiden Tidak Ditemukan</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Insiden yang Anda cari tidak ada atau Anda tidak memiliki akses.</p>
          <Button onClick={() => router.push("/incident")} variant="outline">Kembali ke Register Insiden</Button>
        </div>
      </div>
    );
  }

  const date = new Date(incident.when || incident.createdAt).toLocaleDateString("id-ID", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical": return <Badge className="bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20">Kritis</Badge>;
      case "major": return <Badge className="bg-risk-high/15 text-risk-high border-risk-high/20">Major</Badge>;
      case "minor": return <Badge className="bg-risk-medium/15 text-risk-medium border-risk-medium/20">Minor</Badge>;
      default: return <Badge className="bg-risk-low/15 text-risk-low border-risk-low/20">Insignificant</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return <Badge className="bg-risk-high/15 text-risk-high border-risk-high/20">Open</Badge>;
      case "investigating": return <Badge className="bg-risk-medium/15 text-risk-medium border-risk-medium/20">Investigating</Badge>;
      case "resolved": return <Badge className="bg-success/15 text-success border-success/20">Resolved</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground border-border">Closed</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={() => router.push('/incident')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{incident.code}</span>
              {getSeverityBadge(incident.severity)}
              {getStatusBadge(incident.status)}
            </div>
            <h1 className="text-xl font-bold tracking-tight line-clamp-1">{incident.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="gap-2 text-xs">Ubah Status</Button>
           <Button variant="outline" className="gap-2 text-xs">Edit Detail</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Detail Kejadian */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Detail Kejadian (5W)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">What (Uraian Kejadian)</p>
                  <p className="text-sm">{incident.what}</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><User className="size-3"/> Who (Pihak Terlibat)</p>
                    <p className="text-sm">{incident.who || "—"}</p>
                 </div>
                 <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="size-3"/> Where (Lokasi)</p>
                    <p className="text-sm">{incident.where || "—"}</p>
                 </div>
               </div>
               <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="size-3"/> When (Waktu)</p>
                  <p className="text-sm">{date}</p>
               </div>
            </CardContent>
          </Card>

           {/* Why & How */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Analisis Akar Masalah (1H & Why)</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="bg-muted/30 p-4 rounded-lg border border-border/50 whitespace-pre-wrap text-sm">
                  {incident.whyHow || <span className="text-muted-foreground italic">Belum ada analisis akar masalah yang dicatat.</span>}
               </div>
            </CardContent>
          </Card>

          {/* CAPA */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Tindak Lanjut (CAPA)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <p className="text-xs font-semibold text-success mb-1 flex items-center gap-1"><CheckCircle2 className="size-3"/> Corrective Action (Perbaikan Langsung)</p>
                  <div className="bg-success/5 p-3 rounded-md border border-success/20 text-sm">
                     {incident.correctiveAction || <span className="text-muted-foreground italic">—</span>}
                  </div>
               </div>
               <div>
                  <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1"><CheckCircle2 className="size-3"/> Preventive Action (Tindakan Pencegahan)</p>
                  <div className="bg-primary/5 p-3 rounded-md border border-primary/20 text-sm">
                     {incident.preventiveAction || <span className="text-muted-foreground italic">—</span>}
                  </div>
               </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <Card className="border-border/50 bg-card/80">
             <CardHeader className="pb-3">
               <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Informasi Report</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div>
                   <p className="text-xs text-muted-foreground mb-1">Dilaporkan Oleh</p>
                   <div className="flex items-center gap-2">
                      <div className="size-6 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xs">
                         {incident.reporterName ? incident.reporterName.charAt(0) : "S"}
                      </div>
                      <span className="text-sm font-medium">{incident.reporterName || "System"}</span>
                   </div>
                </div>
                <Separator />
                <div>
                   <p className="text-xs text-muted-foreground mb-1">Waktu Pelaporan</p>
                   <p className="text-sm flex items-center gap-1.5">
                     <Clock className="size-3 text-muted-foreground"/> 
                     {new Date(incident.createdAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                  </p>
                </div>
                {incident.updatedAt !== incident.createdAt && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Terakhir Diupdate</p>
                    <p className="text-sm flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground"/> 
                      {new Date(incident.updatedAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                    </p>
                  </div>
                )}
             </CardContent>
           </Card>

           <Card className="border-border/50 bg-card/80">
             <CardHeader className="pb-3">
               <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tautan Risiko</CardTitle>
             </CardHeader>
             <CardContent>
               {incident.linkedRiskId ? (
                  <Link href={`/risk/register/${incident.linkedRiskId}`}>
                     <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group">
                        <div className="size-8 bg-primary/20 text-primary rounded-md flex items-center justify-center shrink-0">
                           <Link2 className="size-4" />
                        </div>
                        <div>
                           <p className="text-xs font-mono font-medium text-primary group-hover:underline">{incident.linkedRiskCode}</p>
                           <p className="text-[10px] text-muted-foreground mt-0.5">Lihat detail risiko</p>
                        </div>
                     </div>
                  </Link>
               ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/50 bg-muted/30">
                     <div className="size-8 bg-muted text-muted-foreground rounded-md flex items-center justify-center shrink-0">
                        <XCircle className="size-4" />
                     </div>
                     <div>
                        <p className="text-xs font-medium text-muted-foreground">Tidak Ditautkan</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Insiden ini standalone</p>
                     </div>
                  </div>
               )}
             </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}
