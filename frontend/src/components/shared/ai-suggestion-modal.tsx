"use client";

import { useState, type ReactNode } from "react";
import { Check, Sparkles, Plus, Loader2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  AccentButton,
  CollectionDialogCancel,
} from "@/components/shared/design-system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SuggestionItem {
  id: string;
  text: string;
  description?: string;
  meta?: string;
  value?: string;
}

type SuggestionSelectionMode = "multiple" | "single";
type SuggestionModalVariant = "default" | "clean-list" | "structured-list";

function ScrollBoundary({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full min-h-0 flex-1">
      <div className="h-full touch-pan-y overflow-y-auto overscroll-contain no-scrollbar">
        <div className="px-0 pb-10 pt-2">{children}</div>
      </div>
    </div>
  );
}

interface AiSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  suggestions: SuggestionItem[];
  isLoading?: boolean;
  onApply: (selectedItems: SuggestionItem[]) => void;
  selectionMode?: SuggestionSelectionMode;
  applyLabel?: string;
  variant?: SuggestionModalVariant;
}

export function AiSuggestionModal({
  open,
  onOpenChange,
  title,
  description = "Pilih saran dari AI yang sesuai dengan konteks risiko Anda.",
  suggestions,
  isLoading = false,
  onApply,
  selectionMode = "multiple",
  applyLabel = "Terapkan Pilihan",
  variant = "default",
}: AiSuggestionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isCleanList = variant === "clean-list";
  const isStructuredList = variant === "structured-list";
  const isCompactHeader = isCleanList || isStructuredList;

  // Reset selection when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedIds(new Set());
    }
    onOpenChange(isOpen);
  };

  const toggleSelection = (id: string) => {
    if (selectionMode === "single") {
      setSelectedIds(new Set([id]));
      return;
    }

    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    const selectedItems = suggestions.filter((s) => selectedIds.has(s.id));
    onApply(selectedItems);
    onOpenChange(false);
  };

  const handleSuggestionSelect = (suggestion: SuggestionItem) => {
    if (isCleanList) {
      onApply([suggestion]);
      onOpenChange(false);
      return;
    }

    toggleSelection(suggestion.id);
  };

  const suggestionRows = suggestions.map((suggestion) => {
    const isSelected = selectedIds.has(suggestion.id);
    const hasDetails = Boolean(suggestion.description || suggestion.meta);
    const rowClassName = isCleanList
      ? "group mb-1 flex w-full items-start gap-3 px-0 py-3.5 text-left last:mb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      : isStructuredList
        ? "group flex w-full items-start gap-3 rounded-lg px-0 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        : selectionMode === "single"
          ? "group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring hover:bg-muted/50 focus-visible:bg-muted"
          : "group relative flex w-full cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors duration-150";
    const detailContent = (
      <div>
        {suggestion.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {suggestion.description}
          </p>
        ) : null}
        {suggestion.meta ? (
          <p className="mt-1.5 text-[11px] font-medium leading-4 text-primary">
            {suggestion.meta}
          </p>
        ) : null}
      </div>
    );
    return (
      <button
        key={suggestion.id}
        type="button"
        onClick={() => handleSuggestionSelect(suggestion)}
        aria-pressed={isSelected}
        className={cn(
          rowClassName,
          selectionMode === "single"
            ? !isCleanList && !isStructuredList && isSelected && "bg-muted/70"
            : isSelected
              ? isStructuredList
                ? undefined
                : "border-primary bg-primary/[0.03] ring-1 ring-primary/20"
              : !isStructuredList && "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/50",
        )}
      >
        {!isCleanList && (
          <div
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center border transition-colors",
              selectionMode === "single" ? "rounded-full" : "rounded-md",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background group-hover:border-primary/50",
            )}
          >
            {isSelected ? (
              <Check className="size-3.5" />
            ) : selectionMode === "multiple" && !isStructuredList ? (
              <Plus className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
            ) : null}
          </div>
        )}
        {isStructuredList ? (
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm leading-5 text-foreground">{suggestion.text}</p>
          </div>
        ) : (
          <div className="min-w-0 flex-1 text-left">
            <p
              className={cn(
                "text-sm leading-5 text-foreground",
                isCleanList && "font-medium",
              )}
            >
              {suggestion.text}
            </p>
            {isCleanList ? (
              hasDetails ? (
                <div className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-(--ease-out) group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100 motion-reduce:grid-rows-[1fr] motion-reduce:opacity-100">
                  <div className="min-h-0 overflow-hidden">{detailContent}</div>
                </div>
              ) : null
            ) : (
              detailContent
            )}
          </div>
        )}
      </button>
    );
  });

  const suggestionList = isCleanList ? (
    <>{suggestionRows}</>
  ) : isStructuredList ? (
    <div className="space-y-1">{suggestionRows}</div>
  ) : (
    <div
      className={cn(
        selectionMode === "single"
          ? "divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60 bg-card"
          : "space-y-2.5 p-4 pb-8",
      )}
    >
      {suggestionRows}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden no-scrollbar sm:max-w-2xl",
          isCleanList && "sm:max-w-xl",
          isStructuredList && "gap-0",
        )}
        style={
          isStructuredList
            ? {
                height: "min(560px, calc(100dvh - 2rem))",
                maxHeight: "min(560px, calc(100dvh - 2rem))",
              }
            : undefined
        }
        showCloseButton={!isCompactHeader}
      >
        <DialogHeader className="shrink-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
          {isCompactHeader ? (
            <DialogTitle className="text-base">{title}</DialogTitle>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base">{title}</DialogTitle>
                {description && (
                  <DialogDescription className="mt-1.5">
                    {description}
                  </DialogDescription>
                )}
              </div>
            </div>
          )}
        </DialogHeader>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]",
            !isCleanList && !isStructuredList && "min-h-[300px]",
            isStructuredList && "pt-5",
          )}
        >
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 px-4 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium text-foreground">Menganalisis...</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Mohon tunggu sebentar, kami sedang menyusun rekomendasi terbaik untuk Anda.
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm font-medium text-foreground">Belum ada saran</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Pastikan Anda sudah melengkapi informasi yang dibutuhkan sebelum meminta saran AI.
              </p>
            </div>
          ) : (
            isCleanList ? (
              <div className="min-h-0 max-h-[480px] flex-1 touch-pan-y overflow-y-auto overscroll-contain no-scrollbar">
                {suggestionList}
              </div>
            ) : isStructuredList ? (
              <ScrollBoundary>{suggestionList}</ScrollBoundary>
            ) : (
              <ScrollArea className="min-h-0 flex-1">
                {suggestionList}
              </ScrollArea>
            )
          )}
        </div>

        {isCleanList ? (
          <DialogFooter className="shrink-0 items-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms] sm:justify-end">
            <CollectionDialogCancel
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </CollectionDialogCancel>
          </DialogFooter>
        ) : isStructuredList ? (
          <DialogFooter className="!mt-0 shrink-0 items-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms] sm:justify-between">
            <span
              aria-live="polite"
              className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground"
            >
              {selectedIds.size}/{suggestions.length} saran dipilih
            </span>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <CollectionDialogCancel
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                Batal
              </CollectionDialogCancel>
              <AccentButton
                type="button"
                onClick={handleApply}
                disabled={selectedIds.size === 0 || isLoading}
                className="flex-1 sm:flex-none"
              >
                <Check className="size-3.5" />
                {applyLabel}
              </AccentButton>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter className="shrink-0 items-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms] sm:justify-between">
            <div className="text-xs font-medium text-muted-foreground hidden sm:block">
              {selectionMode === "single"
                ? selectedIds.size > 0
                  ? "1 saran dipilih"
                  : "Pilih satu saran"
                : `${selectedIds.size} item terpilih`}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <CollectionDialogCancel
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                Batal
              </CollectionDialogCancel>
              <AccentButton
                type="button"
                onClick={handleApply}
                disabled={selectedIds.size === 0 || isLoading}
                className="flex-1 sm:flex-none"
              >
                <Check className="size-3.5" />
                {applyLabel}
              </AccentButton>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
