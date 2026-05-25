"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { createEvaluation } from "@/lib/api/evaluations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganizationPicker } from "@/components/report/organization-picker";
import {
  buildSelectableReportOrganizations,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

export default function NewEvaluationPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [period, setPeriod] = useState(currentGlobalCycle());
  const [creating, setCreating] = useState(false);

  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);

  useEffect(() => {
    if (!token) return;

    listAllOrganizations(token)
      .then((items) => {
        const selectable = buildSelectableReportOrganizations(user, items);
        setOrganizations(selectable);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar organisasi.");
      });
  }, [token, user]);

  useEffect(() => {
    if (!organizations.length || organizationId) return;
    const defaultOrgId = resolveDefaultReportOrgId(user);
    setOrganizationId(
      defaultOrgId && organizations.some((org) => org.id === defaultOrgId)
        ? defaultOrgId
        : requiresOrganizationSelection
          ? ""
          : organizations[0].id,
    );
  }, [organizationId, organizations, requiresOrganizationSelection, user]);

  const handleCreate = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!organizationId) {
      toast.error("Pilih organisasi terlebih dahulu.");
      return;
    }
    if (!period.trim()) {
      toast.error("Isi periode terlebih dahulu.");
      return;
    }

    setCreating(true);
    try {
      const evaluation = await createEvaluation(token, {
        organizationId,
        period: period.trim(),
      });
      toast.success("Evaluasi berhasil dibuat.");
      router.push(`/evaluations/${evaluation.id}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal membuat evaluasi.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 px-0 text-muted-foreground">
          <Link href="/evaluations">
            <ArrowLeft className="size-4" />
            Kembali ke daftar evaluasi
          </Link>
        </Button>
        <div className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Buat Evaluasi MR
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Buat draft evaluasi dari template aktif untuk organisasi dan periode
            yang dipilih. Setelah itu evaluasi bisa diisi, difinalisasi, dan diekspor ke PDF.
          </p>
        </div>
      </section>

      <Card className="max-w-3xl border-border/50 bg-card/90 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-sm font-semibold">Data Evaluasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>Organisasi</Label>
            <OrganizationPicker
              value={organizationId}
              organizations={organizations}
              onChange={setOrganizationId}
              placeholder="Pilih organisasi"
              searchPlaceholder="Cari organisasi..."
              emptyMessage="Tidak ada organisasi ditemukan."
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="period">Periode</Label>
            <Input
              id="period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              placeholder={currentGlobalCycle()}
              disabled={creating}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/evaluations">Batal</Link>
            </Button>
            <Button type="button" className="gap-2" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {creating ? "Membuat..." : "Buat Draft"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
