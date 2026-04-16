import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSimpulanTingkatRisiko,
  getSimpulanEfektifitas,
  getSimpulanTingkatRisikoColor,
  getSimpulanEfektifitasColor,
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  levelToColor,
} from "@/lib/risk";
import { cn } from "@/lib/utils";

export interface SimpulanCardProps {
  nilaiCurrent: number;
  nilaiBaru: number;
}

export function SimpulanCard({ nilaiCurrent, nilaiBaru }: SimpulanCardProps) {
  const isInvalid = !nilaiBaru || isNaN(nilaiBaru);

  if (isInvalid) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardHeader>
          <CardTitle>Simpulan Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Pilih probabilitas dan dampak terlebih dahulu untuk melihat simpulan tingkat risiko dan efektifitas mitigasi.
          </p>
        </CardContent>
      </Card>
    );
  }

  const levelLama = getRiskLevelFromNilai(nilaiCurrent);
  const levelBaru = getRiskLevelFromNilai(nilaiBaru);

  const simpulanTingkat = getSimpulanTingkatRisiko(nilaiCurrent, nilaiBaru);
  const simpulanTingkatColor = getSimpulanTingkatRisikoColor(nilaiCurrent, nilaiBaru);
  
  const simpulanEfektifitas = getSimpulanEfektifitas(nilaiCurrent, nilaiBaru);
  const simpulanEfektifitasColor = getSimpulanEfektifitasColor(nilaiCurrent, nilaiBaru);

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <CardTitle>Simpulan Assessment</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Perbandingan Tingkat Risiko</span>
          <div className="flex items-center gap-3">
            <div className={cn("px-3 py-1.5 rounded-md border font-medium text-sm", levelToColor(levelLama))}>
              {getRiskLevelLabel(levelLama)} ({nilaiCurrent})
            </div>
            <ArrowRight className="size-5 text-muted-foreground" />
            <div className={cn("px-3 py-1.5 rounded-md border font-medium text-sm", levelToColor(levelBaru))}>
              {getRiskLevelLabel(levelBaru)} ({nilaiBaru})
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/40 border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Simpulan Tingkat Risiko</span>
            <div className="flex items-start">
              <Badge 
                variant="outline" 
                className={cn("text-sm py-1 font-medium", simpulanTingkatColor)}
                data-testid="simpulan-tingkat"
              >
                {simpulanTingkat}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4 rounded-lg bg-muted/40 border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Efektifitas</span>
            <div className="flex items-start">
              <Badge 
                variant="outline" 
                className={cn("text-sm py-1 font-medium", simpulanEfektifitasColor)}
                data-testid="simpulan-efektifitas"
              >
                {simpulanEfektifitas}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
