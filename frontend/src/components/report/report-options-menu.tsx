"use client";

import { FileSpreadsheet, Loader2, MoreHorizontal, RotateCcw } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ReportOptionsMenu({ disabled, exporting, canExport, onExportExcel, onExportDataExcel, onReset }: {
  disabled: boolean;
  exporting: boolean;
  canExport: boolean;
  onExportExcel: () => void;
  onExportDataExcel: () => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Opsi laporan" title="Opsi laporan" disabled={disabled || exporting}>
          {exporting ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <MoreHorizontal />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem disabled={!canExport || exporting} onSelect={onExportExcel}>
          <FileSpreadsheet />Laporan lengkap Excel
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canExport || exporting} onSelect={onExportDataExcel}>
          <FileSpreadsheet />Data laporan Excel
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onReset}>
          <RotateCcw />Atur ulang filter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
