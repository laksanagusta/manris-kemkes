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
        <CollectionTableHeader>
          <CollectionTableHeaderRow>
            <CollectionTableHead
              density="compact"
              className="text-left"
            >
              Name
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="text-left"
            >
              Status
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="text-left"
            >
              Plan
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="text-center"
            >
              Auto renewal
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="text-left"
            >
              Expiry
            </CollectionTableHead>
            <CollectionTableHead
              density="compact"
              className="text-right"
            >
              Actions
            </CollectionTableHead>
          </CollectionTableHeaderRow>
        </CollectionTableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <div className="flex h-10 items-center gap-3">
                <div
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
                >
                  <Server className="size-3.5" strokeWidth={1.75} />
                </div>
                <div className="flex h-10 min-w-0 flex-col justify-start">
                  <span className="truncate text-sm font-normal leading-5 text-foreground">
                    Rencana Penanganan
                  </span>
                  <span className="truncate font-mono text-[11px] leading-4 text-muted-foreground">
                    R-151
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge
                size="compact"
                tone="success"
                className="h-5 px-2 text-xs font-normal leading-5"
              >
                active
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex h-10 flex-col justify-start">
                <span className="text-sm font-normal leading-5 text-foreground">
                  Monthly
                </span>
                <span className="text-sm font-normal leading-5 text-muted-foreground">
                  Rp 60.000/month
                </span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="flex justify-center">
                <Switch defaultChecked aria-label="Auto renewal aktif" />
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm font-normal leading-5 text-muted-foreground">
                21/08/2026
                <br />
                (8 days left)
              </span>
            </TableCell>
            <TableCell className="text-center">
              <Button
                variant="ghost"
                size="xs"
                className="bg-muted px-3 text-xs font-normal text-foreground shadow-none hover:bg-accent hover:text-foreground"
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
