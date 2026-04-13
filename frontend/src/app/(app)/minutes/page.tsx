"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { deleteMeetingMinute, listMeetingMinutes } from "@/lib/meeting-minutes";
import type { MeetingMinute } from "@/types/meeting-minute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DEFAULT_LIMIT = 20;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export default function MinutesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<MeetingMinute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [createdAtFilter, setCreatedAtFilter] = useState(
    () => searchParams.get("created_at") ?? "",
  );
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT),
  );

  const [minuteToDelete, setMinuteToDelete] = useState<MeetingMinute | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const totalPages = Math.ceil(total / limit) || 1;

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((minute) => {
      const haystack = [
        minute.title,
        minute.summary,
        minute.createdByName,
        ...(minute.participants || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [items, query]);

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? "";
    const nextCreatedAt = searchParams.get("created_at") ?? "";
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );

    setQuery((c) => (c === nextQuery ? c : nextQuery));
    setCreatedAtFilter((c) => (c === nextCreatedAt ? c : nextCreatedAt));
    setPage((c) => (c === nextPage ? c : nextPage));
    setLimit((c) => (c === nextLimit ? c : nextLimit));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      nextParams.set("q", normalizedQuery);
    } else {
      nextParams.delete("q");
    }

    const normalizedCreatedAt = createdAtFilter.trim();
    if (normalizedCreatedAt) {
      nextParams.set("created_at", normalizedCreatedAt);
    } else {
      nextParams.delete("created_at");
    }

    if (page === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", page.toString());
    }

    if (limit === DEFAULT_LIMIT) {
      nextParams.delete("limit");
    } else {
      nextParams.set("limit", limit.toString());
    }

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (nextUrl === currentUrl) return;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [query, createdAtFilter, page, limit, pathname, router, searchParams, startTransition]);

  useEffect(() => {
    if (!token) return;

    const offset = (page - 1) * limit;

    setLoading(true);
    listMeetingMinutes({ limit, offset, createdAt: createdAtFilter.trim() || undefined }, token)
      .then((result) => {
        setItems(result.items || []);
        setTotal(result.total ?? 0);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Daftar notulen belum berhasil dimuat.");
      })
      .finally(() => setLoading(false));
  }, [token, page, limit, createdAtFilter]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [createdAtFilter]);

  const handleDelete = async () => {
    if (!token || !minuteToDelete) return;

    setIsDeleting(true);
    try {
      await deleteMeetingMinute(minuteToDelete.id, token);
      setItems((current) =>
        current.filter((item) => item.id !== minuteToDelete.id),
      );
      setTotal((current) => Math.max(0, current - 1));
      toast.success("Notulen berhasil dihapus.");
      setMinuteToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus notulen.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="border-border/70 text-[10px] uppercase tracking-[0.18em]"
          >
            Meeting
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Daftar Notulen
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Kelola hasil notulen rapat yang sudah disimpan, lalu buka detail
              atau buat notulen baru dari transkrip rapat.
            </p>
          </div>
        </div>

        <Button
          className="gap-2 text-xs"
          onClick={() => router.push("/minutes/new")}
        >
          <Plus className="size-3.5" /> Buat dari Transkrip
        </Button>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardHeader className="border-b border-border/50 pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" /> Notulen Tersimpan
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari judul, ringkasan, peserta..."
                className="pl-9"
              />
            </div>
            <div className="relative w-full md:w-52">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={createdAtFilter}
                onChange={(event) => setCreatedAtFilter(event.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : total === 0 && !query.trim() && !createdAtFilter.trim() ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/[0.12] px-6 py-12 text-center">
              <p className="text-base font-medium text-foreground">
                Belum ada notulen tersimpan
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Mulai dari transkrip rapat lalu simpan hasil notulennya agar
                muncul di daftar ini.
              </p>
              <Button
                className="mt-5 gap-2 text-xs"
                onClick={() => router.push("/minutes/new")}
              >
                <Plus className="size-3.5" /> Buat Notulen
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/[0.12] px-6 py-12 text-center">
              <p className="text-base font-medium text-foreground">
                Tidak ada notulen yang cocok
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Coba kata kunci lain atau kosongkan pencarian untuk melihat
                semua notulen.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-24 text-xs">Kode</TableHead>
                  <TableHead className="text-xs">Judul Notulen</TableHead>
                  <TableHead className="text-xs w-32">Tanggal</TableHead>
                  <TableHead className="text-xs w-20 text-center">
                    Peserta
                  </TableHead>
                  <TableHead className="text-xs w-36">Dibuat Oleh</TableHead>
                  <TableHead className="text-xs w-20 text-right">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((minute) => (
                  <TableRow
                    key={minute.id}
                    className="border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {minute.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <Link
                        href={`/minutes/${minute.id}`}
                        className="block truncate text-xs font-medium leading-relaxed text-primary transition-colors hover:text-primary/80 hover:underline"
                      >
                        {minute.title || "-"}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {minute.summary || "Belum ada ringkasan"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(minute.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-center text-muted-foreground">
                      {minute.participants?.length || 0}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {minute.createdByName || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {!isReadOnlyForOrg(
                          user,
                          minute.organizationId || "",
                        ) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setMinuteToDelete(minute)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {total > 0 && (
            <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Menampilkan{" "}
                {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, total)} dari {total} notulen
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  disabled={page === 1 || loading || isPending}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="px-2 text-xs font-medium text-primary">
                  {page}
                </span>
                <span className="text-xs text-muted-foreground">
                  dari {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  disabled={
                    page === totalPages || total === 0 || loading || isPending
                  }
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!minuteToDelete}
        onOpenChange={(open) => !open && setMinuteToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Notulen?</DialogTitle>
            <DialogDescription>
              Notulen yang dihapus tidak bisa dikembalikan. Tindakan ini juga
              akan menghapus relasinya dari log risiko terkait.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">
              {minuteToDelete?.title || "Tanpa judul"}
            </p>
            <p className="text-xs text-muted-foreground">
              {minuteToDelete?.id || "-"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMinuteToDelete(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}{" "}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
