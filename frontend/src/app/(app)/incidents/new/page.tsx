"use client";
import { toast } from "sonner";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Save,
  ArrowLeft,
  AlertTriangle,
  LightbulbIcon,
  HelpCircle,
  Search,
} from "lucide-react";

export default function NewIncidentPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [what, setWhat] = useState("");
  const [who, setWho] = useState("");
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [whyHow, setWhyHow] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!what.trim() || !who.trim() || !where.trim() || !when.trim() || !correctiveAction.trim() || !preventiveAction.trim()) {
      toast.error("Harap lengkapi semua field yang wajib (*)");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save as draft first
      const payload = {
        title: title || (what.substring(0, 50) + "..."),
        what,
        who,
        "when": new Date(when).toISOString(),
        "where": where,
        whyHow,
        severity,
        status: "draft",
        correctiveAction,
        preventiveAction,
        organizationId: user?.organizationId,
      };

      const result = await api.post<any>("/incidents", payload, token || undefined);

      // Submit for approval
      try {
        await api.post("/approvals/submit", {
          requestType: "incident",
          entityId: result.id,
          notes: ""
        }, token || undefined);
      } catch (approvalErr) {
        console.error("Failed to submit for approval", approvalErr);
        toast.success("Insiden berhasil disimpan, namun gagal submit untuk approval. Silakan submit manual dari halaman detail.");
      }

      router.push("/incident");
    } catch (err) {
      console.error("Failed to create incident:", err);
      toast.error("Gagal menyimpan insiden. Cek konsol.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pelaporan Insiden</h1>
            <p className="text-sm text-muted-foreground">
              Formulir kronologi kejadian (5W1H) dan tindak lanjut (CAPA)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 text-xs" onClick={() => router.back()}>
            Batal
          </Button>
          <Button className="gap-2 shadow-lg shadow-risk-extreme/20 text-xs bg-risk-extreme hover:bg-risk-extreme/90" onClick={handleSubmit} disabled={isSubmitting}>
            <AlertTriangle className="size-3.5" />
            {isSubmitting ? "Waktu Pelaporan..." : "Laporkan Insiden"}
          </Button>
        </div>
      </div>

      <div className="grid gap-8">
        
        {/* Section 1: Kronologi 5W1H */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-risk-extreme">
            <HelpCircle className="size-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">1. Kronologi Kejadian (5W1H)</h2>
          </div>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-5 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs">Uraian Kejadian Singkat (What) <span className="text-destructive">*</span></Label>
                <Input value={what} onChange={e => setWhat(e.target.value)} placeholder="Contoh: Generator mati mendadak di gudang vaksin..." className="text-xs bg-muted/20 border-border/50" />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Orang/Pihak Terlibat (Who) <span className="text-destructive">*</span></Label>
                  <Input value={who} onChange={e => setWho(e.target.value)} placeholder="Nama lengkap, jabatan, unit kerja, atau vendor..." className="text-xs bg-muted/20 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Lokasi Kejadian (Where) <span className="text-destructive">*</span></Label>
                  <Input value={where} onChange={e => setWhere(e.target.value)} placeholder="Alamat lengkap, nama gedung, ruangan, dsb..." className="text-xs bg-muted/20 border-border/50" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Waktu Kejadian (When) <span className="text-destructive">*</span></Label>
                  <Input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="text-xs bg-muted/20 border-border/50" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Tingkat Keparahan (Severity)</Label>
                  </div>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger className="h-9 text-xs bg-muted/20 border-border/50">
                      <SelectValue placeholder="Pilih tingkat keparahan..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="insignificant">Rendah (Dampak operasional kecil)</SelectItem>
                      <SelectItem value="minor">Sedang (Kesalahan ringan/dapat diatasi)</SelectItem>
                      <SelectItem value="major">Tinggi (Adanya kerugian aset/reputasi)</SelectItem>
                      <SelectItem value="critical">Kritis (Membahayakan nyawa/kegagalan sistem besar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="bg-border/50 my-2" />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Alasan Terjadinya Insiden (Why & How)</Label>
                  <Button variant="ghost" size="xs" className="h-5 text-[10px] gap-1 text-primary">
                    <Sparkles className="size-2.5" /> AI Fishbone Analysis
                  </Button>
                </div>
                <Textarea
                  value={whyHow}
                  onChange={e => setWhyHow(e.target.value)}
                  placeholder="Ceritakan dengan jelas mengapa insiden ini bisa terjadi (Why) dan bagaimana alur kejadiannya (How)..."
                  className="min-h-[120px] text-xs bg-muted/20 border-border/50 resize-none"
                />
              </div>

            </CardContent>
          </Card>
        </section>

        {/* Section 2: CAPA (Tindak Lanjut) */}
        <section>
          <div className="flex items-center gap-2 mb-4 text-primary">
            <LightbulbIcon className="size-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">2. Tindak Lanjut / CAPA</h2>
          </div>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="p-5 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-success">Perbaikan Langsung (Corrective Action) <span className="text-destructive">*</span></Label>
                <div className="relative">
                    <Textarea
                    value={correctiveAction}
                    onChange={e => setCorrectiveAction(e.target.value)}
                    placeholder="Apa tindakan cepat yang akan diambil untuk mengatasi masalah SEKARANG? (Contoh: Menyalakan genset darurat dan memindahkan vaksin)"
                    className="min-h-[80px] text-xs bg-success/5 border-success/20 resize-none"
                    />
                    <Button size="icon-xs" variant="ghost" className="absolute right-2 top-2 text-primary hover:text-primary hover:bg-primary/10" title="AI Rekomendasikan">
                        <Sparkles className="size-3 z-10" />
                    </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-primary">Pencegahan (Preventive Action) <span className="text-destructive">*</span></Label>
                <div className="relative">
                    <Textarea
                    value={preventiveAction}
                    onChange={e => setPreventiveAction(e.target.value)}
                    placeholder="Apa perubahan SOP/sistem jangka panjang agar masalah ini TIDAK TERULANG? (Contoh: Menambahkan sistem monitoring suhu berbasis IoT yang terhubung ke HP PIC)"
                    className="min-h-[80px] text-xs bg-primary/5 border-primary/20 resize-none"
                    />
                    <Button size="icon-xs" variant="ghost" className="absolute right-2 top-2 text-primary hover:text-primary hover:bg-primary/10" title="AI Rekomendasikan">
                        <Sparkles className="size-3 z-10" />
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Risk Linkage (Opsional) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              <h2 className="text-sm font-bold uppercase tracking-wider">3. Kaitkan Dengan Risiko (Opsional)</h2>
            </div>
            <p className="text-xs text-muted-foreground italic">Menghubungkan insiden ini dengan Register Risiko</p>
          </div>
          <Card className="border-border/50 bg-card/80 border-dashed">
            <CardContent className="p-5 flex flex-col items-center justify-center text-center py-10">
              <AlertTriangle className="size-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium mb-1">Insiden ini belum dikaitkan dengan risiko manapun</p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                Jika insiden ini merupakan perwujudan dari risiko yang sudah diidentifikasi, tautkan untuk memperbarui tren data risiko tersebut.
              </p>
              <Button variant="outline" size="sm" className="gap-2">
                <Search className="size-3.5" /> Pilih Risiko Terkait
              </Button>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}
