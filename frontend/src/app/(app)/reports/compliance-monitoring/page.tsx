"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { OverdueMitigationTimeline } from "../_components/overdue-mitigation-timeline";
import { KRIBreachSummary } from "../_components/kri-breach-summary";
import { UnitResponseTimeChart } from "../_components/unit-response-time";
import type {
  KRIBreachItem,
  OverdueMitigationTimelineItem,
  UnitResponseTime,
} from "@/types/risk";

export default function ComplianceMonitoringPage() {
  const { token } = useAuth();
  const [overdueTimelineData, setOverdueTimelineData] = useState<
    OverdueMitigationTimelineItem[]
  >([]);
  const [kriBreachData, setKriBreachData] = useState<KRIBreachItem[]>([]);
  const [responseTimeData, setResponseTimeData] = useState<UnitResponseTime[]>(
    [],
  );

  useEffect(() => {
    if (!token) return;

    Promise.all([
      api.get<OverdueMitigationTimelineItem[]>(
        "/dashboard/overdue-mitigation-timeline",
        token,
      ),
      api.get<KRIBreachItem[]>("/dashboard/kri-breach-summary", token),
      api.get<UnitResponseTime[]>("/dashboard/unit-response-time", token),
    ])
      .then(([overdueResult, kriResult, responseResult]) => {
        setOverdueTimelineData(overdueResult);
        setKriBreachData(kriResult);
        setResponseTimeData(responseResult);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [token]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Monitoring Kepatuhan
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan overdue mitigasi, breach KRI, dan waktu respons unit dalam
          satu halaman.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <OverdueMitigationTimeline data={overdueTimelineData} />
        <KRIBreachSummary data={kriBreachData} />
        <UnitResponseTimeChart data={responseTimeData} />
      </div>
    </div>
  );
}
