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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  MonitoringPreviewItem,
  MonitoringBatchResultItem,
} from "@/types/risk-monitoring";
import {
  previewMonitoringUpload,
  submitMonitoringBatch,
} from "@/lib/api/risk-monitoring";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

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
  if (preview.errors.length > 0)
    return "border-destructive/30 bg-destructive/10 text-destructive";
  if (preview.warnings.length > 0)
    return "border-risk-high/30 bg-risk-high/10 text-risk-high";
  return "border-success/30 bg-success/10 text-success";
}

function getCycleOptions(): string[] {
  const year = new Date().getFullYear();
  const opts: string[] = [];
  for (let y = year - 1; y <= year + 1; y++) {
    opts.push(`${y}-H1`);
    opts.push(`${y}-H2`);
  }
  return opts;
}

export default function BulkRiskRegisterPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [bulkMode, setBulkMode] = useState<"baru" | "pemantauan">("baru");
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  const [sourceName, setSourceName] = useState("");
  const [previews, setPreviews] = useState<BulkRiskPreview[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultItems, setResultItems] = useState<RiskBatchResultItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [monitoringPreviews, setMonitoringPreviews] = useState<
    MonitoringPreviewItem[]
  >([]);
  const [monitoringResults, setMonitoringResults] = useState<
    MonitoringBatchResultItem[]
  >([]);

  const isUnitRole = user?.role === "unit";
  const effectiveOrgId = isUnitRole
    ? (user?.organizationId ?? "")
    : selectedOrgId;

  const validRows = useMemo(
    () =>
      previews.filter(
        (preview) => preview.payload && preview.errors.length === 0,
      ),
    [previews],
  );

  const monitoringValidRows = useMemo(
    () => monitoringPreviews.filter((p) => p.payload && p.errors.length === 0),
    [monitoringPreviews],
  );

  const createdCount = resultItems.filter(
    (item) => item.status === "created",
  ).length;
  const failedCount = resultItems.filter(
    (item) => item.status === "failed",
  ).length;

  const monitoringCreatedCount = monitoringResults.filter(
    (item) => item.status === "created",
  ).length;
  const monitoringFailedCount = monitoringResults.filter(
    (item) => item.status === "failed",
  ).length;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!isUnitRole && !selectedOrgId) {
      toast.error("Pilih unit kerja terlebih dahulu.");
      return;
    }
    if (bulkMode === "pemantauan" && !selectedCycle) {
      toast.error("Pilih siklus pemantauan terlebih dahulu.");
      return;
    }

    setIsParsing(true);
    try {
      if (bulkMode === "pemantauan") {
        const response = await previewMonitoringUpload(
          file,
          token,
          effectiveOrgId,
          selectedCycle,
        );
        setMonitoringPreviews(response.items);
        setMonitoringResults([]);
        setSourceName(file.name);

        if (response.items.length === 0) {
          toast.error(
            "Template berhasil dibaca, tetapi belum ada baris data untuk diimport.",
          );
        } else {
          toast.success(
            `${response.items.length} baris berhasil diparse untuk direview.`,
          );
        }
      } else {
        const form = new FormData();
        form.append("file", file);
        const queryParams = new URLSearchParams();
        if (!isUnitRole && selectedOrgId) {
          queryParams.append("organization_id", selectedOrgId);
        }
        const query = queryParams.toString();
        const path = `/risks/batch/preview${query ? `?${query}` : ""}`;
        const response = await api.postForm<PreviewResponse>(path, form, token);
        setPreviews(response.items);
        setResultItems([]);
        setSourceName(file.name);

        if (response.items.length === 0) {
          toast.error(
            "Template berhasil dibaca, tetapi belum ada baris data untuk diimport.",
          );
        } else {
          toast.success(
            `${response.items.length} baris berhasil diparse untuk direview.`,
          );
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "File tidak bisa dibaca.",
      );
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
      if (bulkMode === "pemantauan") {
        if (!selectedCycle) {
          toast.error("Pilih siklus pemantauan terlebih dahulu.");
          return;
        }
        const monitoringUrl = `${API_BASE}/risks/batch/monitoring/template?organization_id=${effectiveOrgId}&cycle=${selectedCycle}`;
        const response = await fetch(monitoringUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Gagal mengunduh template pemantauan.");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `monitoring-template-${selectedCycle}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        return;
      }

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
      toast.error(
        error instanceof Error ? error.message : "Gagal mengunduh template.",
      );
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    const currentValidRows =
      bulkMode === "baru" ? validRows : monitoringValidRows;
    if (currentValidRows.length === 0) {
      toast.error("Belum ada baris valid untuk disubmit.");
      return;
    }
    if (!isUnitRole && !selectedOrgId) {
      toast.error("Pilih unit kerja terlebih dahulu.");
      return;
    }
    if (bulkMode === "pemantauan" && !selectedCycle) {
      toast.error("Pilih siklus pemantauan terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (bulkMode === "pemantauan") {
        const validItems = monitoringPreviews
          .filter((p) => p.payload && p.errors.length === 0)
          .map((p) => p.payload!);
        const response = await submitMonitoringBatch(
          validItems,
          token,
          effectiveOrgId,
          selectedCycle,
        );
        setMonitoringResults(response.items);
        toast.success(
          `${response.items.filter((item) => item.status === "created").length} risiko pemantauan berhasil disimpan.`,
        );
      } else {
        const items = validRows.flatMap((row) =>
          row.payload
            ? [
                {
                  ...row.payload,
                  organizationId: effectiveOrgId || row.payload.organizationId,
                },
              ]
            : [],
        );
        const response = await api.post<BatchResponse>(
          "/risks/batch",
          { items },
          token,
        );
        setResultItems(response.items);
        toast.success(
          `${response.items.filter((item) => item.status === "created").length} risiko berhasil dibuat.`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan bulk risk.",
      );
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
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/[0.04] text-primary"
            >
              Backend parsed
            </Badge>
            <Badge variant="outline">
              {bulkMode === "baru"
                ? `${validRows.length} valid / ${previews.length} baris`
                : `${monitoringValidRows.length} valid / ${monitoringPreviews.length} baris`}
            </Badge>
          </div>
        }
        onBack={() => router.push("/risk/register")}
        backLabel="Kembali ke register risiko"
        actions={
          <>
            <Button
              variant="outline"
              className="gap-2 text-xs"
              onClick={handleDownloadTemplate}
            >
              <Download className="size-3.5" />
              Download template
            </Button>
            <Button
              className="gap-2 text-xs"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                (bulkMode === "baru"
                  ? validRows.length === 0
                  : monitoringValidRows.length === 0)
              }
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {isSubmitting ? "Menyimpan..." : "Submit bulk create"}
            </Button>
          </>
        }
      />

      <Tabs
        value={bulkMode}
        onValueChange={(v) => setBulkMode(v as "baru" | "pemantauan")}
        data-testid="bulk-mode-tabs"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="baru" data-testid="tab-risiko-baru">
            Risiko Baru
          </TabsTrigger>
          <TabsTrigger value="pemantauan" data-testid="tab-pemantauan">
            Pemantauan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="baru">
          <Card className="rounded-[12px] border border-border/60 bg-card">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold text-foreground">
                Sumber Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-6 py-6">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/[0.18] px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/[0.28]">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-background text-primary">
                  {isParsing ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="size-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Upload file Excel template
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Frontend hanya mengirim file. Semua parsing dan validasi
                    dilakukan di backend.
                  </p>
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
                  Sumber aktif:{" "}
                  <span className="font-medium text-foreground">
                    {sourceName}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[12px] border border-border/50 bg-card mt-10">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold text-foreground">
                Preview Validasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-6">
              {!isUnitRole && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Unit Kerja
                  </label>
                  <Select
                    value={selectedOrgId}
                    onValueChange={setSelectedOrgId}
                  >
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Pilih unit kerja" />
                    </SelectTrigger>
                    <SelectContent>
                      {(user?.accessibleOrgIds ?? []).map((orgId) => (
                        <SelectItem key={orgId} value={orgId}>
                          {orgId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {previews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-background px-5 py-10 text-center text-sm text-muted-foreground">
                  Belum ada data. Upload template untuk mulai review.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Baris</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Risiko
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Status
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Catatan
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previews.map((preview) => (
                      <TableRow key={preview.clientKey}>
                        <TableCell>{preview.rowNumber}</TableCell>
                        <TableCell className="max-w-[320px] whitespace-normal">
                          <p className="font-medium text-foreground">
                            {preview.raw["RISIKO"] ||
                              preview.raw["Risiko"] ||
                              "-"}
                          </p>
                          {effectiveOrgId && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {effectiveOrgId}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              statusBadgeClass(preview),
                            )}
                          >
                            {preview.errors.length > 0
                              ? "Invalid"
                              : preview.warnings.length > 0
                                ? "Warning"
                                : "Valid"}
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
        </TabsContent>

        <TabsContent value="pemantauan">
          <Card className="rounded-[12px] border border-border/50 bg-card">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold text-foreground">
                Sumber Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Siklus Pemantauan
                </label>
                <Select
                  value={selectedCycle}
                  onValueChange={setSelectedCycle}
                  data-testid="cycle-selector"
                >
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Pilih siklus pemantauan" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCycleOptions().map((cycle) => (
                      <SelectItem key={cycle} value={cycle}>
                        {cycle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/[0.18] px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/[0.28]">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-background text-primary">
                  {isParsing ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="size-5" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Upload file Excel template
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Frontend hanya mengirim file. Semua parsing dan validasi
                    dilakukan di backend.
                  </p>
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
                  Sumber aktif:{" "}
                  <span className="font-medium text-foreground">
                    {sourceName}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[12px] border border-border/60 bg-card mt-10">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold text-foreground">
                Preview Validasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-6 py-6">
              {!isUnitRole && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Unit Kerja
                  </label>
                  <Select
                    value={selectedOrgId}
                    onValueChange={setSelectedOrgId}
                  >
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Pilih unit kerja" />
                    </SelectTrigger>
                    <SelectContent>
                      {(user?.accessibleOrgIds ?? []).map((orgId) => (
                        <SelectItem key={orgId} value={orgId}>
                          {orgId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {monitoringPreviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-background px-5 py-10 text-center text-sm text-muted-foreground">
                  Belum ada data. Upload template untuk mulai review.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Baris</TableHead>
                      <TableHead>Kode Risiko</TableHead>
                      <TableHead>Uraian Risiko</TableHead>
                      <TableHead>Target P</TableHead>
                      <TableHead>Target D</TableHead>
                      <TableHead>Target Nilai</TableHead>
                      <TableHead>Target Tingkat</TableHead>
                      <TableHead>Realisasi P</TableHead>
                      <TableHead>Realisasi D</TableHead>
                      <TableHead>Bobot</TableHead>
                      <TableHead>Nilai</TableHead>
                      <TableHead>Tingkat</TableHead>
                      <TableHead>Simpulan</TableHead>
                      <TableHead>Efektivitas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monitoringPreviews.map((preview) => (
                      <TableRow key={preview.clientKey}>
                        <TableCell>{preview.rowNumber}</TableCell>
                        <TableCell>{preview.code}</TableCell>
                        <TableCell className="max-w-[200px] whitespace-normal">
                          {preview.title}
                        </TableCell>
                        <TableCell>{preview.targetP}</TableCell>
                        <TableCell>{preview.targetD}</TableCell>
                        <TableCell>{preview.targetNilai}</TableCell>
                        <TableCell>{preview.targetTingkat}</TableCell>
                        <TableCell>{preview.realizationP ?? "-"}</TableCell>
                        <TableCell>{preview.realizationD ?? "-"}</TableCell>
                        <TableCell>{preview.computedBobot ?? "-"}</TableCell>
                        <TableCell>{preview.computedNilai ?? "-"}</TableCell>
                        <TableCell>{preview.computedTingkat ?? "-"}</TableCell>
                        <TableCell>{preview.simpulan ?? "-"}</TableCell>
                        <TableCell>{preview.efektivitas ?? "-"}</TableCell>
                        <TableCell>
                          {preview.errors.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-destructive/30 bg-destructive/10 text-destructive"
                            >
                              Invalid
                            </Badge>
                          ) : preview.warnings.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-risk-high/30 bg-risk-high/10 text-risk-high"
                            >
                              Warning
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-success/30 bg-success/10 text-success"
                            >
                              Valid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] whitespace-normal text-xs text-muted-foreground">
                          {preview.errors.length > 0
                            ? preview.errors.join(" ")
                            : preview.warnings.length > 0
                              ? preview.warnings.join(" ")
                              : "Siap dikirim."}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {bulkMode === "baru" && resultItems.length > 0 ? (
        <Card className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold text-foreground">
              Hasil Submit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-success/30 bg-success/10 text-success"
              >
                {createdCount} created
              </Badge>
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/10 text-destructive"
              >
                {failedCount} failed
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    Client Key
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Code</TableHead>
                  <TableHead className="whitespace-nowrap">Pesan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultItems.map((item) => (
                  <TableRow key={item.clientKey}>
                    <TableCell>{item.clientKey}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.code || "-"}</TableCell>
                    <TableCell className="max-w-[480px] whitespace-normal text-xs text-muted-foreground">
                      {item.error || item.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {bulkMode === "pemantauan" && monitoringResults.length > 0 && (
        <Card className="overflow-hidden rounded-[24px] border border-border/60 bg-card">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold text-foreground">
              Hasil Submit Pemantauan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-success/30 bg-success/10 text-success"
              >
                {monitoringCreatedCount} dibuat
              </Badge>
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/10 text-destructive"
              >
                {monitoringFailedCount} gagal
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    Client Key
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Code</TableHead>
                  <TableHead className="whitespace-nowrap">Pesan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitoringResults.map((item) => (
                  <TableRow key={item.clientKey}>
                    <TableCell>{item.clientKey}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.code || "-"}</TableCell>
                    <TableCell className="max-w-[400px] whitespace-normal text-xs text-muted-foreground">
                      {item.error || item.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
