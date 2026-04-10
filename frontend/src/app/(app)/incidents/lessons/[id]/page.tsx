"use client";
import { toast } from "sonner";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Tag,
  Calendar,
  Link2,
  Trash2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;

    api.get<any>(`/lessons/${id}`, token)
      .then(data => {
        setLesson(data);
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
          <p className="text-sm text-muted-foreground">Memuat detail lessons learned...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="size-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">Lessons Learned Tidak Ditemukan</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Mungkin sudah dihapus atau Anda tidak memiliki akses.</p>
          <Button onClick={() => router.push("/lessons")} variant="outline">Kembali ke Register</Button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    toast.promise(
      (async () => {
        await api.delete(`/lessons/${lesson.id}`, undefined, token || undefined);
        router.push("/lessons");
      })(),
      {
        loading: "Menghapus...",
        success: "Data berhasil dihapus.",
        error: "Gagal menghapus lesson.",
      }
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 mt-1" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono text-[10px]">{lesson.id.substring(0,8)}</Badge>
              <Badge
                className={cn(
                  "font-semibold border text-[10px]",
                  lesson.sourceType === "risiko" ? "bg-primary/10 text-primary border-primary/20" : "bg-risk-high/10 text-risk-high border-risk-high/20"
                )}
              >
                {lesson.sourceType.charAt(0).toUpperCase() + lesson.sourceType.slice(1)}
              </Badge>
              {isReadOnlyForOrg(user, lesson.organizationId) && (
                <Badge variant="secondary" className="text-[10px]">RO</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">{lesson.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isReadOnlyForOrg(user, lesson.organizationId) && (
            <Button variant="outline" size="icon" className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" onClick={handleDelete}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Faktor Keberhasilan</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 mt-1">
                  <ThumbsUp className="size-4 text-success" />
                </div>
                <div>
                  <p className="text-sm leading-relaxed">{lesson.successFactors || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Faktor Kegagalan</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-risk-extreme/10 mt-1">
                  <ThumbsDown className="size-4 text-risk-extreme" />
                </div>
                <div>
                  <p className="text-sm leading-relaxed">{lesson.failureFactors || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3 border-b border-border/50 shadow-sm">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rekomendasi / Saran</CardTitle>
            </CardHeader>
            <CardContent className="bg-muted/10 pt-4 rounded-b-xl">
              <div className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-risk-medium/10 mt-1">
                  <Lightbulb className="size-4 text-risk-medium" />
                </div>
                <div>
                  <p className="text-sm leading-relaxed font-medium">{lesson.recommendations || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/80 overflow-hidden">
             <div className="bg-muted/50 px-4 py-3 border-b border-border/50">
               <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sumber Referensi</h3>
             </div>
             <CardContent className="p-4">
                 <div className="group p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={() => {
                   if (lesson.sourceType === "risiko") {
                      // Needs mapping to find actual UUID
                      router.push("/risk"); 
                   } else {
                     router.push("/incident");
                   }
                 }}>
                   <div className="flex items-center justify-between">
                     <span className="text-sm font-mono text-primary flex items-center gap-1.5 font-medium">
                       <Link2 className="size-3.5" />
                       {lesson.sourceRef || "-"}
                     </span>
                     <ArrowLeft className="size-3.5 text-primary rotate-135 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                   </div>
                 </div>
             </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dibuat Oleh</p>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {lesson.authorName?.[0] || "?"}
                  </div>
                  <p className="text-sm font-medium">{lesson.authorName}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                 <p className="text-xs text-muted-foreground">Unit Organisasi:</p>
                 <p className="font-medium">-</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                 <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="size-3"/> Tanggal Catat:</p>
                 <p className="font-medium">
                   {new Date(lesson.createdAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric'})}
                 </p>
              </div>
              
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">Tags / Label:</p>
                <div className="flex flex-wrap gap-1">
                  {lesson.tags?.length > 0 ? lesson.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[9px] h-4 px-1.5 text-muted-foreground bg-muted/30"
                    >
                      <Tag className="size-2 mr-0.5" />
                      {tag}
                    </Badge>
                  )) : <span className="text-xs text-muted-foreground">-</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
