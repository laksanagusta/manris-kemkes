"use client";

import { Badge } from "@/components/shared/design-system";
import {
  designSystemBadgeTones,
  designSystemRiskLevels,
  designSystemStatusMapping,
} from "../data/badge-fixtures";

export function BadgeSystemExample() {
  return (
    <div className="space-y-5 rounded-2xl bg-card p-6 shadow-none">
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Tone Palette</p>
        <div className="flex flex-wrap gap-2">
          {designSystemBadgeTones.map((tone) => (
            <Badge
              key={tone.tone}
              tone={tone.tone}
              size="compact"
            >
              {tone.label}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Status Mapping</p>
        <div className="flex flex-wrap gap-2">
          {designSystemStatusMapping.map((status) => (
            <Badge
              key={status.status}
              tone={status.tone}
              size="compact"
            >
              {status.status}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">Risk Level</p>
        <div className="flex flex-wrap gap-2">
          {designSystemRiskLevels.map((level) => (
            <Badge
              key={level.label}
              tone={level.tone}
              size="compact"
            >
              {level.label}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-xs font-medium text-foreground">With Icon & Counter</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info" size="compact">Current</Badge>
          <Badge tone="info" size="compact">3</Badge>
          <Badge tone="neutral" size="micro">RO</Badge>
        </div>
      </div>
    </div>
  );
}
