"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Clock,
  AlertTriangle,
  Bell,
  ShieldAlert,
  Loader2,
  Send,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  normalizeMitigationReportPayload,
  validateMitigationReportForm,
} from "@/lib/validation/reporting";
import type { MitigationTask } from "@/types/risk";

const levelBadgeVariant: Record<string, string> = {
  Pending: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Overdue: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  Selesai: "bg-risk-low/15 text-risk-low border-risk-low/20",
};

const tierConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reminder: { label: "Reminder", color: "text-risk-medium", bg: "bg-risk-medium/10", border: "border-risk-medium/20" },
  light: { label: "Overdue Ringan", color: "text-risk-high", bg: "bg-risk-high/10", border: "border-risk-high/20" },
  heavy: { label: "Overdue Berat", color: "text-risk-extreme", bg: "bg-risk-extreme/10", border: "border-risk-extreme/20" },
};

export function MitigationMonitoringPanel() {
  const { token } = useAuth();
  const [mitigations, setMitigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<MitigationTask | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progressPct, setProgressPct] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const formErrors = useMemo(
    () =>
      validateMitigationReportForm({
        progressPct,
        actualCost,
        evidenceUrl,
        notes,
      }),
    [actualCost, evidenceUrl, notes, progressPct]
  );
  const hasFormErrors = Object.keys(formErrors).length > 0;

  const fetchMitigations = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await api.get<MitigationTask[]>("/mitigation-tasks/all", token);
      const processed = (data || []).map((m) => {
        const dueDate = new Date(m.dueDate);
        const today = new Date();

        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let tier = "reminder";
        if (daysOverdue > 7) tier = "heavy";
        else if (daysOverdue > 0) tier = "light";

        const backendStatus = m.status;

        return {
          ...m,
          riskCode: m.riskCode || "—",
          title: m.riskTitle || "—",
          unit: m.mitigationOwner || "—",
          pic: m.mitigationOwner || "—",
          daysOverdue,
          level: backendStatus === "done" ? "Selesai" : backendStatus === "overdue" ? "Overdue" : "Pending",
          tier,
          mitigationAction: m.mitigationAction || "—",
          status: backendStatus,
          progressPct: m.progressPct || 0,
        };
      });

      const overdueOrSoon = processed.filter((m) => m.status !== "done" && m.daysOverdue >= -7);

      setMitigations(overdueOrSoon.sort((a: any, b: any) => b.daysOverdue - a.daysOverdue));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMitigations();
  }, [fetchMitigations]);

  const handleOpenSubmit = (task: MitigationTask) => {
    setSelectedTask(task);
    setProgressPct(task.progressPct ? String(task.progressPct) : "");
    setActualCost(task.actualCost ? String(task.actualCost) : "");
    setEvidenceUrl(task.evidenceUrl || "");
    setNotes(task.notes || "");
    setShowValidationErrors(false);
    setShowDialog(true);
  };

  const handleSubmitProgress = async () => {
    if (!selectedTask || !token) return;
    if (hasFormErrors) {
      setShowValidationErrors(true);
      toast.error("Lengkapi seluruh field wajib sebelum mengirim laporan.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        `/mitigation-tasks/${selectedTask.id}/submit`,
        normalizeMitigationReportPayload({
          progressPct,
          actualCost,
          evidenceUrl,
          notes,
        }),
        token
      );
      toast.success("Progress berhasil dilaporkan!");
      setShowDialog(false);
      await fetchMitigations();
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengirim laporan progress");
    } finally {
      setSubmitting(false);
    }
  };

  const heavyCount = mitigations.filter((m) => m.tier === "heavy").length;
  const lightCount = mitigations.filter((m) => m.tier === "light").length;
  const reminderCount = mitigations.filter((m) => m.tier === "reminder").length;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
          Work queue mitigasi
        </p>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Mitigasi</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Prioritaskan rencana yang mendekati tenggat atau sudah overdue, lalu kirim progres
            pelaksanaannya dari daftar kerja yang sama.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Mitigasi</p>
              <p className="mt-1 text-2xl font-bold">{mitigations.length}</p>
            </div>
            <ShieldAlert className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/50 border-risk-extreme/20 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Overdue Berat</p>
              <p className="mt-1 text-2xl font-bold text-risk-extreme">{heavyCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">H+7 ke atas</p>
            </div>
            <AlertTriangle className="size-5 text-risk-extreme" />
          </CardContent>
        </Card>
        <Card className="border-border/50 border-risk-high/20 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Overdue Ringan</p>
              <p className="mt-1 text-2xl font-bold text-risk-high">{lightCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">H+1 s.d. H+3</p>
            </div>
            <Clock className="size-5 text-risk-high" />
          </CardContent>
        </Card>
        <Card className="border-border/50 border-risk-medium/20 bg-card/80">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">Reminder</p>
              <p className="mt-1 text-2xl font-bold text-risk-medium">{reminderCount}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">H-7 s.d. Hari H</p>
            </div>
            <Bell className="size-5 text-risk-medium" />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Daftar mitigasi</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-20 text-xs">Kode</TableHead>
              <TableHead className="text-xs">Risiko & Rencana Mitigasi</TableHead>
              <TableHead className="w-28 text-xs">Unit / PIC</TableHead>
              <TableHead className="w-24 text-xs">Jatuh Tempo</TableHead>
              <TableHead className="w-20 text-center text-xs">Hari</TableHead>
              <TableHead className="w-20 text-xs">Status</TableHead>
              <TableHead className="w-28 text-xs">Eskalasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Memuat data mitigasi...
                  </div>
                </TableCell>
              </TableRow>
            ) : mitigations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Tidak ada rencana mitigasi yang overdue.
                </TableCell>
              </TableRow>
            ) : (
              mitigations.map((item) => {
                const tier = tierConfig[item.tier];
                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "border-border/30 transition-colors hover:bg-muted/20",
                      item.tier === "heavy" && "bg-risk-extreme/[0.02]"
                    )}
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.riskCode}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleOpenSubmit(item)}
                        className="group block w-full rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <p className="line-clamp-1 text-xs font-medium leading-relaxed text-primary transition-colors group-hover:text-primary/80">
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
                          Mitigasi: {item.mitigationAction}
                        </p>
                      </button>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs">{item.unit}</p>
                        <p className="text-[10px] text-muted-foreground">{item.pic}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString("id-ID") : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "text-xs font-bold",
                          item.daysOverdue > 0 ? tier.color : "text-muted-foreground"
                        )}
                      >
                        {item.daysOverdue > 0 ? `+${item.daysOverdue}` : item.daysOverdue}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "h-5 border px-1.5 text-[10px] font-semibold",
                          levelBadgeVariant[item.level]
                        )}
                      >
                        {item.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "h-5 border px-1.5 text-[10px] font-semibold",
                          tier.bg,
                          tier.color,
                          tier.border
                        )}
                      >
                        {tier.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Lapor Progress Mitigasi</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedTask?.mitigationAction} — {selectedTask?.periodLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Persentase Penyelesaian</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progressPct}
                  onChange={(e) => setProgressPct(e.target.value)}
                  className="w-24 text-xs"
                  placeholder="0"
                  aria-invalid={Boolean(showValidationErrors && formErrors.progressPct)}
                  aria-describedby={showValidationErrors && formErrors.progressPct ? "monitoring-progress-error" : undefined}
                />
                <span className="text-xs text-muted-foreground">%</span>
                <Progress value={Number(progressPct || 0)} className="h-2 flex-1" />
              </div>
              {showValidationErrors && formErrors.progressPct && (
                <p id="monitoring-progress-error" className="text-[11px] text-destructive">
                  {formErrors.progressPct}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Biaya Aktual (Rp) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="text-xs"
                placeholder="0"
                aria-invalid={Boolean(showValidationErrors && formErrors.actualCost)}
                aria-describedby={showValidationErrors && formErrors.actualCost ? "monitoring-cost-error" : undefined}
              />
              {showValidationErrors && formErrors.actualCost && (
                <p id="monitoring-cost-error" className="text-[11px] text-destructive">
                  {formErrors.actualCost}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Link Bukti / Evidence <span className="text-destructive">*</span>
              </Label>
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                className="text-xs"
                placeholder="https://drive.google.com/..."
                aria-invalid={Boolean(showValidationErrors && formErrors.evidenceUrl)}
                aria-describedby={showValidationErrors && formErrors.evidenceUrl ? "monitoring-evidence-error" : undefined}
              />
              {showValidationErrors && formErrors.evidenceUrl && (
                <p id="monitoring-evidence-error" className="text-[11px] text-destructive">
                  {formErrors.evidenceUrl}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Catatan Pelaksanaan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-xs"
                placeholder="Jelaskan pencapaian atau kendala yang dihadapi..."
                aria-invalid={Boolean(showValidationErrors && formErrors.notes)}
                aria-describedby={showValidationErrors && formErrors.notes ? "monitoring-notes-error" : undefined}
              />
              {showValidationErrors && formErrors.notes && (
                <p id="monitoring-notes-error" className="text-[11px] text-destructive">
                  {formErrors.notes}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)} className="text-xs">
              Batal
            </Button>
            <Button size="sm" onClick={handleSubmitProgress} disabled={submitting || hasFormErrors} className="gap-2 text-xs">
              {submitting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              Kirim Laporan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
