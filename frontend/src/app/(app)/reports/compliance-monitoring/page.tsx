"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  buildSelectableReportOrganizations,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
import { OrganizationPicker } from "@/components/report/organization-picker";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { OverdueMitigationTimeline } from "../_components/overdue-mitigation-timeline";
import { UnitResponseTimeChart } from "../_components/unit-response-time";
import type {
  OverdueMitigationTimelineItem,
  UnitResponseTime,
} from "@/types/risk";

export default function ComplianceMonitoringPage() {
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [organizationId, setOrganizationId] = useState("");
  const [overdueTimelineData, setOverdueTimelineData] = useState<
    OverdueMitigationTimelineItem[]
  >([]);
  const [responseTimeData, setResponseTimeData] = useState<UnitResponseTime[]>(
    [],
  );

  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);
  const organizationQuery = organizationId
    ? `?org_id=${encodeURIComponent(organizationId)}`
    : "";

  useEffect(() => {
    if (!token) {
      setOrganizations([]);
      setOrganizationId("");
      return;
    }

    listAllOrganizations(token)
      .then((items) => {
        setOrganizations(buildSelectableReportOrganizations(user, items));
      })
      .catch((error) => {
        console.error(error);
      });
  }, [token, user]);

  useEffect(() => {
    if (organizations.length === 0) {
      setOrganizationId("");
      return;
    }

    if (user?.isGlobal) {
      setOrganizationId("");
      return;
    }

    const defaultOrgId = resolveDefaultReportOrgId(user);
    if (defaultOrgId) {
      setOrganizationId((current) => current || defaultOrgId);
      return;
    }

    if (requiresOrganizationSelection) {
      setOrganizationId("");
      return;
    }

    setOrganizationId((current) => current || organizations[0]?.id || "");
  }, [organizations, requiresOrganizationSelection, user]);

  useEffect(() => {
    if (!token) return;

    if (requiresOrganizationSelection && !organizationId) {
      setOverdueTimelineData([]);
      setResponseTimeData([]);
      return;
    }

    Promise.all([
      api.get<OverdueMitigationTimelineItem[]>(
        `/dashboard/overdue-mitigation-timeline${organizationQuery}`,
        token,
      ),
      api.get<UnitResponseTime[]>(
        `/dashboard/unit-response-time${organizationQuery}`,
        token,
      ),
    ])
      .then(([overdueResult, responseResult]) => {
        setOverdueTimelineData(overdueResult);
        setResponseTimeData(responseResult);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [token, organizationId, organizationQuery, requiresOrganizationSelection]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Monitoring Kepatuhan
        </h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan overdue mitigasi dan waktu respons unit dalam satu halaman.
        </p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="min-w-[220px] flex-1 md:max-w-sm">
            <OrganizationPicker
              value={organizationId}
              organizations={organizations}
              onChange={setOrganizationId}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {requiresOrganizationSelection ? (
              <span>
                Pilih unit terlebih dahulu untuk melihat data monitoring
                lintas-unit.
              </span>
            ) : (
              <span>Monitoring akan mengikuti unit Anda secara default.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <OverdueMitigationTimeline data={overdueTimelineData} />
        <UnitResponseTimeChart data={responseTimeData} />
      </div>
    </div>
  );
}
