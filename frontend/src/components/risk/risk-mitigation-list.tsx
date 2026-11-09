"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ActionIconButton } from "@/components/shared/design-system/actions/action-icon-button";
import { Eye, Send } from "@/components/shared/icons";
import { CollectionTableCard } from "@/components/shared/design-system/collections/collection-table-card";
import { CollectionEmptyState } from "@/components/shared/design-system/collections/collection-empty-state";
import { CollectionToolbar } from "@/components/shared/design-system/collections/collection-toolbar";
import { CollectionSearchField } from "@/components/shared/design-system/collections/collection-search-field";
import { DynamicTableFilters } from "@/components/shared/design-system/collections/dynamic-table-filters";
import {
  MitigationCollectionTable,
  type MitigationTableColumn,
} from "@/components/shared/design-system/collections/mitigation-collection-table";
import type { RiskMitigation } from "@/types/risk";

const typeLabels: Record<string, string> = {
  reduce_probability: "Turunkan probabilitas",
  reduce_impact: "Turunkan dampak",
  reduce_both: "Turunkan probabilitas dan dampak",
};
const columns: readonly MitigationTableColumn[] = [
  { key: "plan", label: "Rencana Mitigasi", width: "25%" },
  { key: "owner", label: "PIC", width: "20%" },
  { key: "type", label: "Tipe mitigasi", width: "25%" },
  { key: "schedule", label: "Jadwal", width: "15%" },
  { key: "actions", label: "Aksi", width: "5%", action: true },
];
type Plan = Partial<RiskMitigation>;
const schedule = (item: Plan) =>
  item.executionScheduleText || item.dueDate?.split("T")[0] || "—";

export function RiskMitigationList({
  items,
  onViewReports,
}: {
  items: readonly Plan[];
  onViewReports?: (mitigationId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("all");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<Plan | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const owners = [...new Set(items.map((item) => item.owner || "unassigned"))];
  const filtered = items.filter(
    (item) =>
      (owner === "all" || (item.owner || "unassigned") === owner) &&
      (type === "all" || (item.mitigationType || "unspecified") === type) &&
      [
        item.action,
        item.owner,
        schedule(item),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const openDetail = (item: Plan, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setSelected(item);
  };
  return (
    <div className="space-y-4">
      <CollectionToolbar
        leading={
          <DynamicTableFilters
            search={
              <CollectionSearchField
                aria-label="Cari rencana mitigasi"
                placeholder="Cari mitigasi..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            }
            fields={[
              {
                id: "owner",
                label: "PIC",
                value: owner,
                onChange: setOwner,
                options: [
                  { value: "all", label: "Semua PIC" },
                  ...owners.map((value) => ({
                    value,
                    label: value === "unassigned" ? "Belum dipilih" : value,
                  })),
                ],
              },
              {
                id: "type",
                label: "Tipe mitigasi",
                value: type,
                onChange: setType,
                options: [
                  { value: "all", label: "Semua tipe" },
                  ...Object.entries(typeLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                  { value: "unspecified", label: "Belum dicatat" },
                ],
              },
            ]}
          />
        }
      />
      <CollectionTableCard>
        <MitigationCollectionTable columns={columns}>
          <TableBody>
            {filtered.length ? (
              filtered.map((item, index) => (
                <TableRow
                  key={item.id ?? index}
                  className="group hover:bg-transparent hover:[&>td]:bg-muted/50 [&>td]:transition-[background-color]"
                >
                  <TableCell className="align-middle">
                    <button
                      type="button"
                      onClick={(event) => openDetail(item, event.currentTarget)}
                      className="block w-full min-w-0 rounded-control text-left text-sm font-medium leading-5 text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span className="block truncate">
                        {item.action || "Rencana belum diisi"}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="align-middle">
                    <p className="truncate text-sm font-medium text-muted-foreground">
                      {item.owner || "Belum dipilih"}
                    </p>
                  </TableCell>
                  <TableCell className="align-middle">
                    {item.mitigationType ? (
                      <Badge variant="secondary">
                        {typeLabels[item.mitigationType] ?? item.mitigationType}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="align-middle">
                    <p className="text-muted-foreground">{schedule(item)}</p>
                  </TableCell>
                  <TableCell className="sticky right-0 z-10 text-right align-middle">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <ActionIconButton
                          type="button"
                          onFocus={(event) => {
                            triggerRef.current = event.currentTarget;
                          }}
                          aria-label={`Aksi mitigasi ${item.action || "mitigasi"}`}
                          onClick={(event) => {
                            triggerRef.current = event.currentTarget;
                          }}
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            if (triggerRef.current)
                              openDetail(item, triggerRef.current);
                          }}
                        >
                          <Eye className="size-3.5" />
                          Rincian mitigasi
                        </DropdownMenuItem>
                        {item.id && onViewReports ? (
                          <DropdownMenuItem
                            onClick={() => onViewReports(item.id!)}
                          >
                            <Send className="size-3.5" />
                            Lihat laporan penanganan
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <CollectionEmptyState
                    title={items.length ? "Tidak ada mitigasi sesuai filter" : "Belum ada rencana mitigasi"}
                    description={items.length ? "Ubah kata kunci atau filter untuk melihat rencana lain." : "Rencana yang dicatat pada Ringkasan akan ditampilkan di sini."}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </MitigationCollectionTable>
      </CollectionTableCard>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent
          className="max-h-[85svh] overflow-y-auto sm:max-w-2xl"
          onCloseAutoFocus={(event) => {
            if (triggerRef.current?.isConnected) {
              event.preventDefault();
              triggerRef.current.focus();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Rincian mitigasi</DialogTitle>
            <DialogDescription>
              Tinjau rencana, penanggung jawab, dan rincian pelaksanaannya.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <p className="whitespace-pre-wrap text-sm font-medium wrap-break-word">
                {selected.action || "Rencana belum diisi"}
              </p>
              <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">PIC</dt>
                  <dd className="mt-1">{selected.owner || "Belum dipilih"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Jadwal</dt>
                  <dd className="mt-1">{schedule(selected)}</dd>
                </div>
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
