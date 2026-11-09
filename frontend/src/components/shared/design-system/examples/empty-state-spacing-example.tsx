"use client";

import { useState } from "react";
import { AiAssistIconButton } from "@/components/shared/ai-assist-icon-button";
import { EditableInsetItems } from "@/components/shared/editable-inset-items";
import type { EditableItem } from "@/components/shared/editable-items-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CollectionTableCard } from "../collections/collection-table-card";
import { CollectionEmptyState } from "../collections/collection-empty-state";
import { CollectionTableHeader } from "../collections/collection-table-header";
import { CollectionTableHeaderRow } from "../collections/collection-table-header-row";
import { CollectionTableHead } from "../collections/collection-table-head";
import { InlineEmptyState } from "../feedback/inline-empty-state";
import { ReportEmptyState } from "../reports/report-empty-state";
import { PopoverSelectField } from "../fields/popover-select-field";

const modes = [
  "Tanpa data",
  "Hasil filter",
  "Laporan",
  "Inline",
  "Picker",
] as const;
type Mode = (typeof modes)[number];

export function CauseImpactEditorExample() {
  const [causes, setCauses] = useState<EditableItem[]>([]);
  const [impacts, setImpacts] = useState<EditableItem[]>([]);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <EditableInsetItems
        items={causes}
        onChange={setCauses}
        emptyMessage="Belum ada sebab"
        itemLabel="Sebab"
        header={<span className="text-sm font-medium">Sebab</span>}
        beforeAdd={<AiAssistIconButton label="Susun sebab dengan AI" disabled onClick={() => {}} />}
      />
      <EditableInsetItems
        items={impacts}
        onChange={setImpacts}
        emptyMessage="Belum ada dampak"
        itemLabel="Dampak"
        header={<span className="text-sm font-medium">Dampak</span>}
        beforeAdd={<AiAssistIconButton label="Susun dampak dengan AI" disabled onClick={() => {}} />}
      />
    </div>
  );
}

export function EmptyStateSpacingExample() {
  const [mode, setMode] = useState<Mode>("Tanpa data");
  const [notice, setNotice] = useState("");
  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Contoh penempatan empty state"
      >
        {modes.map((item) => (
          <Button
            key={item}
            variant={mode === item ? "secondary" : "outline"}
            aria-pressed={mode === item}
            onClick={() => {
              setMode(item);
              setNotice("");
            }}
          >
            {item}
          </Button>
        ))}
      </div>
      {mode === "Tanpa data" ? (
        <CollectionTableCard>
          <CollectionEmptyState
            title="Belum ada task penanganan"
            description="Task akan muncul setelah risiko difinalisasi. Periksa rencana mitigasi dan penanggung jawab sebelum melanjutkan."
            action={
              <Button
                onClick={() =>
                  setNotice("Aksi ilustratif. Tidak ada data yang diubah.")
                }
              >
                Tinjau rencana
              </Button>
            }
          />
        </CollectionTableCard>
      ) : null}
      {mode === "Hasil filter" ? (
        <CollectionTableCard>
          <Table>
            <CollectionTableHeader>
              <CollectionTableHeaderRow>
                <CollectionTableHead>Rencana</CollectionTableHead>
                <CollectionTableHead>PIC</CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2}>
                  <CollectionEmptyState
                    title="Tidak ada task yang sesuai"
                    description="Coba ubah kata kunci atau filter pencarian untuk melihat rencana penanganan lainnya."
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CollectionTableCard>
      ) : null}
      {mode === "Laporan" ? (
        <Card>
          <CardContent>
            <ReportEmptyState description="Belum ada data laporan pada periode dan cakupan ini." />
          </CardContent>
        </Card>
      ) : null}
      {mode === "Inline" ? (
        <Card>
          <CardContent>
            <InlineEmptyState message="Belum ada catatan tambahan." />
          </CardContent>
        </Card>
      ) : null}
      {mode === "Picker" ? (
        <PopoverSelectField
          value=""
          onValueChange={() => {}}
          options={[]}
          placeholder="Pilih penanggung jawab"
          ariaLabel="Contoh picker kosong"
        />
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
