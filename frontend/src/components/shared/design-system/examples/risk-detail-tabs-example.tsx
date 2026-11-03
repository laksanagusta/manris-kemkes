"use client";

import { useCallback, useRef, useState } from "react";
import { RiskDetailTabs } from "@/components/risk/risk-detail-tabs";
import { RiskMonitoringTable } from "@/components/risk/risk-monitoring-list";
import { MitigationProgressTab } from "@/components/shared/mitigation-progress-tab";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MitigationTask, RiskMitigation } from "@/types/risk";

const plans: RiskMitigation[] = [
  {
    id: "plan-example",
    action: "Validasi kebutuhan dan stok logistik",
    owner: "Tim logistik",
    mitigationType: "reduce_probability",
    executionScheduleText: "Setiap triwulan",
    activityStage: "Validasi data kebutuhan",
    expectedOutput: "Daftar kebutuhan tervalidasi",
    quantitativeTarget: "Seluruh unit",
    supportingUnit: "Tim perencanaan",
    resourcesRequired: "Data stok",
    contingencyPlan: "Verifikasi langsung ke unit",
    potentialObstacle: "Keterlambatan data",
    isBreakthroughActivity: false,
  },
];
const tasks: MitigationTask[] = [
  {
    id: "task-example",
    mitigationId: "plan-example",
    riskId: "risk-example",
    periodLabel: "2026-Q3",
    periodStart: "2026-07-01",
    periodEnd: "2026-09-30",
    dueDate: "2026-10-15",
    status: "done",
    actualCost: 0,
    evidenceUrl: "",
    notes: "Kebutuhan logistik telah diverifikasi bersama unit terkait.",
    reportOutput: "",
    reportObstacle: "",
    generatedBy: "system",
    createdAt: "2026-07-01",
    updatedAt: "2026-10-01",
    reportedAt: "2026-10-01",
    reportedByName: "Tim logistik",
    mitigationAction: plans[0].action,
    mitigationOwner: plans[0].owner,
    riskCode: "R-001",
    riskTitle: "Keterlambatan distribusi logistik",
  },
];
tasks.push({
  ...tasks[0],
  id: "task-pending-example",
  status: "pending",
  notes: "",
  reportedAt: undefined,
  reportedByName: undefined,
  periodLabel: "2026-Q4",
  periodStart: "2026-10-01",
  periodEnd: "2026-12-31",
  dueDate: "2027-01-15",
});
tasks.push({
  ...tasks[0],
  id: "task-overdue-example",
  status: "overdue",
  notes: "",
  reportedAt: undefined,
  reportedByName: undefined,
  periodLabel: "2026-Q2",
  periodStart: "2026-04-01",
  periodEnd: "2026-06-30",
  dueDate: "2026-07-15",
});

export function RiskDetailTabsExample() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mitigationFilter, setMitigationFilter] = useState("all");
  const taskRef = useRef(tasks.map((task) => ({ ...task })));
  const loadExampleTasks = useCallback(async () => taskRef.current, []);
  const submitExampleReport = useCallback(
    async (
      task: MitigationTask,
      report: { notes: string; evidenceUrl: string },
    ) => {
      taskRef.current = taskRef.current.map((item) =>
        item.id === task.id
          ? {
              ...item,
              ...report,
              status: "done",
              reportedAt: new Date().toISOString(),
              reportedByName: "Operator contoh",
            }
          : item,
      );
    },
    [],
  );
  const [title, setTitle] = useState("Keterlambatan distribusi logistik");
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Data ilustrasi. Ketik pada Ringkasan lalu berpindah tab untuk mencoba
        preservasi isian. Pengiriman laporan contoh hanya memperbarui data
        ilustrasi di halaman ini.
      </p>
      <RiskDetailTabs
        enabled
        value={activeTab}
        onValueChange={setActiveTab}
        overview={
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan risiko</CardTitle>
              <CardDescription>
                Informasi dan penilaian risiko tetap menggunakan form produksi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <label
                htmlFor="risk-detail-example-title"
                className="text-sm font-medium"
              >
                Risiko
              </label>
              <Input
                id="risk-detail-example-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </CardContent>
          </Card>
        }
        monitoring={<RiskMonitoringTable items={[]} />}
        treatment={
          <MitigationProgressTab
            riskId="risk-example"
            token=""
            showTaskList
            mitigationFilter={mitigationFilter}
            onMitigationFilterChange={setMitigationFilter}
            loadTasks={loadExampleTasks}
            submitReport={submitExampleReport}
          />
        }
      />
    </div>
  );
}
