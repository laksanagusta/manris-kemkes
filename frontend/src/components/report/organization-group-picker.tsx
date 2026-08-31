"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, Users } from "@/components/ui/icons";

import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface OrganizationGroupPickerProps {
  value: string;
  groups: OrganizationGroupListItem[];
  onChange: (groupId: string) => void;
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

export function OrganizationGroupPicker({
  value,
  groups,
  onChange,
  placeholder = "Pilih grup",
  searchPlaceholder = "Cari grup...",
  emptyMessage = "Tidak ada grup ditemukan.",
  className,
  disabled,
  allowAllOption = false,
  allOptionLabel = "Semua grup",
  allOptionValue = "all",
}: OrganizationGroupPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);

  const options = useMemo(
    () =>
      allowAllOption
        ? [
            {
              id: allOptionValue,
              name: allOptionLabel,
              ownerOrganizationName: "",
              memberCount: 0,
            } as OrganizationGroupListItem,
            ...groups,
          ]
        : groups,
    [allowAllOption, allOptionLabel, allOptionValue, groups],
  );

  const filteredGroups = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return options;

    return options.filter((group) => {
      if (group.id === allOptionValue) return true;
      const haystack = `${group.name} ${group.ownerOrganizationName} ${group.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [allOptionValue, debouncedSearch, options]);

  const selectedGroup = options.find((group) => group.id === value);

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
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full min-w-0 justify-between overflow-hidden border-input bg-background/80 px-3 text-xs font-normal shadow-none",
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedGroup
              ? `${selectedGroup.name} · ${selectedGroup.ownerOrganizationName}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(var(--radix-popover-trigger-width),620px)] gap-0 overflow-hidden rounded-xl p-0"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
          <SearchInput
            ref={inputRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-none border-0 bg-transparent px-0 py-2 text-xs shadow-none"
          />
        </div>
        <ScrollArea className="h-56">
          <div className="p-1">
            {filteredGroups.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isSelected = group.id === value;

                return (
                  <button
                    key={group.id}
                    type="button"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-start gap-2 rounded-sm px-2 py-2 text-left text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground",
                    )}
                    onClick={() => {
                      onChange(group.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Users className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/80" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {group.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {group.ownerOrganizationName} · {group.memberCount} unit
                      </span>
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
