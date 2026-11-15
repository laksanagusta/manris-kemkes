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
  inUse: true,
  periods: [
    { id: "example-period-1", ordinal: 1, label: "Kuartal I", opensOn: "2027-04-01", closesOn: "2027-04-30" },
    { id: "example-period-2", ordinal: 2, label: "Kuartal II", opensOn: "2027-07-01", closesOn: "2027-07-31" },
    { id: "example-period-3", ordinal: 3, label: "Kuartal III", opensOn: "2027-10-01", closesOn: "2027-10-31" },
    { id: "example-period-4", ordinal: 4, label: "Kuartal IV", opensOn: "2028-01-01", closesOn: "2028-01-31" },
  ],
};

export function MonitoringRulesExample() {
  const [headerAction, setHeaderAction] = useState<HTMLDivElement | null>(null);
  const [rules, setRules] = useState<MonitoringRule[]>([illustrativeRule, { ...illustrativeRule, id: "example-unused-rule", name: "Alternatif kuartalan 2027", active: false, inUse: false }]);
  const nextId = useRef(1);

  async function create(input: CreateMonitoringRuleInput): Promise<boolean> {
    const id = `example-local-rule-${nextId.current++}`;
    setRules((current) => [{ ...input, id, periods: input.periods.map((period) => ({ ...period, id: `${id}-period-${period.ordinal}` })) }, ...current]);
    return true;
  }

  async function update(id: string, input: CreateMonitoringRuleInput): Promise<boolean> {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, ...input, periods: input.periods.map((period) => ({ ...period, id: rule.periods.find((item) => item.ordinal === period.ordinal)?.id ?? `${id}-period-${period.ordinal}` })) } : rule));
    return true;
  }

  async function remove(id: string): Promise<boolean> {
    setRules((current) => current.filter((rule) => rule.id !== id));
    return true;
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1 basis-40 space-y-2">
        <h3 className="text-base font-medium">Aturan periode</h3>
        <p className="text-xs text-muted-foreground">Tetapkan jadwal periode yang dapat dipilih pada profil risiko tahunan.</p>
      </div>
      <div ref={setHeaderAction} className="ms-auto shrink-0" />
    </header>
    <MonitoringRulesPanel headerAction={headerAction} rules={rules} loading={false} error="" pending={false} onRetry={() => setRules([illustrativeRule])} onCreate={create} onUpdate={update} onDelete={remove} />
  </div>;
}
