"use client";

import { useEffect, useMemo, useState } from "react";

import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import { SearchableDropdownPicker } from "@/components/shared/searchable-dropdown-picker";

interface OrganizationGroupPickerProps {
  id?: string;
  "aria-label"?: string;
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
  density?: "default" | "compact";
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
  id,
  "aria-label": ariaLabel = "Grup laporan",
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
  density = "default",
}: OrganizationGroupPickerProps) {
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

  const selectedGroup = options.find((group) => group.id === value) ?? null;
  const controlHeight = density === "compact" ? "h-9" : "h-10";

  return (
    <SearchableDropdownPicker
      id={id}
      title={ariaLabel}
      description="Cari dan pilih grup laporan."
      placeholder={placeholder}
      value={value}
      selectedOption={selectedGroup}
      options={filteredGroups}
      getOptionValue={(group) => group.id}
      renderValue={(group) => (
        <span className="min-w-0 flex-1 truncate text-left">
          {`${group.name}${group.ownerOrganizationName ? ` · ${group.ownerOrganizationName}` : ""}`}
        </span>
      )}
      renderOption={(group) => <span className="truncate">{group.name}</span>}
      onSelect={(group) => onChange(group.id)}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      className={className}
      triggerClassName={controlHeight}
      focusSearchOnOpen
    />
  );
}
