"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PageStack } from "@/components/shared/design-system";
import {
  Settings2,
  Save,
  Target,
  Gauge,
  AlertTriangle,
  Shield,
  FileText,
} from "@/components/ui/icons";

const probabilityScale = [
  { level: 1, label: "Rare", description: "Hampir tidak mungkin terjadi (<5%)" },
  { level: 2, label: "Unlikely", description: "Kecil kemungkinan terjadi (5-25%)" },
  { level: 3, label: "Possible", description: "Mungkin terjadi (25-50%)" },
  { level: 4, label: "Likely", description: "Besar kemungkinan terjadi (50-75%)" },
  { level: 5, label: "Almost Certain", description: "Hampir pasti terjadi (>75%)" },
];

const impactScale = [
  { level: 1, label: "Insignificant", description: "Dampak minimal, tidak mengganggu operasi" },
  { level: 2, label: "Minor", description: "Dampak kecil, gangguan operasi ringan" },
  { level: 3, label: "Moderate", description: "Dampak sedang, gangguan operasi menengah" },
  { level: 4, label: "Major", description: "Dampak besar, gangguan operasi signifikan" },
  { level: 5, label: "Catastrophic", description: "Dampak sangat besar, kegagalan total" },
];

const scaleColors = [
  "bg-risk-low/15 text-risk-low border-risk-low/20",
  "bg-risk-low/15 text-risk-low border-risk-low/20",
  "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  "bg-risk-high/15 text-risk-high border-risk-high/20",
  "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
];

export default function CriteriaPage() {
  return (
    <PageStack>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">
            Scope, Context & Criteria
          </h1>
          <p className="text-sm text-muted-foreground">
            Parameter dasar manajemen risiko sesuai ISO 31000 Step 1
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <Save className="size-4" />
          Simpan Perubahan
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scope */}
        <Card className="bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4" />
              Objek & Ruang Lingkup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Jenis Objek</Label>
              <Input defaultValue="Direktorat Jenderal" className="h-8 text-xs bg-muted/20 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nama Objek</Label>
              <Input defaultValue="Ditjen Pencegahan dan Pengendalian Penyakit (P2P)" className="h-8 text-xs bg-muted/20 border-border/50" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Pernyataan Ruang Lingkup</Label>
              <Textarea
                defaultValue="Manajemen risiko mencakup seluruh kegiatan pencegahan, pengendalian, dan penanggulangan penyakit yang berada di bawah koordinasi Ditjen P2P Kementerian Kesehatan RI."
                className="min-h-[80px] text-xs bg-muted/20 border-border/50 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Context */}
        <Card className="bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="size-4" />
              Konteks Internal & Eksternal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Konteks Internal</Label>
              <Textarea
                defaultValue="Struktur organisasi, SDM, anggaran, kapasitas laboratorium, sistem informasi kesehatan, infrastruktur logistik vaksin dan obat."
                className="min-h-[80px] text-xs bg-muted/20 border-border/50 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Konteks Eksternal</Label>
              <Textarea
                defaultValue="Regulasi WHO, pandemi global, perubahan iklim, resistensi antimikroba, dinamika politik kesehatan, kerjasama lintas sektor."
                className="min-h-[80px] text-xs bg-muted/20 border-border/50 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appetite & Tolerance */}
        <Card className="bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="size-4" />
              Risk Appetite & Tolerance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Risk Appetite</Label>
              <Input defaultValue="Sedang (skor ≤ 9)" className="h-8 text-xs bg-muted/20 border-border/50" />
              <p className="text-[10px] text-muted-foreground">
                Batas selera risiko yang bisa diterima organisasi
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Risk Tolerance</Label>
              <Input defaultValue="Tinggi (skor ≤ 16)" className="h-8 text-xs bg-muted/20 border-border/50" />
              <p className="text-[10px] text-muted-foreground">
                Batas toleransi penyimpangan dari appetite
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Probability Scale */}
      <Card className="bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gauge className="size-4" />
            Skala Probabilitas (1-5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {probabilityScale.map((item, index) => (
              <div
                key={item.level}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
              >
                <Badge
                  className={cn(
                    "text-xs font-bold border h-7 w-7 flex items-center justify-center p-0",
                    scaleColors[index]
                  )}
                >
                  {item.level}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                <Input
                  defaultValue={item.description}
                  className="h-7 text-[11px] max-w-[300px] bg-muted/20 border-border/50 hidden lg:block"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Impact Scale */}
      <Card className="bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Skala Dampak (1-5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {impactScale.map((item, index) => (
              <div
                key={item.level}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3"
              >
                <Badge
                  className={cn(
                    "text-xs font-bold border h-7 w-7 flex items-center justify-center p-0",
                    scaleColors[index]
                  )}
                >
                  {item.level}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                <Input
                  defaultValue={item.description}
                  className="h-7 text-[11px] max-w-[300px] bg-muted/20 border-border/50 hidden lg:block"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageStack>
  );
}
