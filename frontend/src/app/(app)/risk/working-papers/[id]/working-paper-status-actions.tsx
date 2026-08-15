"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
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
}: {
  canStartSigning: boolean;
  canSkipTTE: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onStartSigning: () => void;
  onSkipTTE: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const hasActions = canStartSigning || canSkipTTE || canCancel || canDelete;

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/70 bg-background/90"
        >
          <MoreHorizontal className="size-4" />
          Tindakan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Pilih tindakan</DropdownMenuLabel>
        {canStartSigning ? (
          <DropdownMenuItem className="gap-2" onClick={onStartSigning}>
            <ShieldAlert className="size-3.5" />
            Mulai proses TTE
          </DropdownMenuItem>
        ) : null}
        {canSkipTTE || canCancel || canDelete ? (
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
