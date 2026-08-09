"use client";

import type { Dispatch, SetStateAction } from "react";
import { Filter as FilterIcon } from "lucide-react";

import { ReportScopePicker } from "@/components/report/report-scope-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { OrganizationGroupListItem } from "@/lib/api/organization-groups";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { ReportsFilterScope } from "@/lib/reports-filter-sheet";
export type ReportsFilterPlanningOption = {
  id: string;
  title: string;
  period?: string;
};

type ReportsFilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeUnitCount: number;
  showUnitCountBadge?: boolean;
  disabled: boolean;
  title?: string;
  description?: string;
  planningId?: string;
  planningOptions?: ReportsFilterPlanningOption[];
  onPlanningChange?: (value: string) => void;
  draftScope: ReportsFilterScope;
  onDraftScopeChange: Dispatch<SetStateAction<ReportsFilterScope>>;
  organizations: OrganizationListItem[];
  organizationGroups: OrganizationGroupListItem[];
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
  contentClassName?: string;
};

export function ReportsFilterSheet({
  open,
  onOpenChange,
  activeUnitCount,
  showUnitCountBadge = true,
  disabled,
  title = "Filter Laporan",
  description = "Atur group dan unit. Perubahan baru diterapkan setelah Anda menekan Terapkan Filter.",
  planningId,
  planningOptions = [],
  onPlanningChange,
  draftScope,
  onDraftScopeChange,
  organizations,
  organizationGroups,
  onReset,
  onCancel,
  onApply,
  contentClassName,
}: ReportsFilterSheetProps) {
  return (
    <Sheet modal={false} open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="md" disabled={disabled} className="gap-2 shadow-none">
          <FilterIcon data-icon="inline-start" className="size-3.5" />
          Filter
          {showUnitCountBadge ? (
            <Badge variant="secondary" className="tabular-nums">
              {activeUnitCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className={cn(
          "data-[side=right]:w-full data-[side=right]:sm:max-w-[22rem]",
          contentClassName,
        )}
        onInteractOutside={(event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest('[data-slot="combobox-content"]')
          ) {
            event.preventDefault();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {planningId !== undefined && onPlanningChange ? (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Perjanjian Kinerja
              </p>
              <Select value={planningId} onValueChange={onPlanningChange}>
                <SelectTrigger>
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
          ) : null}

          <ReportScopePicker
            organizationId={draftScope.organizationId}
            onOrganizationChange={(organizationId) =>
              onDraftScopeChange((current) => ({
                ...current,
                organizationId,
              }))
            }
            selectedOrganizationIds={draftScope.organizationIds}
            onSelectedOrganizationIdsChange={(organizationIds) =>
              onDraftScopeChange((current) => ({
                ...current,
                organizationIds,
              }))
            }
            organizations={organizations}
            organizationGroupId={draftScope.organizationGroupId}
            onOrganizationGroupChange={(organizationGroupId) =>
              onDraftScopeChange((current) => ({
                ...current,
                organizationGroupId,
              }))
            }
            organizationGroups={organizationGroups}
            organizationPlaceholder="Pilih unit"
            organizationGroupPlaceholder="Pilih grup"
            orientation="vertical"
          />
        </div>

        <Separator />

        <SheetFooter className="sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="md" onClick={onReset} className="shadow-none">
            Reset
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="md" onClick={onCancel} className="shadow-none">
              Batal
            </Button>
            <Button type="button" size="md" onClick={onApply}
              style={{ '--primary': '#00b9ad', '--primary-foreground': '#ffffff' } as React.CSSProperties}>
              Terapkan Filter
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
