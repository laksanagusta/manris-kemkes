"use client";

import { Search } from "lucide-react";

import { OrganizationPicker } from "@/components/report/organization-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrganizationListItem } from "@/lib/api/organizations";

export type PerformanceRiskPlanningOption = {
  id: string;
  title: string;
  status: string;
  period: string;
};

export type PerformanceRiskLevelFilter =
  | "all"
  | "sangat_tinggi"
  | "tinggi"
  | "sedang"
  | "rendah"
  | "sangat_rendah";

export type PerformanceRiskMitigationFilter = "all" | "overdue" | "pending" | "clear";

type Props = {
  planningId: string;
  planningOptions: PerformanceRiskPlanningOption[];
  onPlanningChange: (value: string) => void;
  organizationId: string;
  organizations: OrganizationListItem[];
  onOrganizationChange: (value: string) => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  riskLevelFilter: PerformanceRiskLevelFilter;
  onRiskLevelFilterChange: (value: PerformanceRiskLevelFilter) => void;
  mitigationFilter: PerformanceRiskMitigationFilter;
  onMitigationFilterChange: (value: PerformanceRiskMitigationFilter) => void;
  showNoRisk: boolean;
  onShowNoRiskChange: (value: boolean) => void;
};

export function PerformanceRiskFilterBar({
  planningId,
  planningOptions,
  onPlanningChange,
  organizationId,
  organizations,
  onOrganizationChange,
  searchText,
  onSearchTextChange,
  riskLevelFilter,
  onRiskLevelFilterChange,
  mitigationFilter,
  onMitigationFilterChange,
  showNoRisk,
  onShowNoRiskChange,
}: Props) {
  return (
    <div className="grid gap-4 rounded-xl border border-border/70 bg-card p-4 xl:grid-cols-[180px_minmax(260px,1fr)_minmax(220px,1fr)_170px_170px_auto] xl:items-end">
      <div className="space-y-2">
        <Label htmlFor="performance-risk-planning">Perjanjian Kinerja</Label>
        <Select value={planningId} onValueChange={onPlanningChange}>
          <SelectTrigger id="performance-risk-planning">
            <SelectValue placeholder="Pilih perjanjian kinerja" />
          </SelectTrigger>
          <SelectContent>
            {planningOptions.length === 0 ? (
              <SelectItem value="__empty" disabled>
                Tidak ada perjanjian kinerja
              </SelectItem>
            ) : (
              planningOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.title}
                  {option.period ? ` · ${option.period}` : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Unit</Label>
        <OrganizationPicker
          value={organizationId}
          organizations={organizations}
          onChange={onOrganizationChange}
          placeholder="Semua unit yang dapat diakses"
          searchPlaceholder="Cari unit..."
          emptyMessage="Tidak ada unit ditemukan."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="performance-risk-search">Cari RO / program / kegiatan</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="performance-risk-search"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Ketik kata kunci"
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Level Risiko</Label>
        <Select value={riskLevelFilter} onValueChange={(value) => onRiskLevelFilterChange(value as PerformanceRiskLevelFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Semua level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua level</SelectItem>
            <SelectItem value="sangat_tinggi">Sangat Tinggi</SelectItem>
            <SelectItem value="tinggi">Tinggi</SelectItem>
            <SelectItem value="sedang">Sedang</SelectItem>
            <SelectItem value="rendah">Rendah</SelectItem>
            <SelectItem value="sangat_rendah">Sangat Rendah</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Status Mitigasi</Label>
        <Select value={mitigationFilter} onValueChange={(value) => onMitigationFilterChange(value as PerformanceRiskMitigationFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="clear">Tidak ada tekanan</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex min-h-11 items-center gap-2.5 rounded-md border border-border bg-background px-3.5 py-3 text-sm leading-5 transition-colors hover:bg-muted/30">
        <input
          type="checkbox"
          checked={showNoRisk}
          onChange={(event) => onShowNoRiskChange(event.target.checked)}
          className="size-4"
        />
        <span className="leading-snug">Tampilkan RO tanpa risiko</span>
      </label>
    </div>
  );
}
