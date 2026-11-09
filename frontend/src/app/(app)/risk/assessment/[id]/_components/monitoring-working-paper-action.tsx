"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ActionButton } from "@/components/shared/design-system";
import { findActiveWorkingPaperForPeriod } from "@/lib/api/working-papers";

type Props = {
  token?: string | null;
  cycle: string;
  organizationId: string;
  canCreate: boolean;
  useOrganizationQuery: boolean;
};

export function MonitoringWorkingPaperAction({ token, cycle, organizationId, canCreate, useOrganizationQuery }: Props) {
  const [lookup, setLookup] = useState<{ key: string; paperId: string | null } | null>(null);
  const key = `${organizationId}:${cycle}`;

  useEffect(() => {
    if (!token || !cycle || !organizationId) return;
    let active = true;
    void findActiveWorkingPaperForPeriod(token, organizationId, cycle).then((paper) => {
      if (active) setLookup({ key, paperId: paper?.id ?? null });
    }).catch(() => {});
    return () => { active = false; };
  }, [token, cycle, organizationId, key]);

  if (!cycle) return null;
  const current = lookup?.key === key ? lookup : null;
  const createQuery = new URLSearchParams({ cycle });
  if (useOrganizationQuery) createQuery.set("org_id", organizationId);
  let href = `/risk/working-papers?assessment_cycle=${encodeURIComponent(cycle)}`;
  let label = `Lihat Kertas Kerja ${cycle}`;
  if (current?.paperId) {
    href = `/risk/working-papers/${current.paperId}`;
    label = `Buka Kertas Kerja ${cycle}`;
  } else if (current && canCreate) {
    href = `/risk/working-papers/new?${createQuery}`;
    label = `Buat Kertas Kerja ${cycle}`;
  }
  return <ActionButton asChild variant="outline"><Link href={href}>{label}</Link></ActionButton>;
}
