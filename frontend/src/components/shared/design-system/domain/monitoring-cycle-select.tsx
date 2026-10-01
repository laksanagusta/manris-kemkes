import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "@/components/shared/icons";
import type { MonitoringCycleBadgeStatus } from "@/lib/risk-register-monitoring";

export type MonitoringCycleSelectOption = {
  value: string;
  label: string;
  status: MonitoringCycleBadgeStatus;
};

const statusPresentation: Record<
  MonitoringCycleBadgeStatus,
  { label: string; className: string }
> = {
  "not-started": {
    label: "Belum dipantau",
    className: "bg-secondary text-secondary-foreground",
  },
  "in-progress": {
    label: "Sedang dipantau",
    className:
      "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  completed: {
    label: "Selesai",
    className:
      "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  "current-period": {
    label: "Kuartal berjalan",
    className: "border-info-foreground/20 bg-info-foreground/5 text-info-foreground",
  },
  "not-applicable": {
    label: "Tidak berlaku",
    className: "bg-secondary text-secondary-foreground",
  },
};

function CycleStatusBadge({ status }: { status: MonitoringCycleBadgeStatus }) {
  const presentation = statusPresentation[status];

  return (
    <Badge variant="secondary" className={presentation.className}>
      {presentation.label}
    </Badge>
  );
}

export function MonitoringCycleSelect({
  id,
  value,
  options,
  onValueChange,
  disabled = false,
}: {
  id?: string;
  value: string;
  options: readonly MonitoringCycleSelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Pilih periode pemantauan"
          disabled={disabled}
          className="h-9 w-full justify-between gap-2 active:translate-y-0 active:scale-100"
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selected?.label ?? "Pilih periode pemantauan"}
          </span>
          {selected ? <CycleStatusBadge status={selected.status} /> : null}
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={
                option.status === "completed" ||
                option.status === "not-applicable"
              }
              className="pr-8"
            >
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="truncate">{option.label}</span>
                <CycleStatusBadge status={option.status} />
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
