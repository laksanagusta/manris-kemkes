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
  CalendarClock,
  Sparkles,
  RefreshCw,
  Plus,
  Eye,
  Calendar,
  Users,
  FileText,
  CheckSquare,
  Clock,
  ChevronRight,
} from "lucide-react";

interface Minutes {
  id: string;
  title: string;
  date: string;
  participants: string[];
  agenda: string[];
  summary: string;
  decisions: string[];
  actionItems: {
    task: string;
    pic: string;
    deadline: string;
    priority: "High" | "Medium" | "Low";
  }[];
  createdAt: string;
}


const priorityVariant: Record<string, string> = {
  High: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  Medium: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Low: "bg-risk-low/15 text-risk-low border-risk-low/20",
};

export default function MinutesPage() {
  const { token } = useAuth();
  const [transcript, setTranscript] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [savedMinutes, setSavedMinutes] = useState<Minutes[]>([]);

  const handleGenerate = async () => {
    if (!transcript.trim()) return;
    setIsGenerating(true);
    try {
      const data = await api.post<any>("/ai/minutes", { transcript }, token || undefined);
      
      const newMinutes: Minutes = {
        id: `MOM-${String(savedMinutes.length + 1).padStart(3, "0")}`,
        title: data.title || "Untitled Minutes",
        date: data.date || new Date().toISOString().split("T")[0],
        participants: data.participants || [],
        agenda: data.agenda || [],
        summary: data.summary || "",
        decisions: data.decisions || [],
        actionItems: data.actionItems || [],
        createdAt: new Date().toISOString(),
      };
      
      setSavedMinutes([newMinutes, ...savedMinutes]);
      setTranscript("");
      setActiveTab("saved");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghasilkan notulensi");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            AI Meeting Minutes
          </h1>
          <p className="text-sm text-muted-foreground">
            Transformasi transkrip rapat menjadi notulensi terstruktur
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {(
          [
            { key: "saved", label: "Notulensi Tersimpan", count: savedMinutes.length },
            { key: "generate", label: "Generate Baru" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {"count" in tab && (
              <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1.5">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4" />
              Paste Transkrip Rapat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste transkrip rapat mentah di sini...&#10;AI akan menghasilkan notulensi terstruktur secara otomatis."
              className="min-h-[200px] text-sm bg-muted/20 border-border/50 resize-none"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-2 shadow-lg shadow-primary/20"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate Notulensi
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Minutes */}
      {activeTab === "saved" && (
        <div className="space-y-4">
          {savedMinutes.length === 0 && (
            <div className="text-center p-8 text-sm text-muted-foreground border rounded-lg border-dashed">
              Belum ada notulensi yang tersimpan. Gunakan tab Generate Baru.
            </div>
          )}
          {savedMinutes.map((minutes) => (
            <Card
              key={minutes.id}
              className="border-border/50 bg-card/80 transition-all hover:shadow-lg cursor-pointer group"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {minutes.id}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                        <Sparkles className="size-2 mr-0.5" />
                        AI Generated
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {minutes.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {minutes.summary}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {minutes.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {minutes.participants.length} peserta
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckSquare className="size-3" />
                        {minutes.actionItems.length} action items
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="size-3" />
                        {minutes.decisions.length} keputusan
                      </span>
                    </div>

                    {/* Action Items Preview */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {minutes.actionItems.slice(0, 3).map((item, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={cn(
                            "text-[9px] h-5 px-2 font-normal",
                            priorityVariant[item.priority]
                          )}
                        >
                          {item.pic}: {item.task.slice(0, 30)}...
                        </Badge>
                      ))}
                      {minutes.actionItems.length > 3 && (
                        <Badge variant="outline" className="text-[9px] h-5 px-2">
                          +{minutes.actionItems.length - 3} lainnya
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-muted-foreground shrink-0"
                  >
                    <Eye className="size-3.5" />
                    Lihat
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
