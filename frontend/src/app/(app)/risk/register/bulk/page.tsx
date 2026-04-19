"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { FormHeader } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

type RiskBatchPayload = {
  clientKey: string;
  title: string;
  description: string;
  organizationId?: string;
  cause: string[];
  riskSource: string;
  controllability: "C" | "UC";
  impactDesc: string[];
  existingControl: string;
  controlEffectiveness: string;
  probability: number;
  impact: number;
  weight: number;
  riskPriority: number;
  riskAppetite: string;
  treatmentOption: string;
  mitigations: Array<{
    action: string;
    owner: string;
    frequency: string;
    recurringInterval?: string;
    dueDate?: string | null;
    executionScheduleText?: string;
  }>;
  targetProbability: number;
  targetImpact: number;
  targetWeight: number;
};

type BulkRiskPreview = {
  clientKey: string;
  rowNumber: number;
  raw: Record<string, string>;
  payload?: RiskBatchPayload;
  errors: string[];
  warnings: string[];
};

type RiskBatchResultItem = {
  clientKey: string;
  id?: string;
  code?: string;
  status: "created" | "failed";
  message: string;
  error?: string;
};

type PreviewResponse = {
  items: BulkRiskPreview[];
};

type BatchResponse = {
  items: RiskBatchResultItem[];
};

function statusBadgeClass(preview: BulkRiskPreview) {
  if (preview.errors.length > 0) return "border-destructive/30 bg-destructive/10 text-destructive";
  if (preview.warnings.length > 0) return "border-risk-high/30 bg-risk-high/10 text-risk-high";
  return "border-success/30 bg-success/10 text-success";
}

export default function BulkRiskRegisterPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [sourceName, setSourceName] = useState("");
  const [previews, setPreviews] = useState<BulkRiskPreview[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultItems, setResultItems] = useState<RiskBatchResultItem[]>([]);

  const validRows = useMemo(
    () => previews.filter((preview) => preview.payload && preview.errors.length === 0),
    [previews],
  );

  const createdCount = resultItems.filter((item) => item.status === "created").length;
  const failedCount = resultItems.filter((item) => item.status === "failed").length;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setIsParsing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await api.postForm<PreviewResponse>("/risks/batch/preview", form, token);
      setPreviews(response.items);
      setResultItems([]);
      setSourceName(file.name);

      if (response.items.length === 0) {
        toast.error("Template berhasil dibaca, tetapi belum ada baris data untuk diimport.");
      } else {
        toast.success(`${response.items.length} baris berhasil diparse untuk direview.`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "File tidak bisa dibaca.");
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/risks/batch/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Gagal mengunduh template.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bulk-risk-template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh template.");
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (validRows.length === 0) {
      toast.error("Belum ada baris valid untuk disubmit.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post<BatchResponse>(
        "/risks/batch",
        { items: validRows.flatMap((row) => (row.payload ? [row.payload] : [])) },
        token,
      );
      setResultItems(response.items);
      toast.success(`${response.items.filter((item) => item.status === "created").length} risiko berhasil dibuat.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan bulk risk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <FormHeader
        title="Bulk Create Risk"
        description="Upload template XLSX. Parsing, validasi, dan lookup unit kerja dijalankan di backend agar konsisten dengan master data server."
        badges={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/[0.04] text-primary">
              Backend parsed
            </Badge>
            <Badge variant="outline">
              {validRows.length} valid / {previews.length} baris
            </Badge>
          </div>
        }
        onBack={() => router.push("/risk/register")}
        backLabel="Kembali ke register risiko"
        actions={
          <>
            <Button variant="outline" className="gap-2 text-xs" onClick={handleDownloadTemplate}>
              <Download className="size-3.5" />
              Download template
            </Button>
            <Button className="gap-2 text-xs" onClick={handleSubmit} disabled={isSubmitting || validRows.length === 0}>
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {isSubmitting ? "Menyimpan..." : "Submit bulk create"}
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-[15px] font-semibold text-foreground">Sumber Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-6 py-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/[0.18] px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/[0.28]">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-background text-primary">
              {isParsing ? <Loader2 className="size-5 animate-spin" /> : <FileSpreadsheet className="size-5" />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Upload file Excel template</p>
              <p className="text-xs text-muted-foreground">Frontend hanya mengirim file. Semua parsing dan validasi dilakukan di backend.</p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={handleUpload}
              disabled={isParsing}
            />
          </label>

          {sourceName ? (
            <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
              Sumber aktif: <span className="font-medium text-foreground">{sourceName}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-[15px] font-semibold text-foreground">Preview Validasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-6">
          {previews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background px-5 py-10 text-center text-sm text-muted-foreground">
              Belum ada data. Upload template untuk mulai review.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Baris</TableHead>
                  <TableHead>Risiko</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previews.map((preview) => (
                  <TableRow key={preview.clientKey}>
                    <TableCell>{preview.rowNumber}</TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal">
                      <p className="font-medium text-foreground">{preview.raw["Risiko"] || "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{preview.raw["Unit Kerja"] || "Mengikuti unit user login"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal", statusBadgeClass(preview))}>
                        {preview.errors.length > 0 ? "Invalid" : preview.warnings.length > 0 ? "Warning" : "Valid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[520px] whitespace-normal text-xs text-muted-foreground">
                      {preview.errors.length > 0
                        ? preview.errors.join(" ")
                        : preview.warnings.length > 0
                          ? preview.warnings.join(" ")
                          : "Siap dikirim ke server."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {resultItems.length > 0 ? (
        <Card className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-[15px] font-semibold text-foreground">Hasil Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">{createdCount} created</Badge>
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">{failedCount} failed</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Pesan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultItems.map((item) => (
                  <TableRow key={item.clientKey}>
                    <TableCell>{item.clientKey}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.code || "-"}</TableCell>
                    <TableCell className="max-w-[480px] whitespace-normal text-xs text-muted-foreground">{item.error || item.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
