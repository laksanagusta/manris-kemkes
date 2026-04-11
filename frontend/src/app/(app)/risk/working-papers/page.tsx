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

import { Card } from "@/components/ui/card";
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
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat daftar kertas kerja...</div>;
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

  return (
    <div className="space-y-6 animate-fade-in">
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
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                  Tidak ada kertas kerja yang ditemukan
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
                    <TableCell className="max-w-[200px]">
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
                          "text-[10px] font-semibold border h-5 px-1.5",
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
                          <span className="text-[10px] text-muted-foreground">{progressText}</span>
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
