"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  Loader2,
  Plus,
  Trash2,
} from "@/components/ui/icons";

import { useAuth } from "@/contexts/auth-context";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import {
  AccentButton,
  CollectionPageHeader,
  CollectionEmptyState,
  ExpandableSearchField,
  CollectionLoadingState,
  CollectionPagination,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  PageStack,
} from "@/components/shared/design-system";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { deleteMeetingMinute, listMeetingMinutes } from "@/lib/meeting-minutes";
import type { MeetingMinute } from "@/types/meeting-minute";
import { Button } from "@/components/ui/button";
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
  TableRow,
} from "@/components/ui/table";

const DEFAULT_LIMIT = 20;

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export default function MinutesPage() {
  if (isAIFeaturesDisabled()) {
    return (
      <AIFeaturesDisabledState
        title="Meeting Dinonaktifkan"
        description="Daftar notulen dan workflow meeting intelligence sedang dimatikan melalui environment frontend."
      />
    );
  }

  return <MinutesPageContent />;
}

function MinutesPageContent() {
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
        const sorted = [...(result.items || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setItems(sorted);
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
    <PageStack>
      <CollectionPageHeader title="Meeting" />

      <CollectionToolbar
        leading={
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <ExpandableSearchField
              value={query}
              onChange={setQuery}
              placeholder="Cari judul, ringkasan, peserta..."
              ariaLabel="Cari notulen"
            />
            <div className="relative w-full sm:w-40">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={createdAtFilter}
                onChange={(event) => setCreatedAtFilter(event.target.value)}
                aria-label="Filter tanggal dibuat"
                className="h-10 bg-card pl-9 text-sm ring-1 ring-inset ring-border/40"
              />
            </div>
          </div>
        }
        actions={
          <AccentButton
            icon={<Plus className="size-3.5" />}
            onClick={() => router.push("/minutes/new")}
          >
            Buat dari Transkrip
          </AccentButton>
        }
      />

      <CollectionTableCard>
        {loading ? (
          <CollectionLoadingState message="Memuat daftar notulen..." />
        ) : total === 0 && !query.trim() && !createdAtFilter.trim() ? (
          <>
            <CollectionEmptyState
              title="Belum ada notulen tersimpan"
              description="Mulai dari transkrip rapat lalu simpan hasil notulennya agar muncul di daftar ini."
            />
            <div className="px-4 pb-4">
              <AccentButton
                icon={<Plus className="size-3.5" />}
                onClick={() => router.push("/minutes/new")}
              >
                Buat Notulen
              </AccentButton>
            </div>
          </>
        ) : filteredItems.length === 0 ? (
          <CollectionEmptyState
            title="Tidak ada notulen yang cocok"
            description="Coba kata kunci lain atau kosongkan pencarian untuk melihat semua notulen."
          />
        ) : (
          <Table className="min-w-[760px] table-fixed">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[37%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-[8%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                <CollectionTableHead className="pl-4 pr-3">Kode</CollectionTableHead>
                <CollectionTableHead className="px-3">Judul Notulen</CollectionTableHead>
                <CollectionTableHead className="px-3">Tanggal</CollectionTableHead>
                <CollectionTableHead className="px-3 text-center">Peserta</CollectionTableHead>
                <CollectionTableHead className="px-3">Dibuat Oleh</CollectionTableHead>
                <CollectionTableHead className="px-3 text-center">Aksi</CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {filteredItems.map((minute) => (
                <TableRow key={minute.id} className="border-0 hover:bg-muted/50">
                  <TableCell className="py-2 pl-4 pr-3 text-sm text-muted-foreground">
                    {minute.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="max-w-[320px] px-3 py-2">
                    <Link
                      href={`/minutes/${minute.id}`}
                      className="block truncate text-sm font-normal leading-relaxed text-foreground hover:text-primary"
                    >
                      {minute.title || "-"}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {minute.summary || "Belum ada ringkasan"}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground">
                    {new Date(minute.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-center text-sm tabular-nums text-muted-foreground">
                    {minute.participants?.length || 0}
                  </TableCell>
                  <TableCell className="truncate px-3 py-2 text-sm text-muted-foreground">
                    {minute.createdByName || "-"}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-background px-3 py-2">
                    <div className="flex justify-center">
                      {!isReadOnlyForOrg(user, minute.organizationId || "") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Hapus notulen ${minute.title || minute.id}`}
                          className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setMinuteToDelete(minute)}
                        >
                          <Trash2 className="size-3.5" />
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
          <CollectionPagination
            itemLabel="notulen"
            page={page}
            pageSize={limit}
            total={total}
            disabled={loading || isPending}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        )}
      </CollectionTableCard>

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
    </PageStack>
  );
}
