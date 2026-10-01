"use client";

import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { MonitoringCycleSelect } from "@/components/shared/design-system/domain/monitoring-cycle-select";
import type { MonitoringCycleSelectOption } from "@/components/shared/design-system/domain/monitoring-cycle-select";

const options: MonitoringCycleSelectOption[] = [
  { value: "2026-Q3", label: "2026-Q3", status: "not-started" },
  { value: "2026-Q4", label: "2026-Q4", status: "current-period" },
];

export function MonitoringCycleSelectExample() {
  const [value, setValue] = useState("2026-Q3");

  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="design-system-monitoring-cycle">
        Periode pemantauan
      </FieldLabel>
      <MonitoringCycleSelect
        id="design-system-monitoring-cycle"
        value={value}
        options={options}
        onValueChange={setValue}
      />
    </Field>
  );
}
