"use client";

import { GitBranch, ShieldAlert, Trash2 } from "lucide-react";

import { ActionButton } from "@/components/shared/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RiskCascadeRecord } from "@/types/risk-cascade";

export function RiskCascadeRowActions({
  item,
  onReview,
  onDelete,
}: {
  item: RiskCascadeRecord;
  onReview?: () => void;
  onDelete?: () => void;
}) {
  if (!onReview && !onDelete) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionButton
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          icon={<GitBranch className="size-3.5" />}
          aria-label={`Aksi eskalasi ${item.sourceRiskCode || item.sourceRiskTitle || item.id}`}
        >
          Aksi
        </ActionButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {onReview ? (
          <DropdownMenuItem onClick={onReview}>
            <ShieldAlert className="size-3.5" />
            Tinjau eskalasi
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Hapus draft
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
