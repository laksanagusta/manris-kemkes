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
import { CalendarDays, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeKRIReportPayload, validateKRIReportForm } from "@/lib/validation/reporting";

interface KRIReport {
  id: string;
  kriId: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  value: number | null;
  notes: string;
  status: "pending" | "submitted" | "overdue" | "skipped";
  submittedByName?: string;
  submittedAt?: string;
}

export function KRIReportsList({ kriId, metric }: { kriId: string; metric: string }) {
  const { token } = useAuth();
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
      <Card className="border-border/50 bg-card/80 animate-pulse">
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Memuat jadwal laporan...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card/80">
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
                    "border-success/30 bg-success/5 opacity-80"
                  }`}
                >
                  <div className="space-y-1 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{report.periodLabel}</p>
                      {report.status === "pending" && <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200 bg-yellow-50"><Clock className="size-3 mr-1"/> Pending</Badge>}
                      {report.status === "overdue" && <Badge variant="outline" className="text-xs text-destructive border-destructive/20 bg-destructive/10"><AlertCircle className="size-3 mr-1"/> Terlambat</Badge>}
                      {report.status === "submitted" && <Badge variant="outline" className="text-xs text-success border-success/20 bg-success/10"><CheckCircle className="size-3 mr-1"/> Selesai</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>Tenggat: <strong className={report.status === "overdue" ? "text-destructive" : ""}>{new Date(report.dueDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric'})}</strong></span>
                      {report.periodStart !== report.periodEnd && (
                        <span>Periode: {new Date(report.periodStart).toLocaleDateString("id-ID", { day: 'numeric', month: 'short'})} - {new Date(report.periodEnd).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                      )}
                    </div>
                    
                    {report.status === "submitted" && (
                      <div className="mt-2 text-xs border-l-2 border-success/50 pl-2">
                        <p className="font-medium">Nilai dilaporkan: <span className="text-success text-sm">{report.value}</span> {metric}</p>
                        {report.notes && <p className="text-muted-foreground mt-0.5 line-clamp-1 italic">"{report.notes}"</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">Oleh {report.submittedByName} pada {new Date(report.submittedAt!).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0">
                    {(report.status === "pending" || report.status === "overdue") ? (
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
                    ) : (
                      <div className="text-xs font-semibold text-success flex items-center gap-1 bg-success/10 px-3 py-1.5 rounded-full">
                        <CheckCircle className="size-3.5" /> Berhasil
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
              <Label htmlFor="value">Nilai KRI ({metric}) <span className="text-destructive">*</span></Label>
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
