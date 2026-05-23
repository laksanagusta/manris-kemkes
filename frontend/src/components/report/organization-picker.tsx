"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import type { OrganizationListItem } from "@/lib/api/organizations";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PickerOption = OrganizationListItem | { id: string; name: string };

interface OrganizationPickerProps {
  value: string;
  organizations: OrganizationListItem[];
  onChange: (organizationId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  allOptionValue?: string;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(handle);
  }, [delay, value]);

  return debouncedValue;
}

export function OrganizationPicker({
  value,
  organizations,
  onChange,
  placeholder = "Pilih unit laporan",
  searchPlaceholder = "Cari unit...",
  emptyMessage = "Tidak ada unit ditemukan.",
  className,
  disabled,
  allowAllOption = false,
  allOptionLabel = "Semua unit",
  allOptionValue = "all",
}: OrganizationPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const options = useMemo<PickerOption[]>(
    () =>
      allowAllOption
        ? [{ id: allOptionValue, name: allOptionLabel }, ...organizations]
        : organizations,
    [allowAllOption, allOptionLabel, allOptionValue, organizations],
  );

  const filteredOptions = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return options;

    return options.filter((option) =>
      option.name.toLowerCase().includes(query),
    );
  }, [debouncedSearch, options]);

  const selectedOption = options.find((option) => option.id === value);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-8 w-full min-w-0 justify-between overflow-hidden border-border/50 bg-background/80 px-3 text-xs font-normal shadow-none",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? selectedOption.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(var(--radix-popover-trigger-width),520px)] gap-0 overflow-hidden rounded-md p-0"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ScrollArea className="h-44">
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-3.5 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate leading-5">
                      {option.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
