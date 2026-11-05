"use client";
import { useCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { sortDate } from "@/lib/collection-sort";

import { newestCreatedFirst } from "@/lib/collection-created-at";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
} from "@/components/shared/icons";

import { useAuth } from "@/contexts/auth-context";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import {
  AccentButton,
  ActionIconButton,
  CollectionPageHeader,
  CollectionEmptyState,
  CollectionSearchField,
  DynamicTableFilters,
  CollectionLoadingState,
  CollectionPagination,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
  CollectionDialogCancel,
  DestructiveButton,
  PageStack,
} from "@/components/shared/design-system";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { deleteMeetingMinute, listMeetingMinutes } from "@/lib/meeting-minutes";
import type { MeetingMinute } from "@/types/meeting-minute";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        title="MoM Dinonaktifkan"
        description="Daftar notulen dan workflow MoM Intelligence sedang dimatikan melalui environment frontend."
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
  const skipUrlWrite = useRef(false);

  const [items, setItems] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [authorFilter, setAuthorFilter] = useState(() => searchParams.get("author") ?? "all");
  const [dateFilter, setDateFilter] = useState(() => searchParams.get("date") ?? "");
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
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((minute) => {
      if (authorFilter !== "all" && minute.createdBy !== authorFilter) return false;
      if (dateFilter && minute.date.slice(0, 10) !== dateFilter) return false;
      if (!normalized) return true;
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
  }, [items, query, authorFilter, dateFilter]);

  const collectionSort = useCollectionSorting(filteredItems, {"Judul Notulen": r => r.title, "Tanggal": r => sortDate(r.date), "Peserta": r => r.participants?.length ?? 0, "Dibuat Oleh": r => r.createdByName}, () => setPage(1));
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(filteredItems.length / limit)));
  const paginatedItems = collectionSort.rows.slice((visiblePage - 1) * limit, visiblePage * limit);
  const authors = useMemo(() => {
    const names = new Map(items.filter((item) => item.createdBy).map((item) => [item.createdBy, item.createdByName || item.createdBy]));
    if (authorFilter !== "all" && !names.has(authorFilter)) names.set(authorFilter, authorFilter);
    return [...names].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, [items, authorFilter]);

  useEffect(() => {
    skipUrlWrite.current = true;
    const nextQuery = searchParams.get("q") ?? "";
    setAuthorFilter(searchParams.get("author") ?? "all");
    setDateFilter(searchParams.get("date") ?? "");
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    );

    setQuery((c) => (c === nextQuery ? c : nextQuery));
    setPage((c) => (c === nextPage ? c : nextPage));
    setLimit((c) => (c === nextLimit ? c : nextLimit));
  }, [searchParams]);

  useEffect(() => {
    if (skipUrlWrite.current) {
      skipUrlWrite.current = false;
      return;
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      nextParams.set("q", normalizedQuery);
    } else {
      nextParams.delete("q");
    }

    if (authorFilter === "all") nextParams.delete("author");
    else nextParams.set("author", authorFilter);
    if (dateFilter) nextParams.set("date", dateFilter);
    else nextParams.delete("date");

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
  }, [query, authorFilter, dateFilter, page, limit, pathname, router, searchParams, startTransition]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      const rows: MeetingMinute[] = [];
      while (true) {
        const response = await listMeetingMinutes({ limit: 100, offset: rows.length }, token);
        const data = response.items ?? [];
        rows.push(...data);
        if (data.length === 0 || rows.length >= response.total) return rows;
      }
    })()
      .then((rows) => {
        if (cancelled) return;
        setItems(rows.sort(newestCreatedFirst));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        toast.error("Daftar notulen belum berhasil dimuat.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleDelete = async () => {
    if (!token || !minuteToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeetingMinute(minuteToDelete.id, token);
      setItems((current) =>
        current.filter((item) => item.id !== minuteToDelete.id),
      );
      toast.success("Notulen berhasil dihapus.");
      setMinuteToDelete(null);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Notulen belum berhasil dihapus.";
      const actionableMessage = `${message} Coba lagi.`;
      setDeleteError(actionableMessage);
      toast.error(actionableMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageStack>
      <CollectionPageHeader title="MoM" />

      <div className="space-y-4">
      <CollectionToolbar
        leading={
          <DynamicTableFilters
            search={
              <CollectionSearchField
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari judul, ringkasan, peserta..."
                aria-label="Cari notulen"
              />
            }
            fields={[
              {
                id: "author",
                label: "Pembuat",
                value: authorFilter,
                onChange: (value) => {
                  setAuthorFilter(value);
                  setPage(1);
                },
                options: [{ value: "all", label: "Semua pembuat" }, ...authors],
              },
              {
                id: "date",
                label: "Tanggal rapat",
                type: "date",
                defaultValue: "",
                value: dateFilter,
                onChange: (value) => {
                  setDateFilter(value);
                  setPage(1);
                },
              },
            ]}
          />
        }
        actions={
          <AccentButton
            icon={<Plus className="size-3.5" />}
            onClick={() => router.push("/minutes/new")}
          >
            Buat Notulen
          </AccentButton>
        }
      />

      <CollectionTableCard sorting={collectionSort.controls}>
        {loading ? (
          <CollectionLoadingState message="Memuat daftar notulen..." />
        ) : items.length === 0 && !query.trim() && authorFilter === "all" && !dateFilter ? (
          <CollectionEmptyState
            title="Belum ada notulen tersimpan"
            description="Mulai dari transkrip rapat lalu simpan hasil notulennya agar muncul di daftar ini."
          />
        ) : filteredItems.length === 0 ? (
          <CollectionEmptyState
            title="Tidak ada notulen yang cocok"
            description="Coba kata kunci lain atau kosongkan pencarian untuk melihat semua notulen."
          />
        ) : (
          <Table className="min-w-[920px] table-fixed">
            <colgroup>
              <col className="w-[49%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-40" />
<col className="w-[8%]" />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                <CollectionTableHead className="">Judul Notulen</CollectionTableHead>
                <CollectionTableHead >Tanggal</CollectionTableHead>
                <CollectionTableHead className="text-center">Peserta</CollectionTableHead>
                <CollectionTableHead >Dibuat Oleh</CollectionTableHead>
                <CreatedAtHead />
                <CollectionTableHead className="text-center">
                  <span className="sr-only">Aksi</span>
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {paginatedItems.map((minute) => (
                <TableRow key={minute.id} className="hover:bg-muted/50">
                  <TableCell className="max-w-[320px]">
                    <Link
                      href={`/minutes/${minute.id}`}
                      className="block truncate text-sm font-normal leading-relaxed text-foreground hover:text-primary"
                    >
                      {minute.title || "-"}
                    </Link>
                    <p className="mt-0.5 truncate font-mono text-xs text-tertiary-foreground">
                      {minute.id.slice(0, 8)}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(minute.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {minute.participants?.length || 0}
                  </TableCell>
                  <TableCell className="truncate">
                    {minute.createdByName || "-"}
                  </TableCell>
                  <CreatedAtCell record={minute} />
                  <TableCell className="sticky right-0">
                    <div className="flex justify-center">
                      {!isReadOnlyForOrg(user, minute.organizationId || "") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <ActionIconButton
                              className="text-muted-foreground"
                              aria-label={`Opsi notulen ${minute.title || minute.id}`}
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeleteError(null);
                                setMinuteToDelete(minute);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                              Hapus Notulen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {filteredItems.length > 0 && (
          <CollectionPagination
            itemLabel="notulen"
            page={visiblePage}
            pageSize={limit}
            total={filteredItems.length}
            disabled={loading || isPending}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        )}
      </CollectionTableCard>
      </div>

      <Dialog
        open={!!minuteToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setMinuteToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Hapus Notulen?</DialogTitle>
            <DialogDescription>
              Notulen ini akan dihapus permanen beserta relasinya dengan risiko terkait.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-0.5 py-1 text-sm">
            <p className="font-medium">{minuteToDelete?.title || "Tanpa judul"}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {minuteToDelete?.id || "-"}
            </p>
          </div>
          {deleteError ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {deleteError}
            </p>
          ) : null}
          <DialogFooter>
            <CollectionDialogCancel
              onClick={() => {
                setDeleteError(null);
                setMinuteToDelete(null);
              }}
              disabled={isDeleting}
            >
              Batal
            </CollectionDialogCancel>
            <DestructiveButton onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
              ) : null}
              {isDeleting ? "Menghapus..." : "Hapus"}
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}
