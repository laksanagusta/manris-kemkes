"use client";
import { toast } from "sonner";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Save } from "lucide-react";

export default function NewLessonPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("risiko");
  const [sourceRef, setSourceRef] = useState("");
  const [successFactors, setSuccessFactors] = useState("");
  const [failureFactors, setFailureFactors] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSave = async () => {
    if (!title || !description) {
      toast("Judul dan Deskripsi wajib diisi!");
      return;
    }

    setSaving(true);
    try {
      const tagsArray = tagsInput.split(",").map(t => t.trim()).filter(t => t !== "");
      const payload = {
        title,
        description,
        sourceType,
        sourceRef,
        successFactors,
        failureFactors,
        recommendations,
        tags: tagsArray,
        organizationId: user?.organizationId,
      };

      await api.post("/lessons", payload, token || undefined);
      router.push("/lessons");
    } catch (error) {
      console.error("Failed to create lesson:", error);
      toast.error("Gagal menambahkan lessons learned");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tambah Lesson</h1>
            <p className="text-sm text-muted-foreground">Catat pembelajaran dari risiko atau insiden</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2 shadow-lg shadow-primary/20 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Informasi Dasar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
             <Label className="text-xs">Judul Pembelajaran <span className="text-destructive">*</span></Label>
             <Input 
               value={title} onChange={(e) => setTitle(e.target.value)}
               placeholder="Contoh: Pentingnya redundansi cold chain" 
               className="text-xs" 
             />
          </div>
          <div className="space-y-1.5">
             <Label className="text-xs">Deskripsi Kejadian <span className="text-destructive">*</span></Label>
             <Textarea 
               value={description} onChange={(e) => setDescription(e.target.value)}
               placeholder="Jelaskan konteks dan apa yang terjadi..." 
               className="min-h-[80px] text-xs" 
             />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
             <div className="space-y-1.5">
               <Label className="text-xs">Sumber Daya</Label>
               <Select value={sourceType} onValueChange={setSourceType}>
                 <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="risiko" className="text-xs">Risiko</SelectItem>
                   <SelectItem value="insiden" className="text-xs">Insiden</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-1.5">
               <Label className="text-xs">ID Referensi</Label>
               <Input 
                 value={sourceRef} onChange={(e) => setSourceRef(e.target.value)}
                 placeholder="Contoh: R-001 atau INC-002" 
                 className="text-xs h-8" 
               />
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Analisis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-1.5">
             <Label className="text-xs text-success font-semibold">Faktor Keberhasilan</Label>
             <Textarea 
               value={successFactors} onChange={(e) => setSuccessFactors(e.target.value)}
               placeholder="Apa yang berjalan dengan baik? Mengapa bisa berhasil?" 
               className="min-h-[60px] text-xs resize-none" 
             />
          </div>
          <div className="space-y-1.5">
             <Label className="text-xs text-risk-extreme font-semibold">Faktor Kegagalan</Label>
             <Textarea 
               value={failureFactors} onChange={(e) => setFailureFactors(e.target.value)}
               placeholder="Apa hambatan/kegagalannya? Mengapa terjadi?" 
               className="min-h-[60px] text-xs resize-none" 
             />
          </div>
          <div className="space-y-1.5">
             <Label className="text-xs text-risk-medium font-semibold">Rekomendasi / Saran</Label>
             <Textarea 
               value={recommendations} onChange={(e) => setRecommendations(e.target.value)}
               placeholder="Tindakan yang perlu diambil ke depannya..." 
               className="min-h-[60px] text-xs resize-none" 
             />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-6 space-y-4">
           <div className="space-y-1.5">
             <Label className="text-xs">Tags (Pisahkan dengan koma)</Label>
             <Input 
               value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
               placeholder="Contoh: cold-chain, infrastruktur, sdm" 
               className="text-xs" 
             />
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
