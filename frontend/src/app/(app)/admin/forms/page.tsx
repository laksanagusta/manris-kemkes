"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { fetchForms, publishForm, closeForm, deleteForm } from "@/lib/api/forms";
import type { Form, FormStatus } from "@/types/form";
import { toast } from "sonner";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit3,
  Trash2,
  Send,
  BarChart3,
  ClipboardList,
  Lock,
  FileText,
} from "lucide-react";

const statusBadgeClasses: Record<FormStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  closed: "bg-destructive/15 text-destructive border-destructive/20",
};

const statusLabels: Record<FormStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

type ConfirmAction =
  | { type: "publish"; form: Form }
  | { type: "close"; form: Form }
  | { type: "delete"; form: Form };

const confirmConfig: Record<
  ConfirmAction["type"],
  { title: string; description: string; actionLabel: string; variant: "default" | "destructive" }
> = {
  publish: {
    title: "Publish Formulir?",
    description: "Formulir yang dipublish akan dapat diakses oleh pengguna yang ditargetkan. Pastikan semua field dan section sudah sesuai.",
    actionLabel: "Publish",
    variant: "default",
  },
  close: {
    title: "Tutup Formulir?",
    description: "Formulir yang ditutup tidak akan menerima respons baru. Respons yang sudah ada tetap tersimpan.",
    actionLabel: "Tutup Formulir",
    variant: "destructive",
  },
  delete: {
    title: "Hapus Formulir?",
    description: "Formulir yang dihapus tidak dapat dikembalikan. Pastikan Anda yakin sebelum menghapus.",
    actionLabel: "Hapus",
    variant: "destructive",
  },
};

export default function AdminFormsPage() {
  const { token } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadForms = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters = statusFilter !== "all" ? { status: statusFilter } : undefined;
      const data = await fetchForms(token, filters);
      setForms(data);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat daftar formulir.");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleConfirmAction = async () => {
    if (!confirmAction || !token) return;
    setActionLoading(true);
    try {
      switch (confirmAction.type) {
        case "publish":
          await publishForm(confirmAction.form.id, {}, token);
          toast.success(`Formulir "${confirmAction.form.title}" berhasil dipublish.`);
          break;
        case "close":
          await closeForm(confirmAction.form.id, token);
          toast.success(`Formulir "${confirmAction.form.title}" berhasil ditutup.`);
          break;
        case "delete":
          await deleteForm(confirmAction.form.id, token);
          toast.success(`Formulir "${confirmAction.form.title}" berhasil dihapus.`);
          break;
      }
      setConfirmAction(null);
      await loadForms();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Aksi gagal dilakukan."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const audienceLabel = (audience: string) => {
    return audience === "all" ? "Semua Unit" : "Unit Tertentu";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Form Builder</h1>
          <p className="text-sm text-muted-foreground">
            Kelola formulir dinamis untuk pengumpulan data
          </p>
        </div>
        <Link href="/admin/forms/new">
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="size-4" />
            Buat Formulir Baru
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-40 text-xs bg-muted/30 border-none">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs">Judul Formulir</TableHead>
              <TableHead className="text-xs w-28">Status</TableHead>
              <TableHead className="text-xs w-32">Target Audiens</TableHead>
              <TableHead className="text-xs w-32">Dibuat</TableHead>
              <TableHead className="text-xs w-56 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/30">
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-40 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : forms.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="size-8 text-muted-foreground/50" />
                    <p className="text-sm">Belum ada formulir</p>
                    <p className="text-xs text-muted-foreground/70">
                      Klik &quot;Buat Formulir Baru&quot; untuk memulai
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => (
                <TableRow
                  key={form.id}
                  className="border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="max-w-[300px]">
                    <span className="text-sm font-medium truncate block">
                      {form.title}
                    </span>
                    {form.description && (
                      <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {form.description}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "text-[10px] font-semibold border h-5 px-1.5 capitalize",
                        statusBadgeClasses[form.status]
                      )}
                    >
                      {statusLabels[form.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {audienceLabel(form.targetAudience)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(form.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {form.status === "draft" && (
                        <Link href={`/admin/forms/${form.id}/edit`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 px-2 text-xs"
                          >
                            <Edit3 className="size-3" />
                            Edit
                          </Button>
                        </Link>
                      )}

                      {(form.status === "published" || form.status === "closed") && (
                        <>
                          <Link href={`/admin/forms/${form.id}/responses`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 px-2 text-xs"
                            >
                              <ClipboardList className="size-3" />
                              Respons
                            </Button>
                          </Link>
                          <Link href={`/admin/forms/${form.id}/analytics`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1.5 px-2 text-xs"
                            >
                              <BarChart3 className="size-3" />
                              Analytics
                            </Button>
                          </Link>
                        </>
                      )}

                      {form.status === "draft" && (
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setConfirmAction({ type: "publish", form })}
                        >
                          <Send className="size-3" />
                          Publish
                        </Button>
                      )}

                      {form.status === "published" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmAction({ type: "close", form })}
                        >
                          <Lock className="size-3" />
                          Tutup
                        </Button>
                      )}

                      {form.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmAction({ type: "delete", form })}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!loading && forms.length > 0 && (
          <div className="border-t border-border/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {forms.length} formulir
            </p>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        {confirmAction && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmConfig[confirmAction.type].title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmConfig[confirmAction.type].description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{confirmAction.form.title}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Status: {statusLabels[confirmAction.form.status]}
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                variant={confirmConfig[confirmAction.type].variant}
                disabled={actionLoading}
                onClick={handleConfirmAction}
              >
                {actionLoading
                  ? "Memproses..."
                  : confirmConfig[confirmAction.type].actionLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
