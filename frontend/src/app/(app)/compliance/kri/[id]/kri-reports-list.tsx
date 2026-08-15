"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarDays, AlertCircle, CheckCircle, Clock } from "@/components/ui/icons";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeKRIReportPayload, validateKRIReportForm } from "@/lib/validation/reporting";
import { isWithinSubmissionWindow } from "@/lib/kri-reporting";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";

interface KRIReport {
  id: string;
  kriId: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  value: number | null;
  notes: string;
  status: "pending" | "submitted" | "accepted" | "overdue" | "skipped";
  submittedByName?: string;
  submittedAt?: string;
}

export function KRIReportsList({ kriId, metric, organizationId }: { kriId: string; metric: string; organizationId: string }) {
  const { token, user } = useAuth();
  const [reports, setReports] = useState<KRIReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Submit Dialog state
  const [reportToSubmit, setReportToSubmit] = useState<KRIReport | null>(null);
  const [submitValue, setSubmitValue] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const formErrors = useMemo(
    () =>
      validateKRIReportForm({
        value: submitValue,
        notes: submitNotes,
      }),
    [submitNotes, submitValue]
  );
  const hasFormErrors = Object.keys(formErrors).length > 0;

  const fetchReports = async () => {
    if (!token) return;
    try {
      const res = await api.get<KRIReport[]>(`/kris/${kriId}/reports`, token);
      setReports(res || []);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat jadwal pelaporan KRI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [kriId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportToSubmit || !token) return;
    if (hasFormErrors) {
      setShowValidationErrors(true);
      toast.error("Periksa kembali nilai laporan KRI sebelum disubmit.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.post(
        `/kri-reports/${reportToSubmit.id}/submit`,
        normalizeKRIReportPayload({
          value: submitValue,
          notes: submitNotes,
        }),
        token
      );
      
      toast.success("Laporan berhasil disubmit!");
      setReportToSubmit(null);
      fetchReports();
      // Optional: Since updating the report changes the KRI's current value,
      // it is ideal to refresh the paage or trigger a re-fetch of the KRI.
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      toast.error("Gagal submit laporan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/80 animate-pulse">
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Memuat jadwal laporan...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            Jadwal Pelaporan Berkala
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium">Belum ada jadwal pelaporan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Jadwal akan otomatis dibuat oleh sistem berdasarkan frekuensi pelaporan KRI ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${
                    report.status === "overdue" ? "border-destructive/30 bg-destructive/5" :
                    report.status === "pending" ? "border-border/50 hover:bg-muted/50" : 
                    report.status === "submitted" ? "border-amber-200 bg-amber-50/50" :
                    "border-success/30 bg-success/5 opacity-80"
                  }`}
                >
                  <div className="space-y-1 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{report.periodLabel}</p>
                      {report.status === "pending" && <Badge variant="outline" className="text-xs text-yellow-600 bg-yellow-50"><Clock className="size-3 mr-1"/> Pending</Badge>}
                      {report.status === "overdue" && <Badge variant="outline" className="text-xs text-destructive bg-destructive/10"><AlertCircle className="size-3 mr-1"/> Terlambat</Badge>}
                      {report.status === "submitted" && <Badge variant="outline" className="text-xs text-amber-600 bg-amber-50"><Clock className="size-3 mr-1"/> Menunggu Persetujuan</Badge>}
                      {report.status === "accepted" && <Badge variant="outline" className="text-xs text-success bg-success/10"><CheckCircle className="size-3 mr-1"/> Diterima</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>Tenggat: <strong className={report.status === "overdue" ? "text-destructive" : ""}>{new Date(report.dueDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric'})}</strong></span>
                      {report.periodStart !== report.periodEnd && (
                        <span>Periode: {new Date(report.periodStart).toLocaleDateString("id-ID", { day: 'numeric', month: 'short'})} - {new Date(report.periodEnd).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                      )}
                    </div>
                    
                    {(report.status === "submitted" || report.status === "accepted") && (
                      <div className={cn("mt-2 text-xs border-l-2 pl-2", report.status === "accepted" ? "border-success/50" : "border-amber-300")}>
                        <p className="font-medium">Nilai dilaporkan: <span className={cn("text-sm", report.status === "accepted" ? "text-success" : "text-amber-600")}>{report.value}</span> {metric}</p>
                        {report.notes && <p className="text-muted-foreground mt-0.5 line-clamp-1 italic">&quot;{report.notes}&quot;</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">Oleh {report.submittedByName} pada {new Date(report.submittedAt!).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0">
                    {isReadOnlyForOrg(user, organizationId) ? (
                      <Badge variant="secondary" className="text-xs">Read Only</Badge>
                    ) : (report.status === "pending" || report.status === "overdue") ? (
                      (() => {
                        const submissionCheck = isWithinSubmissionWindow(report.periodEnd);
                        if (!submissionCheck.allowed) {
                          return (
                            <div className="flex flex-col items-end gap-1">
                              <Button 
                                size="sm" 
                                variant={report.status === "overdue" ? "destructive" : "default"}
                                disabled
                                className="opacity-50 cursor-not-allowed"
                              >
                                Lapor Nilai
                              </Button>
                              <span className="text-[10px] text-muted-foreground text-right max-w-[200px]">
                                {submissionCheck.message}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <Button 
                            size="sm" 
                            variant={report.status === "overdue" ? "destructive" : "default"}
                            onClick={() => {
                              setReportToSubmit(report);
                              setSubmitValue("");
                              setSubmitNotes("");
                              setShowValidationErrors(false);
                            }}
                          >
                            Lapor Nilai
                          </Button>
                        );
                      })()
                    ) : report.status === "submitted" ? (
                      <div className="text-xs font-semibold text-amber-600 flex items-center gap-1 bg-amber-100 px-3 py-1.5 rounded-full">
                        <Clock className="size-3.5" /> Menunggu Review
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-success flex items-center gap-1 bg-success/10 px-3 py-1.5 rounded-full">
                        <CheckCircle className="size-3.5" /> Diterima
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Dialog */}
      <Dialog open={!!reportToSubmit} onOpenChange={(open) => !open && setReportToSubmit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lapor Nilai KRI</DialogTitle>
            <DialogDescription>
              Masukkan nilai KRI untuk periode {reportToSubmit?.periodLabel}. Ini akan otomatis memperbarui nilai KRI saat ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">Nilai KRI ({metric})<span className="text-destructive ml-0.5">*</span></Label>
              <Input 
                id="value" 
                type="number" 
                step="0.01" 
                placeholder="Contoh: 12.5" 
                value={submitValue}
                onChange={(e) => setSubmitValue(e.target.value)}
                aria-invalid={Boolean(showValidationErrors && formErrors.value)}
                aria-describedby={showValidationErrors && formErrors.value ? "kri-value-error" : undefined}
              />
              {showValidationErrors && formErrors.value && (
                <p id="kri-value-error" className="text-[11px] text-destructive">
                  {formErrors.value}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan / Keterangan</Label>
              <Textarea 
                id="notes" 
                placeholder="Jika ada lonjakan atau penurunan, jelaskan alasannya di sini..."
                rows={3}
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                aria-invalid={Boolean(showValidationErrors && formErrors.notes)}
                aria-describedby={showValidationErrors && formErrors.notes ? "kri-notes-error" : undefined}
              />
              {showValidationErrors && formErrors.notes && (
                <p id="kri-notes-error" className="text-[11px] text-destructive">
                  {formErrors.notes}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportToSubmit(null)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting || hasFormErrors}>
                {isSubmitting ? "Menyimpan..." : "Submit Laporan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
