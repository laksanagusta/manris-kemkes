"use client";

import { useCallback, useState } from "react";

import {
  ActionButton,
  RiskDetailDrawer,
} from "@/components/shared/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSearch, MoreHorizontal, Trash2 } from "@/components/shared/icons";
import type { Risk } from "@/types/risk";

interface MonitoringActionsMenuProps {
  risk: Risk;
  canDeleteDraft: boolean;
  deleteDisabled?: boolean;
  onDeleteDraft: () => void;
}

export function MonitoringActionsMenu({
  risk,
  canDeleteDraft,
  deleteDisabled = false,
  onDeleteDraft,
}: MonitoringActionsMenuProps) {
  const [isRiskDrawerOpen, setIsRiskDrawerOpen] = useState(false);
  const handleOpenRiskDrawer = useCallback(() => {
    setIsRiskDrawerOpen(true);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionButton
            variant="outline"
            size="icon-xs"
            aria-label="Tindakan pemantauan"
            title="Tindakan"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </ActionButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem className="gap-2" onSelect={handleOpenRiskDrawer}>
            <FileSearch className="size-3.5" aria-hidden="true" />
            Detail Risiko
          </DropdownMenuItem>
          {canDeleteDraft ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                disabled={deleteDisabled}
                onSelect={onDeleteDraft}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Hapus draf
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <RiskDetailDrawer
        risk={risk}
        open={isRiskDrawerOpen}
        onOpenChange={setIsRiskDrawerOpen}
      />
    </>
  );
}
