"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "@/components/ui/icons";

import type { OrganizationListItem } from "@/lib/api/organizations";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PickerOption = {
  id: string;
  name: string;
  location?: string;
  uprLevel?: string;
};

interface OrganizationPickerProps {
  id?: string;
  value: string;
  organizations: OrganizationListItem[];
  onChange: (organizationId: string) => void;
  selectedValues?: string[];
  onSelectedValuesChange?: (organizationIds: string[]) => void;
  multiSelect?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true";
  "aria-required"?: boolean | "false" | "true";
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
  id,
  value,
  organizations,
  onChange,
  selectedValues,
  onSelectedValuesChange,
  multiSelect = false,
  placeholder = "Pilih unit laporan",
  searchPlaceholder = "Cari unit...",
  emptyMessage = "Tidak ada unit ditemukan.",
  className,
  disabled,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  "aria-required": ariaRequired,
  allowAllOption = false,
  allOptionLabel = "Semua unit",
  allOptionValue = "all",
}: OrganizationPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const comboboxAnchor = useComboboxAnchor();
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
    if (!query) return [];

    return options
      .filter((option) =>
        `${option.name} ${option.location ?? ""} ${option.uprLevel ?? ""}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 5);
  }, [debouncedSearch, options]);

  const selectedOption = options.find((option) => option.id === value);
  const allowedSelectedValues = filterAllowedValues(
    options,
    selectedValues ?? [],
  );
  const optionNameById = new Map(options.map((option) => [option.id, option.name]));

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (multiSelect) {
    return (
      <Combobox
        multiple
        autoHighlight
        highlightItemOnHover
        openOnInputClick
        items={options.map((option) => option.id)}
        filteredItems={filteredOptions.map((option) => option.id)}
        filter={null}
        value={allowedSelectedValues}
        onValueChange={(nextValues) => onSelectedValuesChange?.(nextValues)}
        inputValue={search}
        onInputValueChange={setSearch}
        disabled={disabled}
      >
        <ComboboxChips
          ref={comboboxAnchor}
          className={cn(
            "w-full min-w-0 border-border/50 bg-background/80 text-xs shadow-none",
            className,
          )}
        >
          <ComboboxValue>
            {(values) => (
              <Fragment>
                {values.map((selectedId: string) => (
                  <ComboboxChip key={selectedId}>
                    {optionNameById.get(selectedId) ?? selectedId}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  placeholder={values.length === 0 ? placeholder : searchPlaceholder}
                  className="min-w-32 text-xs"
                />
              </Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={comboboxAnchor} className="min-w-[420px]">
          <ComboboxEmpty>
            {search.trim() ? emptyMessage : "Ketik untuk mencari unit."}
          </ComboboxEmpty>
          <ComboboxList>
            {(optionId: string) => (
              <ComboboxItem key={optionId} value={optionId} className="text-xs">
                <span className="min-w-0 flex-1 truncate">
                  {optionNameById.get(optionId) ?? optionId}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );
  }

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
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
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
        className="w-[min(var(--radix-popover-trigger-width),680px)] gap-0 overflow-hidden rounded-xl p-0"
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
            className="h-9 rounded-none border-0 bg-transparent px-0 py-2 text-xs shadow-none"
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

function filterAllowedValues(
  options: PickerOption[],
  values?: string[],
) {
  if (!values?.length) return [];
  const allowed = new Set(options.map((option) => option.id));
  return values.filter((value) => allowed.has(value));
}
