"use client";

import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-5 rounded-[12px] bg-card p-6 shadow-black">
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
          <Badge variant="outline">Current</Badge>
          <Badge variant="outline">3</Badge>
          <Badge variant="secondary">RO</Badge>
        </div>
      </div>
    </div>
  );
}
