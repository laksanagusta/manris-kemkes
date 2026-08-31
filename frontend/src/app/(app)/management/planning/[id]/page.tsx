"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Building2, Layers3, ShieldCheck } from "@/components/ui/icons";

import { useAuth } from "@/contexts/auth-context";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  listPlanningObjectiveCompatibility,
  type ListPlanningObjectiveCompatibilityParams,
} from "@/lib/api/planning";
import type { PlanningObjectiveCompatibilityItem } from "@/types/planning";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ActionButton,
  CollectionPageHeader,
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";

function infoItem(label: string, value?: string | null) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm leading-6 text-foreground">{value || "-"}</p>
    </div>
  );
}

export default function PlanningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [items, setItems] = useState<PlanningObjectiveCompatibilityItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const activeToken = token;

    async function load() {
      try {
        setLoading(true);
        const params: ListPlanningObjectiveCompatibilityParams = {
          page: 1,
          limit: 100,
        };
        const [rows, orgs] = await Promise.all([
          listPlanningObjectiveCompatibility(activeToken, params),
          listAllOrganizations(activeToken),
        ]);
        if (!active) return;
        setItems(rows.data ?? []);
        setOrganizations(orgs);
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Gagal memuat detail struktur.";
        toast.error(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  const organizationMap = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );

  const item = useMemo(
    () => items.find((row) => row.id === id) ?? null,
    [id, items],
  );

  if (!token) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Silakan masuk untuk membuka detail struktur kinerja.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Memuat detail struktur...
        </CardContent>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10">
          <p className="text-sm text-muted-foreground">
            Struktur dengan ID tersebut belum ditemukan di cache kompatibilitas.
          </p>
          <ActionButton asChild variant="secondary" size="sm">
            <Link href="/management/planning">
              <ArrowLeft className="size-3.5" />
              Kembali ke Struktur Kinerja &amp; RO
            </Link>
          </ActionButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <PageStack>
      <CollectionPageHeader
        eyebrow={
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Risk Governance
          </p>
        }
        title="Detail Struktur Kinerja"
        backAction={
          <ActionButton asChild variant="secondary" size="sm">
            <Link href="/management/planning">
              <ArrowLeft className="size-3.5" />
              Kembali
            </Link>
          </ActionButton>
        }
        actions={
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            Kompatibilitas
          </Badge>
        }
      />

      <MetricGrid className="md:grid-cols-3 xl:grid-cols-3">
        <KpiCard
          label="Periode"
          value={item.period}
          tone="white"
          icon={<Layers3 className="size-5 text-muted-foreground" />}
        />
        <KpiCard
          label="Satker"
          value={organizationMap.get(item.organizationId) ?? item.organizationId}
          tone="white"
          icon={<Building2 className="size-5 text-muted-foreground" />}
        />
        <KpiCard
          label="Status"
          value={item.status || "draft"}
          tone="white"
          icon={<ShieldCheck className="size-5 text-muted-foreground" />}
        />
      </MetricGrid>

      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-[15px] font-semibold">
            Rantai Hierarki
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {infoItem("Tujuan", item.tujuan)}
          <Separator />
          {infoItem("Sasaran", item.sasaran)}
          <Separator />
          {infoItem("IKU", item.indikatorKinerjaUtama)}
          <Separator />
          {infoItem("Target", item.target)}
          <Separator />
          {infoItem("Program", item.program)}
          <Separator />
          {infoItem("Kegiatan", item.kegiatan)}
          <Separator />
          {infoItem("RO", item.processBusiness)}
          <Separator />
          {infoItem("Periode", item.period)}
        </CardContent>
      </Card>
    </PageStack>
  );
}
