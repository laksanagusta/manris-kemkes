"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Building2, Layers3, ShieldCheck } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const router = useRouter();
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
      <Card className="border-border/50">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Silakan masuk untuk membuka detail struktur kinerja.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Memuat detail struktur...
        </CardContent>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card className="border-border/50">
        <CardContent className="space-y-4 py-10">
          <p className="text-sm text-muted-foreground">
            Struktur dengan ID tersebut belum ditemukan di cache kompatibilitas.
          </p>
          <Button asChild variant="outline">
            <Link href="/management/planning">
              <ArrowLeft className="mr-2 size-4" />
              Kembali ke Struktur Kinerja &amp; RO
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Risk Governance
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Detail Struktur Kinerja
            </h2>
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              Kompatibilitas
            </Badge>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Halaman ini menampilkan satu rantai planning lengkap yang nantinya
            menjadi sumber utama untuk penautan risiko ke RO.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/management/planning">
            <ArrowLeft className="mr-2 size-4" />
            Kembali
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-full bg-blue-500/10 p-3 text-blue-600">
              <Layers3 className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Periode
              </p>
              <p className="text-2xl font-semibold">{item.period}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Satker
              </p>
              <p className="text-2xl font-semibold">
                {organizationMap.get(item.organizationId) ??
                  item.organizationId}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex items-center gap-3 py-5">
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </p>
              <p className="text-2xl font-semibold">{item.status || "draft"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
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
    </div>
  );
}
