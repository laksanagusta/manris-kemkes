"use client";

import { ActionButton } from "@/components/shared/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  MoreHorizontal,
  ShieldAlert,
  SkipForward,
  Trash2,
  XCircle,
} from "@/components/ui/icons";

export function WorkingPaperStatusActions({
  canStartSigning,
  canSkipTTE,
  canCancel,
  canDelete,
  onStartSigning,
  onSkipTTE,
  onCancel,
  onDelete,
  onExport,
}: {
  canStartSigning: boolean;
  canSkipTTE: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onStartSigning: () => void;
  onSkipTTE: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const hasWorkflowActions =
    canStartSigning || canSkipTTE || canCancel || canDelete;
  const hasActions = hasWorkflowActions || Boolean(onExport);

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionButton variant="outline" size="md">
          <MoreHorizontal className="size-4" />
          Tindakan
        </ActionButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Pilih tindakan</DropdownMenuLabel>
        {canStartSigning ? (
          <DropdownMenuItem className="gap-2" onClick={onStartSigning}>
            <ShieldAlert className="size-3.5" />
            Mulai proses TTE
          </DropdownMenuItem>
        ) : null}
        {canStartSigning && (canSkipTTE || canCancel || canDelete) ? (
          <DropdownMenuSeparator />
        ) : null}
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
