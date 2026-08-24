"use client";

import { Server } from "@/components/ui/icons";

import {
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
} from "@/components/shared/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export function TableExample() {
  return (
    <CollectionTableCard>
      <Table
        aria-label="Daftar layanan"
        className="min-w-[916px] table-fixed"
      >
        <colgroup>
          <col className="w-[240.77px]" />
          <col className="w-[102.81px]" />
          <col className="w-[165.94px]" />
          <col className="w-[154.91px]" />
          <col className="w-[130.03px]" />
          <col className="w-[121.55px]" />
        </colgroup>
      <CollectionTableHeader className="bg-table-header [&_tr]:border-b [&_tr]:border-border">
          <CollectionTableHeaderRow className="h-[40.5px]">
            <CollectionTableHead
              density="compact"
              className="h-[40.5px] px-6 py-3 text-left uppercase tracking-[0.05em] text-muted-foreground"
            >
              Name
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="h-[40.5px] px-6 py-3 text-left uppercase tracking-[0.05em] text-muted-foreground"
            >
              Status
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="h-[40.5px] px-6 py-3 text-left uppercase tracking-[0.05em] text-muted-foreground"
            >
              Plan
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="h-[40.5px] px-6 py-3 text-center uppercase tracking-[0.05em] text-muted-foreground"
            >
              Auto renewal
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="h-[40.5px] px-6 py-3 text-left uppercase tracking-[0.05em] text-muted-foreground"
            >
              Expiry
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="h-[40.5px] px-6 py-3 text-right uppercase tracking-[0.05em] text-muted-foreground"
            >
              Actions
            </CollectionTableHead>
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>
          {/* Two-line ledger rows stay tall; single-line registers opt into h-10. */}
          <TableRow className="h-[72.5px] border-0 hover:bg-sidebar-accent">
            <TableCell className="h-[72.5px] p-4 px-6 align-middle">
              <div className="flex h-10 items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
                >
                  <Server className="size-3.5" strokeWidth={1.75} />
                </div>
                <div className="flex h-10 min-w-0 flex-col justify-start">
                  <span className="truncate text-sm font-semibold leading-5 text-[#111827]">
                    Rencana Penanganan
                  </span>
                  <span className="truncate font-mono text-sm font-medium tracking-wide text-muted-foreground">
                    R-151
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="h-[72.5px] p-0 px-6 align-middle">
              <Badge
                size="compact"
                tone="success"
                className="h-5 px-2 text-xs font-semibold leading-5"
              >
                active
              </Badge>
            </TableCell>
            <TableCell className="h-[72.5px] p-4 px-6 align-middle">
              <div className="flex h-10 flex-col justify-start">
                <span className="text-sm font-medium leading-5 text-[#111827]">
                  Monthly
                </span>
                <span className="text-sm font-normal leading-5 text-muted-foreground">
                  Rp 60.000/month
                </span>
              </div>
            </TableCell>
            <TableCell className="h-[72.5px] p-0 px-6 text-center align-middle">
              <div className="flex justify-center">
                <Switch defaultChecked aria-label="Auto renewal aktif" />
              </div>
            </TableCell>
            <TableCell className="h-[72.5px] p-4 px-6 align-middle">
              <span className="text-sm font-normal leading-5 text-muted-foreground">
                21/08/2026
                <br />
                (8 days left)
              </span>
            </TableCell>
            <TableCell className="h-[72.5px] p-0 text-center align-middle">
              <Button
                variant="ghost"
                size="xs"
                className="bg-muted px-3 text-xs font-medium text-foreground shadow-none hover:bg-accent hover:text-foreground"
              >
                Manage
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CollectionTableCard>
  );
}
