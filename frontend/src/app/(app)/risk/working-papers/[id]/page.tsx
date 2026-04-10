"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  WorkingPaper,
  WorkingPaperSignatory,
  WorkingPaperStatus,
} from "@/types/working-paper";
import {
  getWorkingPaper,
  signWorkingPaper,
  cancelWorkingPaper,
  deleteWorkingPaper,
} from "@/lib/api/working-papers";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Download,
  FileSignature,
  FileText,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

const statusVariant: Record<WorkingPaperStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  signing: "bg-amber-500/15 text-amber-700 border-amber-500/20",
  completed: "bg-success/15 text-success border-success/20",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const statusLabel: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses Tanda Tangan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi": "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

export default function WorkingPaperDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { id } = params;
  const router = useRouter();
  const { token, user } = useAuth();
  
  const [data, setData] = useState<WorkingPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getWorkingPaper(id, token!);
      setData(res);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal memuat detail Kertas Kerja.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      const { exportWorkingPaper } = await import("@/lib/working-paper-export").catch(() => {
        throw new Error("Fitur ekspor Excel belum tersedia.");
      });
      await exportWorkingPaper(data);
      toast.success("Kertas Kerja berhasil diekspor.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengekspor Kertas Kerja.");
    }
  };

  const handleSign = async () => {
    if (!token || !data) return;
    try {
      await signWorkingPaper(id, token);
      toast.success("Berhasil menandatangani Kertas Kerja.");
      setSignDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandatangani Kertas Kerja.");
    }
  };

  const handleCancel = async () => {
    if (!token || !data) return;
    try {
      await cancelWorkingPaper(id, token);
      toast.success("Kertas Kerja berhasil dibatalkan.");
      setCancelDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan Kertas Kerja.");
    }
  };

  const handleDelete = async () => {
    if (!token || !data) return;
    try {
      await deleteWorkingPaper(id, token);
      toast.success("Kertas Kerja berhasil dihapus.");
      setDeleteDialogOpen(false);
      router.push("/risk/working-papers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus Kertas Kerja.");
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Hash disalin ke clipboard");
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Memuat detail Kertas Kerja...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
          <ShieldAlert className="w-6 h-6 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold">Gagal Memuat Data</h3>
        <p className="text-sm text-muted-foreground max-w-md text-center">{error}</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Kembali
        </Button>
      </div>
    );
  }

  const { signatories, status, current_signatory_sequence } = data;
  
  const nextSignatory = signatories.find(
    (s) => s.sequence_no === current_signatory_sequence + 1 && s.status === 'pending'
  );

  const canSign = user && nextSignatory && nextSignatory.user_id === user.id && (status === 'draft' || status === 'signing');
  const canCancel = status === 'draft' || status === 'signing';
  const canDelete = status === 'draft';

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span>Detail Kertas Kerja</span>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm relative overflow-hidden">
        {status === 'completed' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-success" />
        )}
        {status === 'cancelled' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-destructive" />
        )}
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {data.title}
              </CardTitle>
              <Badge className={cn("capitalize px-2 py-0.5", statusVariant[status])}>
                {statusLabel[status]}
              </Badge>
            </div>
            {data.description && (
              <CardDescription className="text-sm max-w-2xl text-foreground/80">
                {data.description}
              </CardDescription>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Dibuat: {new Date(data.created_at).toLocaleDateString('id-ID', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}</span>
              </div>
              {data.assessment_cycle && (
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Siklus: {data.assessment_cycle}</span>
                </div>
              )}
            </div>
            {data.document_hash && (
              <div className="flex items-center gap-2 text-xs font-mono bg-muted/30 px-2 py-1 rounded w-fit mt-3 border border-border/50">
                <span className="text-muted-foreground">Hash:</span>
                <span>{data.document_hash.substring(0, 16)}...</span>
                <button 
                  onClick={() => copyHash(data.document_hash!)}
                  className="hover:text-primary transition-colors p-1"
                  title="Salin Hash Dokumen"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" size="sm" className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700" onClick={() => setCancelDialogOpen(true)}>
                <XCircle className="w-4 h-4 mr-2" />
                Batalkan
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Ekspor Excel
            </Button>
          </div>
        </CardHeader>
        {status === 'cancelled' && data.cancelled_at && (
          <div className="bg-destructive/10 text-destructive text-sm px-6 py-3 border-y border-destructive/20 flex items-center gap-2 font-medium">
            <XCircle className="w-4 h-4" />
            Kertas Kerja ini telah dibatalkan pada {new Date(data.cancelled_at).toLocaleString('id-ID')}
          </div>
        )}
        {status === 'completed' && (
          <div className="bg-success/10 text-success-foreground text-sm px-6 py-3 border-y border-success/20 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Kertas Kerja telah selesai ditandatangani oleh semua pihak.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  Risiko dalam Kertas Kerja
                </CardTitle>
                <Badge variant="secondary" className="font-mono">
                  {data.risk_snapshots.length} Risiko
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="w-24 text-xs">Kode</TableHead>
                    <TableHead className="text-xs">Judul Risiko</TableHead>
                    <TableHead className="text-xs">Kategori</TableHead>
                    <TableHead className="text-xs text-center">P</TableHead>
                    <TableHead className="text-xs text-center">D</TableHead>
                    <TableHead className="text-xs text-center">Nilai</TableHead>
                    <TableHead className="text-xs w-28">Tingkat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.risk_snapshots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Tidak ada data risiko.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.risk_snapshots.map((risk, index) => {
                      const levelLabel = risk.tingkat_risiko || "Rendah";
                      const badgeCls = levelBadgeVariant[levelLabel] || levelBadgeVariant["Rendah"];
                      
                      return (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="text-center text-xs text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{risk.code || "-"}</TableCell>
                          <TableCell className="text-xs font-medium max-w-[200px] truncate" title={risk.title}>
                            {risk.title}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px] capitalize">
                            {risk.category ? risk.category.replace(/_/g, ' ') : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs">{risk.probability || '-'}</TableCell>
                          <TableCell className="text-center text-xs">{risk.impact || '-'}</TableCell>
                          <TableCell className="text-center text-xs font-semibold">{risk.nilai || '-'}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px] font-semibold border px-1.5 h-5", badgeCls)}>
                              {levelLabel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm sticky top-6">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-primary" />
                Status Tanda Tangan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {status === 'draft' && current_signatory_sequence === 0 && (
                <div className="text-sm text-muted-foreground mb-6 text-center italic bg-muted/30 p-3 rounded-lg border border-border/50">
                  Belum ada tanda tangan. Dokumen ini masih berupa draft.
                </div>
              )}

              <div className="space-y-6 relative ml-2">
                {signatories.map((sig, index) => {
                  const isSigned = sig.status === 'signed';
                  const isCurrent = !isSigned && sig.sequence_no === current_signatory_sequence + 1;
                  const isFuture = !isSigned && !isCurrent;
                  
                  const isLast = index === signatories.length - 1;

                  return (
                    <div key={sig.id} className={cn(
                      "flex gap-4 relative",
                      isFuture && "opacity-60"
                    )}>
                      {!isLast && (
                        <div className={cn(
                          "absolute top-8 left-[11px] bottom-[-24px] w-0.5 z-0",
                          isSigned ? "bg-success" : "bg-border"
                        )} />
                      )}

                      <div className={cn(
                        "relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-background mt-0.5",
                        isSigned ? "border-success text-success" : 
                        isCurrent ? "border-primary text-primary ring-4 ring-primary/10" : 
                        "border-muted-foreground text-muted-foreground"
                      )}>
                        {isSigned ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isCurrent ? (
                          <Circle className="w-2.5 h-2.5 fill-current" />
                        ) : (
                          <Circle className="w-2 h-2" />
                        )}
                      </div>

                      <div className="flex-1 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={cn(
                              "text-sm font-semibold",
                              isCurrent ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {sig.signer_role_label}
                            </h4>
                            <p className="text-xs font-medium text-foreground mt-0.5">{sig.signer_name}</p>
                            <p className="text-[10px] text-muted-foreground">{sig.signer_title}</p>
                            {sig.signer_nip && (
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">NIP: {sig.signer_nip}</p>
                            )}
                          </div>
                          
                          {isSigned && sig.qr_code_png && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="shrink-0 overflow-hidden rounded-md border border-border/50 hover:border-primary/50 transition-colors shadow-sm bg-white p-1">
                                  <img 
                                    src={sig.qr_code_png.startsWith('data:') ? sig.qr_code_png : `data:image/png;base64,${sig.qr_code_png}`} 
                                    alt="QR Code" 
                                    className="w-10 h-10 object-contain"
                                  />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-8">
                                <h3 className="text-lg font-bold mb-2 text-center">QR Code Tanda Tangan Elektronik</h3>
                                <p className="text-sm text-muted-foreground text-center mb-6">
                                  {sig.signer_name} - {sig.signer_role_label}
                                </p>
                                <div className="bg-white p-4 rounded-xl border shadow-sm">
                                  <img 
                                    src={sig.qr_code_png.startsWith('data:') ? sig.qr_code_png : `data:image/png;base64,${sig.qr_code_png}`} 
                                    alt="QR Code Besar" 
                                    className="w-48 h-48 object-contain"
                                  />
                                </div>
                                {sig.signed_at && (
                                  <p className="text-xs text-muted-foreground mt-6 text-center">
                                    Ditandatangani pada:<br/>
                                    {new Date(sig.signed_at).toLocaleString('id-ID')}
                                  </p>
                                )}
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>

                        <div className="mt-2">
                          {isSigned ? (
                            <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {sig.signed_at ? new Date(sig.signed_at).toLocaleString('id-ID') : 'Telah ditandatangani'}
                            </div>
                          ) : isCurrent ? (
                            status !== 'cancelled' ? (
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5">
                                Menunggu tanda tangan
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                                Dibatalkan
                              </Badge>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canSign && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                    <p className="text-sm font-medium mb-3">Giliran Anda Menandatangani</p>
                    <Button 
                      className="w-full shadow-md shadow-primary/20 gap-2" 
                      onClick={() => setSignDialogOpen(true)}
                    >
                      <FileSignature className="w-4 h-4" />
                      Tanda Tangani
                    </Button>
                  </div>
                </div>
              )}

              {!canSign && status !== 'completed' && status !== 'cancelled' && nextSignatory && (
                <div className="mt-6 pt-6 border-t border-border/50">
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Menunggu tanda tangan dari:<br/>
                      <span className="font-semibold text-foreground mt-1 block">
                        {nextSignatory.signer_name}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      
      <AlertDialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tanda Tangani Kertas Kerja?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 mt-2">
                <p>
                  Anda akan menandatangani Kertas Kerja ini sebagai <strong>{nextSignatory?.signer_role_label}</strong>.
                </p>
                <div className="bg-muted/50 p-3 rounded-md text-xs border border-border/50">
                  Dengan menandatangani dokumen ini, Anda memverifikasi bahwa risiko-risiko yang tercantum telah ditinjau dan disetujui. Tanda tangan akan dilakukan secara elektronik menggunakan QR code yang dapat diverifikasi keasliannya.
                </div>
                <p>Tindakan ini tidak dapat dibatalkan. Lanjutkan?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign} className="gap-2">
              <FileSignature className="w-4 h-4" />
              Ya, Tanda Tangani
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Batalkan Kertas Kerja?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kertas Kerja yang dibatalkan tidak dapat ditandatangani lagi. Semua proses tanda tangan yang sedang berjalan akan dihentikan. Tindakan ini permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-amber-600 hover:bg-amber-700 text-white">
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Hapus Kertas Kerja Permanen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus draft Kertas Kerja secara permanen dari sistem. Anda tidak akan bisa mengembalikannya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
