"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Loader2, Upload } from "@/components/ui/icons";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  AccentButton,
  ActionButton,
  CollectionEmptyState,
  CollectionTableHead,
  CollectionTableHeader,
} from "@/components/shared/design-system";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

type RiskBatchPayload = {
  clientKey: string;
  title: string;
  description: string;
  organizationId?: string;
  roId?: string;
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

function getPreviewStatus(preview: BulkRiskPreview) {
  if (preview.errors.length > 0) {
    return { label: "Invalid", tone: "danger" as const };
  }
  if (preview.warnings.length > 0) {
    return { label: "Warning", tone: "warning" as const };
  }
  return { label: "Valid", tone: "success" as const };
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
    () =>
      previews.filter(
        (preview) => preview.payload && preview.errors.length === 0,
      ),
    [previews],
  );

  const createdCount = resultItems.filter(
    (item) => item.status === "created",
  ).length;
  const failedCount = resultItems.filter(
    (item) => item.status === "failed",
  ).length;

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
      const response = await api.postForm<PreviewResponse>(
        "/risks/batch/preview",
        form,
        token,
      );
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
    if (validRows.length === 0) {
      toast.error("Belum ada baris valid untuk disubmit.");
      return;
    }

    setIsSubmitting(true);
    try {
      const items = validRows.flatMap((row) =>
        row.payload ? [{ ...row.payload }] : [],
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
    <FormPage className="max-w-7xl pb-10">
      <FormHeader
        title="Import Risiko"
        onBack={() => router.push("/risk/register")}
        backLabel="Kembali"
        actions={
          <>
            <ActionButton
              type="button"
              variant="outline"
              size="md"
              icon={<Download className="size-3.5" />}
              onClick={handleDownloadTemplate}
            >
              Download template
            </ActionButton>
            <AccentButton
              type="button"
              icon={
                isSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )
              }
              onClick={handleSubmit}
              disabled={isSubmitting || validRows.length === 0}
            >
              {isSubmitting ? "Menyimpan..." : "Submit Risiko"}
            </AccentButton>
          </>
        }
      />

      <div className="space-y-6">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Sumber Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/[0.18] px-6 py-10 text-center transition-[background-color,border-color] duration-150 hover:border-primary/40 hover:bg-muted/[0.28]">
              <div className="flex size-11 items-center justify-center rounded-xl bg-background text-primary">
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
              <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Sumber aktif:{" "}
                <span className="font-medium text-foreground">
                  {sourceName}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Review hasil parsing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {previews.length === 0 ? (
              <CollectionEmptyState
                title="Belum ada data."
                description="Upload template untuk mulai review."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/60">
                <Table>
                  <CollectionTableHeader density="compact">
                    <TableRow>
                      <CollectionTableHead density="compact">
                        Baris
                      </CollectionTableHead>
                      <CollectionTableHead density="compact">
                        Risiko
                      </CollectionTableHead>
                      <CollectionTableHead density="compact">
                        Status
                      </CollectionTableHead>
                      <CollectionTableHead density="compact">
                        Catatan
                      </CollectionTableHead>
                    </TableRow>
                  </CollectionTableHeader>
                  <TableBody>
                    {previews.map((preview) => {
                      const status = getPreviewStatus(preview);
                      return (
                        <TableRow key={preview.clientKey}>
                          <TableCell>{preview.rowNumber}</TableCell>
                          <TableCell className="max-w-[320px] whitespace-normal">
                            <p className="font-medium text-foreground">
                              {preview.raw["RISIKO"] ||
                                preview.raw["Risiko"] ||
                                "-"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge tone={status.tone} size="compact">
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[520px] whitespace-normal text-xs text-muted-foreground">
                            {preview.errors.length > 0
                              ? preview.errors.join(" ")
                              : preview.warnings.length > 0
                                ? preview.warnings.join(" ")
                                : "Siap dibuat."}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {resultItems.length > 0 ? (
        <Card className="rounded-xl">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold text-foreground">
                  Hasil import risiko
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Ringkasan status setiap baris yang dikirim.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="success" size="compact">
                  {createdCount} dibuat
                </Badge>
                <Badge tone="danger" size="compact">
                  {failedCount} gagal
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="overflow-hidden rounded-xl border border-border/60">
              <Table>
                <CollectionTableHeader density="compact">
                  <TableRow>
                    <CollectionTableHead density="compact">Client Key</CollectionTableHead>
                    <CollectionTableHead density="compact">Status</CollectionTableHead>
                    <CollectionTableHead density="compact">Code</CollectionTableHead>
                    <CollectionTableHead density="compact">Pesan</CollectionTableHead>
                  </TableRow>
                </CollectionTableHeader>
                <TableBody>
                  {resultItems.map((item) => (
                    <TableRow key={item.clientKey}>
                      <TableCell>{item.clientKey}</TableCell>
                      <TableCell>
                        <Badge
                          tone={item.status === "created" ? "success" : "danger"}
                          size="compact"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.code || "-"}</TableCell>
                      <TableCell className="max-w-[480px] whitespace-normal text-xs text-muted-foreground">
                        {item.error || item.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

    </FormPage>
  );
}
