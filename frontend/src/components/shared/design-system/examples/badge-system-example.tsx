"use client";

import { Badge } from "@/components/ui/badge";
import { Check } from "@/components/shared/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { levelToColor } from "@/lib/risk";
import { getStatusBadgeClassName } from "@/lib/badge-variant";
import {
  designSystemBadgeVariants,
  designSystemBadgePalette,
  designSystemRiskLevels,
  designSystemStatusMapping,
} from "../data/badge-fixtures";

export function BadgeSystemExample() {
  return (
    <div className="space-y-5 rounded-(--surface-radius) bg-card p-6 shadow-black">
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Referensi Active · pill tanpa border · semibold</p>
        <Badge variant="secondary" className="bg-green-50">Active</Badge>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Palet referensi · 12px</p>
        <div className="flex flex-wrap gap-2">
          {designSystemBadgePalette.map((badge) => (
            <Badge key={badge.label} variant="outline" className={badge.className}>
              {badge.label}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Variant Badge</p>
        <div className="flex flex-wrap gap-2">
          {designSystemBadgeVariants.map((badge) => (
            <Badge
              key={badge.variant} variant={badge.variant}
            >
              {badge.label}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Status Mapping</p>
        <div className="flex flex-wrap gap-2">
          {designSystemStatusMapping.map((status) => (
            <Badge
              key={status.status} variant={status.variant} className={getStatusBadgeClassName(status.status)}
            >
              {status.status}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Context Badge</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary"
            className=""
          >
            2026-H1
          </Badge>
          <Badge variant="secondary"
            className=""
          >
            Tidak dilaporkan
          </Badge>
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          variant secondary · API Badge bawaan shadcn/ui
        </p>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Risk Level</p>
        <div className="flex flex-wrap gap-2">
          {designSystemRiskLevels.map((level) => (
            <Badge
              key={level.label} variant={level.variant} className={levelToColor(level.level)}
            >
              {level.label}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">With Icon & Counter</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-green-50"><Check aria-hidden="true" />Active</Badge>
          <Badge variant="outline">3</Badge>
          <Badge variant="secondary">RO</Badge>
        </div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Konteks tabel</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow><TableCell>Contoh ilustratif</TableCell><TableCell><Badge className="bg-green-50">Active</Badge></TableCell></TableRow></TableBody>
      </Table>
    </div>
  );
}
