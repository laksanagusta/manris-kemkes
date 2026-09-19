"use client";

import { ActionButton } from "@/components/shared/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  MoreHorizontal,
  SkipForward,
  Trash2,
  XCircle,
} from "@/components/ui/icons";

export function WorkingPaperStatusActions({
  canSkipTTE,
  canCancel,
  canDelete,
  onSkipTTE,
  onCancel,
  onDelete,
  onExport,
}: {
  canSkipTTE: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onSkipTTE: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const hasWorkflowActions = canSkipTTE || canCancel || canDelete;
  const hasActions = hasWorkflowActions || Boolean(onExport);

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionButton
          variant="outline"
          size="icon-xs"
          aria-label="Tindakan"
          title="Tindakan"
        >
          <MoreHorizontal className="size-4" />
        </ActionButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canSkipTTE ? (
          <DropdownMenuItem className="gap-2" onClick={onSkipTTE}>
            <SkipForward className="size-3.5" />
            Lewati tanda tangan elektronik
          </DropdownMenuItem>
        ) : null}
        {canCancel ? (
          <DropdownMenuItem className="gap-2" onClick={onCancel}>
            <XCircle className="size-3.5" />
            Batalkan dokumen
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Hapus kertas kerja
          </DropdownMenuItem>
        ) : null}
        {hasWorkflowActions ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem className="gap-2" onClick={onExport}>
          <Download className="size-3.5" />
          Ekspor Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
