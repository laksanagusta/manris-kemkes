"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Loader2, X } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/shared/search-input";
import { SearchablePickerTrigger } from "@/components/shared/searchable-picker-trigger";
import { cn } from "@/lib/utils";

interface SearchableDropdownPickerProps<T> {
  id?: string;
  title: string;
  description: string;
  placeholder: string;
  value: string;
  selectedOption?: T | null;
  options: T[];
  getOptionValue: (option: T) => string;
  renderValue: (option: T) => ReactNode;
  renderOption: (option: T) => ReactNode;
  onSelect: (option: T) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
  triggerClassName?: string;
  optionClassName?: string;
  focusSearchOnOpen?: boolean;
}

export function SearchableDropdownPicker<T>({
  id,
  title,
  description,
  placeholder,
  value,
  selectedOption: selectedOptionProp,
  options,
  getOptionValue,
  renderValue,
  renderOption,
  onSelect,
  open,
  onOpenChange,
  search,
  onSearchChange,
  searchPlaceholder,
  emptyMessage,
  disabled,
  loading = false,
  loadingMessage = "Memuat...",
  errorMessage = "",
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  className,
  triggerClassName,
  optionClassName,
  focusSearchOnOpen = false,
}: SearchableDropdownPickerProps<T>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedOption =
    selectedOptionProp === undefined
      ? options.find((option) => getOptionValue(option) === value)
      : selectedOptionProp;

  useEffect(() => {
    if (!open || !focusSearchOnOpen) return;

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [focusSearchOnOpen, open]);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <div className={cn("relative w-full", className)}>
        <DropdownMenuTrigger asChild>
          <SearchablePickerTrigger
            id={id}
            aria-label={title}
            expanded={open}
            disabled={disabled}
            className={triggerClassName}
          >
            {selectedOption ? (
              renderValue(selectedOption)
            ) : (
              <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
                {placeholder}
              </span>
            )}
          </SearchablePickerTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <div className="flex items-center px-1.5">
            <SearchInput
              ref={inputRef}
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape" && event.key !== "Tab") {
                  event.stopPropagation();
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={`${title}: cari`}
              className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Hapus pencarian"
                onClick={() => {
                  onSearchChange("");
                  inputRef.current?.focus();
                }}
                className="shrink-0 text-muted-foreground"
              >
                <X />
              </Button>
            ) : null}
          </div>
          <p className="sr-only">{description}</p>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(selectedId) => {
              const option = options.find(
                (candidate) => getOptionValue(candidate) === selectedId,
              );
              if (!option) return;

              onSelect(option);
              onOpenChange(false);
            }}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={getOptionValue(option)}
                value={getOptionValue(option)}
                className={optionClassName}
              >
                {renderOption(option)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {loading && options.length === 0 ? (
            <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" />
              {loadingMessage}
            </div>
          ) : null}
          {!loading && errorMessage ? (
            <div className="px-2 py-2 text-sm text-muted-foreground" role="alert">
              {errorMessage}
            </div>
          ) : null}
          {!loading && !errorMessage && options.length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">{emptyMessage}</div>
          ) : null}
          {hasMore ? (
            <DropdownMenuItem
              disabled={loading || loadingMore}
              onSelect={(event) => {
                event.preventDefault();
                onLoadMore?.();
              }}
              className="justify-center text-muted-foreground"
            >
              {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
              {loadingMore ? "Memuat..." : "Muat lagi"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}
