"use client";
import { useOrganizationFilter } from "@/hooks/use-organization-filter";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { formatDisplayDate } from "@/lib/display-date";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { RiskTableIdentity } from "@/components/shared/design-system/domain/risk-table-identity";
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
  CollectionErrorState,
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
import { deleteMeetingMinute, listMeetingMinuteAuthors, listMeetingMinutes } from "@/lib/meeting-minutes";
import type { MeetingMinute, MeetingMinuteAuthor } from "@/types/meeting-minute";
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
const SORT_COLUMNS = {
  "Judul Notulen": "title",
  Tanggal: "date",
  Peserta: "participants",
  "Dibuat Oleh": "author",
};

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
  const [total, setTotal] = useState(0);
  const [authors, setAuthors] = useState<MeetingMinuteAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [authorFilter, setAuthorFilter] = useState(() => searchParams.get("author") ?? "all");
  const [dateFilter, setDateFilter] = useState(() => searchParams.get("date") ?? "");
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    Math.min(100, parsePositiveInt(searchParams.get("limit"), DEFAULT_LIMIT)),
  );

  const [minuteToDelete, setMinuteToDelete] = useState<MeetingMinute | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const organizationFilter = useOrganizationFilter(() => setPage(1));
  const { controls, sortBy, sortOrder } = useRemoteCollectionSorting(SORT_COLUMNS, () => setPage(1));
  const { organizationId } = organizationFilter;
  const search = query.trim();
  const authorOptions = useMemo(() => {
    const options = [...authors];
    if (authorFilter !== "all" && !authors.some(({ value }) => value === authorFilter)) {
      options.push({ value: authorFilter, label: authorFilter });
    }
    return options.sort((a, b) => a.label.localeCompare(b.label, "id"));
  }, [authors, authorFilter]);

  useEffect(() => {
    skipUrlWrite.current = true;
    const nextQuery = searchParams.get("q") ?? "";
    setAuthorFilter(searchParams.get("author") ?? "all");
    setDateFilter(searchParams.get("date") ?? "");
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = Math.min(100, parsePositiveInt(
      searchParams.get("limit"),
      DEFAULT_LIMIT,
    ));

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

    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    const timeout = window.setTimeout(() => {
      void listMeetingMinutes({
        organizationId: organizationId === "all" ? undefined : organizationId,
        createdBy: authorFilter === "all" ? undefined : authorFilter,
        date: dateFilter,
        q: search,
        sortBy,
        sortOrder,
        limit,
        offset: (page - 1) * limit,
      }, token, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(response.total / limit));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setItems(response.items ?? []);
        setTotal(response.total);
        setLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setLoadError(true);
        setLoading(false);
      });
    }, search ? 250 : 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [authorFilter, dateFilter, limit, organizationId, page, reload, search, sortBy, sortOrder, token]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void listMeetingMinuteAuthors(token, controller.signal).then((options) => {
      if (!controller.signal.aborted) setAuthors(options);
    }).catch((error) => {
      if (!controller.signal.aborted) console.error(error);
    });
    return () => controller.abort();
  }, [reload, token]);

  const handleDelete = async () => {
    if (!token || !minuteToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeetingMinute(minuteToDelete.id, token);
      setReload((current) => current + 1);
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
              organizationFilter.field,
              {
                id: "author",
                label: "Pembuat",
                value: authorFilter,
                onChange: (value) => {
                  setAuthorFilter(value);
                  setPage(1);
                },
                options: [{ value: "all", label: "Semua pembuat" }, ...authorOptions],
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

      <CollectionTableCard stickyActions sorting={controls}>
        {loading ? (
          <CollectionLoadingState message="Memuat daftar notulen..." />
        ) : loadError ? (
          <CollectionErrorState
            message="Daftar notulen belum berhasil dimuat."
            onReload={() => setReload((current) => current + 1)}
          />
        ) : total === 0 && !search && authorFilter === "all" && !dateFilter && organizationId === "all" ? (
          <CollectionEmptyState
            title="Belum ada notulen tersimpan"
            description="Mulai dari transkrip rapat lalu simpan hasil notulennya agar muncul di daftar ini."
          />
        ) : total === 0 ? (
          <CollectionEmptyState
            title="Tidak ada notulen yang cocok"
            description="Coba kata kunci lain atau kosongkan pencarian untuk melihat semua notulen."
          />
        ) : (
          <Table className="min-w-[1116px] table-fixed">
            <colgroup>
              <col style={{ width: 132 }} />
              <col style={{ width: 310 }} />
              <col style={{ width: 148 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 208 }} />
              <col style={{ width: 48 }} />
            </colgroup>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                <CollectionTableHead>ID notulen</CollectionTableHead>
                <CollectionTableHead className="">Judul Notulen</CollectionTableHead>
                <CollectionTableHead >Tanggal</CollectionTableHead>
                <CollectionTableHead className="text-center">Peserta</CollectionTableHead>
                <CollectionTableHead >Dibuat Oleh</CollectionTableHead>
                <CreatedAtHead />
                <CollectionTableHead data-collection-action="" className="text-center">
                  <span data-collection-action="" className="sr-only">Aksi</span>
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {items.map((minute) => (
                <TableRow key={minute.id} className="hover:bg-muted/50">
                  <TableCell><CollectionCode code={minute.id} href={`/minutes/${minute.id}`} /></TableCell>
                  <TableCell className="max-w-[320px]">
                    <RiskTableIdentity
                      title={minute.title || "-"}
                      href={`/minutes/${minute.id}`}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span data-date-time="">{formatDisplayDate(new Date(minute.date), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}</span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {minute.participants?.length || 0}
                  </TableCell>
                  <TableCell className="truncate">
                    {minute.createdByName || "-"}
                  </TableCell>
                  <CreatedAtCell record={minute} />
                  <TableCell data-collection-action="">
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

      {!loadError && total > 0 && (
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
            <DialogDescription>Periksa notulen yang akan dihapus.</DialogDescription>
          </DialogHeader>
          <ConfirmationConsequences>
            Notulen ini akan dihapus permanen beserta relasinya dengan risiko terkait.
          </ConfirmationConsequences>
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
