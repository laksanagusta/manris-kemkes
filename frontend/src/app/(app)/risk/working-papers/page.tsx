"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { 
  listWorkingPapers, 
  deleteWorkingPaper, 
  cancelWorkingPaper 
} from "@/lib/api/working-papers";
import type { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  FileText,
  FileEdit,
  PenTool,
  CheckCircle,
  XCircle,
} from "lucide-react";

const statusVariant: Record<WorkingPaperStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  signing: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  completed: "bg-success/15 text-success border-success/20",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
};

const statusLabels: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses TTE",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function WorkingPapersPage() {
  const { token } = useAuth();
  
  const [papers, setPapers] = useState<WorkingPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [paperToDelete, setPaperToDelete] = useState<WorkingPaper | null>(null);
  const [paperToCancel, setPaperToCancel] = useState<WorkingPaper | null>(null);

  const fetchWorkingPapers = async (activeToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await listWorkingPapers(activeToken, {
        status: statusFilter === "all" ? undefined : statusFilter,
        page,
        limit,
      });
      setPapers(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Gagal memuat daftar kertas kerja. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkingPapers(token);
    }
  }, [token, statusFilter, page, limit]);

  const handleDelete = async () => {
    if (!paperToDelete || !token) return;
    toast.promise(
      (async () => {
        await deleteWorkingPaper(paperToDelete.id, token);
        await fetchWorkingPapers(token);
        setPaperToDelete(null);
      })(),
      {
        loading: "Menghapus kertas kerja...",
        success: "Kertas kerja berhasil dihapus.",
        error: (err) => err instanceof Error ? err.message : "Gagal menghapus kertas kerja.",
      }
    );
  };

  const handleCancel = async () => {
    if (!paperToCancel || !token) return;
    toast.promise(
      (async () => {
        await cancelWorkingPaper(paperToCancel.id, token);
        await fetchWorkingPapers(token);
        setPaperToCancel(null);
      })(),
      {
        loading: "Membatalkan kertas kerja...",
        success: "Kertas kerja berhasil dibatalkan.",
        error: (err) => err instanceof Error ? err.message : "Gagal membatalkan kertas kerja.",
      }
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  if (loading && papers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded-md bg-muted/60 animate-pulse" />
          </div>
          <div className="h-9 w-36 rounded-md bg-muted animate-pulse" />
        </div>
        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardContent className="p-4 space-y-2">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-7 w-10 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Table skeleton */}
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <div className="p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/20 last:border-0">
                <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-4 w-8 rounded bg-muted/60 animate-pulse" />
                <div className="h-1.5 w-16 rounded bg-muted animate-pulse" />
                <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Gagal Memuat Data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
            <ArrowUpRight className="size-4" />
            Muat Ulang Halaman
          </Button>
        </div>
      </div>
    );
  }

  const draftCount = papers.filter((p) => p.status === "draft").length;
  const signingCount = papers.filter((p) => p.status === "signing").length;
  const completedCount = papers.filter((p) => p.status === "completed").length;
  const cancelledCount = papers.filter((p) => p.status === "cancelled").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kertas Kerja</h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar kertas kerja untuk proses pengesahan profil risiko
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/risk/working-papers/new">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              Buat Kertas Kerja
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Total</p>
              <FileText className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Draft</p>
              <FileEdit className="size-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{draftCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Proses TTE</p>
              <PenTool className="size-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold mt-2">{signingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Selesai</p>
              <CheckCircle className="size-4 text-success" />
            </div>
            <p className="text-2xl font-bold mt-2">{completedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium">Dibatalkan</p>
              <XCircle className="size-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold mt-2">{cancelledCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Tabs value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
        <TabsList className="bg-muted/40 border border-border/50">
          <TabsTrigger value="all" className="gap-2 text-xs">Semua</TabsTrigger>
          <TabsTrigger value="draft" className="gap-2 text-xs">Draft</TabsTrigger>
          <TabsTrigger value="signing" className="gap-2 text-xs">Proses TTE</TabsTrigger>
          <TabsTrigger value="completed" className="gap-2 text-xs">Selesai</TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-2 text-xs">Dibatalkan</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs">Judul</TableHead>
              <TableHead className="text-xs w-28">Siklus Asesmen</TableHead>
              <TableHead className="text-xs w-28">Status</TableHead>
              <TableHead className="text-xs text-center w-28">Jumlah Risiko</TableHead>
              <TableHead className="text-xs text-center w-32">Progres TTE</TableHead>
              <TableHead className="text-xs w-32">Dibuat Pada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
                      <FileText className="size-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Belum ada kertas kerja</p>
                      <p className="text-sm text-muted-foreground">Buat kertas kerja baru untuk memulai proses pengesahan profil risiko.</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/risk/working-papers/new">Buat Kertas Kerja</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              papers.map((wp) => {
                const signedCount = wp.signatories?.filter((s) => s.status === 'signed').length || 0;
                const totalSignatories = wp.signatories?.length || 0;
                const progressPercent = totalSignatories > 0 ? (signedCount / totalSignatories) * 100 : 0;
                const progressText = totalSignatories > 0 ? `${signedCount}/${totalSignatories}` : "-";
                const date = new Date(wp.created_at).toLocaleDateString("id-ID", {
                  year: "numeric", month: "short", day: "numeric",
                });

                return (
                  <TableRow key={wp.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                    <TableCell className="max-w-[320px]">
                      <Link
                        href={`/risk/working-papers/${wp.id}`}
                        className="block truncate text-xs font-medium leading-relaxed text-primary transition-colors hover:text-primary/80 hover:underline"
                        title={wp.title}
                      >
                        {wp.title || "Tanpa Judul"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {wp.assessment_cycle || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-xs font-semibold border h-5 px-1.5",
                          statusVariant[wp.status]
                        )}
                      >
                        {statusLabels[wp.status] || wp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium">
                      {wp.risks?.length || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {totalSignatories > 0 ? (
                        <div className="flex flex-col items-center gap-1">
                          <Progress value={progressPercent} className="w-16 h-1.5" />
                          <span className="text-xs text-muted-foreground">{progressText}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {date}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} kertas kerja
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">Halaman {page} dari {totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              disabled={page === totalPages || total === 0}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>
      </div>

      <AlertDialog open={!!paperToDelete} onOpenChange={(open) => !open && setPaperToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kertas Kerja?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus draft kertas kerja "{paperToDelete?.title}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!paperToCancel} onOpenChange={(open) => !open && setPaperToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Kertas Kerja?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan kertas kerja "{paperToCancel?.title}"? Kertas kerja yang dibatalkan tidak dapat dilanjutkan proses TTE-nya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
