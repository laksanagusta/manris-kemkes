"use client";

import { useState } from "react";

import { SearchableDropdownPicker } from "@/components/shared/searchable-dropdown-picker";
import type { MonitoringRuleProgressOption } from "@/lib/annual-profile-progress-report";

function ruleLabel(rule: MonitoringRuleProgressOption) {
  return `${rule.name} · ${rule.year}`;
}

export function ReportMonitoringRulePicker({ rules, selected, onSelect, disabled }: {
  rules: MonitoringRuleProgressOption[];
  selected?: MonitoringRuleProgressOption;
  onSelect: (rule: MonitoringRuleProgressOption) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("id-ID");

  return (
    <SearchableDropdownPicker
      title="Rules Pemantauan"
      description="Pilih rules untuk melihat progres unit yang memakai rules tersebut."
      placeholder="Pilih Rules Pemantauan"
      value={selected?.id ?? ""}
      selectedOption={selected}
      options={rules.filter((rule) => ruleLabel(rule).toLocaleLowerCase("id-ID").includes(query))}
      getOptionValue={(rule) => rule.id}
      renderValue={(rule) => <span className="min-w-0 flex-1 truncate text-start">{ruleLabel(rule)}</span>}
      renderOption={(rule) => <span className="min-w-0 wrap-anywhere">{ruleLabel(rule)}</span>}
      onSelect={onSelect}
      open={open}
      onOpenChange={(value) => { setOpen(value); if (value) setSearch(""); }}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari nama rules atau tahun…"
      emptyMessage="Rules pemantauan tidak ditemukan."
      className="max-w-md"
      disabled={disabled}
      focusSearchOnOpen
    />
  );
}
