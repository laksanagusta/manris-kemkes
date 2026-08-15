"use client";

import { ChevronLeft, ChevronRight } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { paginationItems } from "./collection-pagination-items";

export function CollectionPagination({
  itemLabel,
  page,
  pageSize,
  total,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: {
  itemLabel: string;
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <CardFooter className="flex-col items-stretch gap-3 border-border/60 bg-white px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <p>
        Menampilkan {total === 0 ? 0 : (page - 1) * pageSize + 1} sampai{" "}
        {Math.min(page * pageSize, total)} dari {total} {itemLabel}
      </p>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon-xs"
            className="rounded-lg border-border/60 bg-white shadow-none"
            disabled={page === 1 || disabled}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          {paginationItems(page, totalPages).map((pageNumber) => (
            <Button
              key={pageNumber}
              variant="outline"
              size="xs"
              className={cn(
                "min-w-10 rounded-lg border bg-white px-3 shadow-none",
                pageNumber === page
                  ? "border-primary text-foreground hover:bg-white hover:text-foreground"
                  : "border-border/60 text-foreground/80 hover:bg-white hover:text-foreground",
              )}
              disabled={pageNumber === page || disabled}
              onClick={() => onPageChange(pageNumber)}
              aria-current={pageNumber === page ? "page" : undefined}
            >
              {pageNumber}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon-xs"
            className="rounded-lg border-border/60 bg-white shadow-none"
            disabled={page === totalPages || total === 0 || disabled}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span>Items per page</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              className="h-10 w-[72px] rounded-lg border-border/60 bg-white px-3 text-sm shadow-none"
              aria-label="Items per page"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardFooter>
  );
}
