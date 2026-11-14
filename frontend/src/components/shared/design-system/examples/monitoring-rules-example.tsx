"use client";

import { useRef, useState } from "react";
import { MonitoringRulesPanel } from "@/components/settings/monitoring-rules-settings";
import type { CreateMonitoringRuleInput, MonitoringRule } from "@/lib/api/monitoring-rules";

const illustrativeRule: MonitoringRule = {
  id: "example-rule-quarterly-2027",
  name: "Pemantauan kuartalan 2027",
  year: 2027,
  frequency: "quarterly",
  active: true,
  periods: [
    { id: "example-period-1", ordinal: 1, label: "Kuartal I", opensOn: "2027-04-01", closesOn: "2027-04-30" },
    { id: "example-period-2", ordinal: 2, label: "Kuartal II", opensOn: "2027-07-01", closesOn: "2027-07-31" },
    { id: "example-period-3", ordinal: 3, label: "Kuartal III", opensOn: "2027-10-01", closesOn: "2027-10-31" },
    { id: "example-period-4", ordinal: 4, label: "Kuartal IV", opensOn: "2028-01-01", closesOn: "2028-01-31" },
  ],
};

export function MonitoringRulesExample() {
  const [rules, setRules] = useState<MonitoringRule[]>([illustrativeRule]);
  const nextId = useRef(1);

  async function create(input: CreateMonitoringRuleInput): Promise<boolean> {
    const id = `example-local-rule-${nextId.current++}`;
    setRules((current) => [{ ...input, id, periods: input.periods.map((period) => ({ ...period, id: `${id}-period-${period.ordinal}` })) }, ...current]);
    return true;
  }

  return <MonitoringRulesPanel rules={rules} loading={false} error="" pending={false} onRetry={() => setRules([illustrativeRule])} onCreate={create} />;
}
