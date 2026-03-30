"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Plus,
  Search,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Tag,
  Calendar,
  Link2,
  ChevronRight,
} from "lucide-react";

export default function LessonsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    api.get<any[]>("/lessons", token)
      .then(data => {
        setLessons(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch lessons:", err);
        setLoading(false);
      });
  }, [token]);
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lessons Learned</h1>
          <p className="text-sm text-muted-foreground">
            Repository pembelajaran berharga dari risiko dan insiden
          </p>
        </div>
        <Link href="/incidents/lessons/new">
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="size-4" />
            Tambah Lesson
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari pembelajaran..."
          className="h-9 pl-9 text-sm bg-card border-border/50"
        />
      </div>

      {/* Lessons Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
             <div className="md:col-span-2 py-10 text-center text-sm text-muted-foreground">Memuat data lessons learned...</div>
          ) : lessons.length === 0 ? (
             <div className="md:col-span-2 py-10 text-center text-sm text-muted-foreground">Tidak ada lessons learned yang ditemukan.</div>
          ) : lessons.map((lesson) => (
          <Card
            key={lesson.id}
            onClick={() => router.push(`/incidents/lessons/${lesson.id}`)}
            className="border-border/50 bg-card/80 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {lesson.id.substring(0,8)}
                    </span>
                    <Badge
                      className={cn(
                        "text-[9px] font-semibold border h-4 px-1.5",
                        lesson.sourceType === "risiko" ? "bg-primary/10 text-primary border-primary/20" : "bg-risk-high/10 text-risk-high border-risk-high/20"
                      )}
                    >
                      {lesson.sourceType.charAt(0).toUpperCase() + lesson.sourceType.slice(1)}
                    </Badge>
                    <span className="text-[10px] font-mono text-primary">
                      <Link2 className="size-2.5 inline mr-0.5" />
                      {lesson.sourceRef}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                    {lesson.title}
                  </CardTitle>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                {lesson.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Success / Failure / Recommendation */}
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <ThumbsUp className="size-3.5 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-success">Faktor Keberhasilan</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {lesson.successFactors}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ThumbsDown className="size-3.5 text-risk-extreme shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-risk-extreme">Faktor Kegagalan</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {lesson.failureFactors}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Lightbulb className="size-3.5 text-risk-medium shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-risk-medium">Rekomendasi</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {lesson.recommendations}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex flex-wrap gap-1">
                  {lesson.tags?.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[9px] h-4 px-1.5 text-muted-foreground"
                    >
                      <Tag className="size-2 mr-0.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Calendar className="size-2.5" />
                  {new Date(lesson.createdAt).toLocaleDateString("id-ID", { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
