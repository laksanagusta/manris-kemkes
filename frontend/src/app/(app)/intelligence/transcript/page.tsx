"use client";
import { toast } from "sonner";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  FileText,
  Sparkles,
  Plus,
  RefreshCw,
  Check,
  X,
  ArrowRight,
  FileEdit,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
} from "lucide-react";

interface Suggestion {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  title: string;
  description: string;
  quote: string;
  reasoning: string;
  prefilled: {
    riskCode: string;
    source: string;
    probability: number;
    impact: number;
    mitigation: string;
  };
}


const actionConfig = {
  CREATE: {
    label: "Buat Baru",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    icon: Plus,
  },
  UPDATE: {
    label: "Update",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    icon: FileEdit,
  },
  DELETE: {
    label: "Hapus",
    color: "text-risk-extreme",
    bg: "bg-risk-extreme/10",
    border: "border-risk-extreme/20",
    icon: Trash2,
  },
};

export default function TranscriptPage() {
  const { token } = useAuth();
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    try {
      const data = await api.post<Suggestion[]>("/ai/transcripts", { transcript }, token || undefined);
      setSuggestions(data);
      setShowResults(true);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menganalisis transkrip");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          AI Transcript Analyzer
        </h1>
        <p className="text-sm text-muted-foreground">
          Ekstraksi draf risiko otomatis dari transkrip/notulensi rapat
        </p>
      </div>

      {/* Input Area */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardPaste className="size-4" />
            Paste Transkrip Rapat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste transkrip atau notulensi rapat di sini...&#10;&#10;Contoh:&#10;Rapat Koordinasi Pengendalian Penyakit, 10 Maret 2026&#10;Peserta: Dr. Andi, Ir. Budi, Dr. Citra, Ns. Eka...&#10;&#10;Dr. Andi menyampaikan bahwa distribusi vaksin ke wilayah terpencil..."
            className="min-h-[180px] text-sm bg-muted/20 border-border/50 resize-none"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              AI akan mengidentifikasi risiko baru (CREATE), update, atau penghapusan (DELETE)
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Menganalisis...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Hasil Analisis</h2>
              <p className="text-xs text-muted-foreground">
                AI menemukan {suggestions.length} saran dari transkrip
              </p>
            </div>
            <div className="flex gap-2">
              {(["CREATE", "UPDATE", "DELETE"] as const).map((action) => {
                const config = actionConfig[action];
                const count = suggestions.filter((s) => s.action === action).length;
                if (count === 0) return null;
                return (
                  <Badge
                    key={action}
                    className={cn("text-[10px] font-semibold border", config.bg, config.color, config.border)}
                  >
                    {config.label}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>

          {suggestions.map((suggestion) => {
            const config = actionConfig[suggestion.action];
            const ActionIcon = config.icon;
            const isExpanded = expandedId === suggestion.id;

            return (
              <Card
                key={suggestion.id}
                className={cn(
                  "border-border/50 bg-card/80 transition-all",
                  `border-l-4`,
                  suggestion.action === "CREATE" && "border-l-success",
                  suggestion.action === "UPDATE" && "border-l-primary",
                  suggestion.action === "DELETE" && "border-l-risk-extreme"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        config.bg
                      )}
                    >
                      <ActionIcon className={cn("size-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={cn(
                            "text-[9px] font-semibold border h-4 px-1.5",
                            config.bg, config.color, config.border
                          )}
                        >
                          {config.label}
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {suggestion.prefilled.riskCode}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold">{suggestion.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {suggestion.description}
                      </p>

                      {/* Quote */}
                      <div className="mt-3 rounded-md bg-muted/30 border-l-2 border-primary/30 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                          {suggestion.quote}
                        </p>
                      </div>

                      {/* Reasoning */}
                      <p className="text-[11px] text-muted-foreground mt-2">
                        <span className="font-medium text-foreground">Reasoning:</span>{" "}
                        {suggestion.reasoning}
                      </p>

                      {/* Expanded: pre-filled fields */}
                      {isExpanded && (
                        <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-muted/20 p-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Sumber Risiko</p>
                            <p className="text-xs font-medium">{suggestion.prefilled.source}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Probabilitas × Dampak</p>
                            <p className="text-xs font-medium">
                              {suggestion.prefilled.probability} × {suggestion.prefilled.impact} ={" "}
                              {suggestion.prefilled.probability * suggestion.prefilled.impact}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] text-muted-foreground">Saran Mitigasi</p>
                            <p className="text-xs font-medium">{suggestion.prefilled.mitigation}</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" className="gap-1.5 h-7 text-xs shadow-sm">
                          <Check className="size-3" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                        >
                          <X className="size-3" />
                          Reject
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 h-7 text-xs text-muted-foreground ml-auto"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : suggestion.id)
                          }
                        >
                          {isExpanded ? (
                            <>
                              Tutup
                              <ChevronUp className="size-3" />
                            </>
                          ) : (
                            <>
                              Detail
                              <ChevronDown className="size-3" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
