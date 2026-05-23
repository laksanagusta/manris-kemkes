"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations } from "@/lib/api/organizations";
import {
  generateFormalReport,
  listFormalReports,
} from "@/lib/api/formal-reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormalReportCard } from "../_components/formal-report-card";
import { FormalReportList } from "../_components/formal-report-list";
import type { OrganizationListItem } from "@/lib/api/organizations";
import {
  buildSelectableReportOrganizations,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
import { OrganizationPicker } from "@/components/report/organization-picker";
import { formalReportDefinitions } from "@/lib/formal-report-definitions";
import type { FormalReport, FormalReportType } from "@/types/formal-report";

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

export default function FormalReportsPage() {
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [formalReports, setFormalReports] = useState<FormalReport[]>([]);
  const [formalReportsLoading, setFormalReportsLoading] = useState(true);
  const [formalGenerateLoading, setFormalGenerateLoading] =
    useState<FormalReportType | null>(null);
  const [formalOrganizationId, setFormalOrganizationId] = useState("");
  const [formalPeriod, setFormalPeriod] = useState(currentGlobalCycle());
  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);

  useEffect(() => {
    if (!token) {
      setFormalReportsLoading(false);
      return;
    }

    setFormalReportsLoading(true);
    Promise.all([listAllOrganizations(token), listFormalReports(token, { page: 1, limit: 100 })])
      .then(([orgs, reports]) => {
        setOrganizations(buildSelectableReportOrganizations(user, orgs));
        setFormalReports(reports.data ?? []);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat data laporan formal.");
      })
      .finally(() => {
        setFormalReportsLoading(false);
      });
  }, [token, user]);

  useEffect(() => {
    if (organizations.length === 0) return;
    if (!formalOrganizationId) {
      const defaultOrgId = resolveDefaultReportOrgId(user);
      setFormalOrganizationId(
        defaultOrgId && organizations.some((org) => org.id === defaultOrgId)
          ? defaultOrgId
          : requiresOrganizationSelection
            ? ""
            : organizations[0].id,
      );
    }
  }, [formalOrganizationId, organizations, requiresOrganizationSelection, user]);

  const organizationMap = useMemo(
    () =>
      new Map(organizations.map((organization) => [organization.id, organization.name])),
    [organizations],
  );

  const formalReportByType = useMemo(() => {
    const filtered = formalReports.filter(
      (report) =>
        report.organizationId === formalOrganizationId &&
        report.period === formalPeriod,
    );

    return formalReportDefinitions.reduce((map, item) => {
      const latest = filtered
        .filter((report) => report.reportType === item.reportType)
        .sort((a, b) => {
          const left = new Date(a.generatedAt ?? a.updatedAt).getTime();
          const right = new Date(b.generatedAt ?? b.updatedAt).getTime();
          return right - left;
        })[0];
      map.set(item.reportType, latest ?? null);
      return map;
    }, new Map<FormalReportType, FormalReport | null>());
  }, [formalOrganizationId, formalPeriod, formalReports]);

  const sortedFormalReports = useMemo(
    () =>
      [...formalReports].sort((a, b) => {
        const left = new Date(a.generatedAt ?? a.updatedAt).getTime();
        const right = new Date(b.generatedAt ?? b.updatedAt).getTime();
        return right - left;
      }),
    [formalReports],
  );

  const handleGenerateFormalReport = async (reportType: FormalReportType) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!formalOrganizationId) {
      toast.error("Pilih organisasi terlebih dahulu.");
      return;
    }
    if (!formalPeriod.trim()) {
      toast.error("Isi periode terlebih dahulu.");
      return;
    }

    setFormalGenerateLoading(reportType);
    try {
      const response = await generateFormalReport(token, {
        organizationId: formalOrganizationId,
        period: formalPeriod.trim(),
        reportType,
        generatedBy: user?.id ?? undefined,
      });

      setFormalReports((current) =>
        [response, ...current.filter((item) => item.id !== response.id)].sort(
          (a, b) => {
            const left = new Date(a.generatedAt ?? a.updatedAt).getTime();
            const right = new Date(b.generatedAt ?? b.updatedAt).getTime();
            return right - left;
          },
        ),
      );
      toast.success("Laporan formal berhasil digenerate.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal generate laporan formal.",
      );
    } finally {
      setFormalGenerateLoading(null);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <section className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Laporan Formal
        </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
          Generate laporan resmi per organisasi dan periode, lalu lihat histori
          hasilnya di halaman ini.
        </p>
      </section>

      {requiresOrganizationSelection && !formalOrganizationId ? (
        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardContent className="flex min-h-40 items-center justify-center px-6 py-8 text-center">
            <div className="max-w-sm space-y-2">
              <p className="text-sm font-medium text-foreground">
                Pilih unit terlebih dahulu
              </p>
              <p className="text-sm text-muted-foreground">
                Laporan formal lintas-unit baru bisa dibuka setelah unit dipilih.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-4" />
            Generator Laporan
          </CardTitle>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Pilih organisasi dan periode, lalu muat daftar laporan yang sudah
            tersedia.
          </p>
        </div>

        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto] xl:items-end">
              <div className="space-y-2">
                <Label>Organisasi tujuan</Label>
                <OrganizationPicker
                  value={formalOrganizationId}
                  organizations={organizations}
                  onChange={setFormalOrganizationId}
                  placeholder="Pilih organisasi"
                  searchPlaceholder="Cari organisasi..."
                  emptyMessage="Tidak ada organisasi ditemukan."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formal-period">Periode laporan</Label>
                <Input
                  id="formal-period"
                  value={formalPeriod}
                  onChange={(event) => setFormalPeriod(event.target.value)}
                  placeholder={currentGlobalCycle()}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 xl:w-auto xl:min-w-56"
                onClick={() => {
                  setFormalReports([]);
                  setFormalReportsLoading(true);
                  listFormalReports(token ?? "", { page: 1, limit: 100 })
                    .then((response) => {
                      setFormalReports(response.data ?? []);
                    })
                    .catch((error) => {
                      console.error(error);
                      toast.error("Gagal memuat laporan formal.");
                    })
                    .finally(() => {
                      setFormalReportsLoading(false);
                    });
                }}
                disabled={!token || formalReportsLoading}
              >
                {formalReportsLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <TrendingUp className="size-4" />
                )}
                {formalReportsLoading ? "Menyegarkan..." : "Muat Laporan Formal"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-tight">
            Jenis Laporan
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Empat tipe laporan resmi tersedia untuk periode dan organisasi
            yang dipilih.
          </p>
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {formalReportDefinitions.map((item) => (
            <FormalReportCard
              key={item.reportType}
              title={item.title}
              description={item.description}
              reportType={item.reportType}
              latestReport={formalReportByType.get(item.reportType) ?? null}
              isGenerating={formalGenerateLoading === item.reportType}
              disabled={!formalOrganizationId || !formalPeriod.trim()}
              onGenerate={handleGenerateFormalReport}
            />
          ))}
        </div>
      </section>

      <FormalReportList
        reports={sortedFormalReports}
        organizationNameById={organizationMap}
      />
    </div>
  );
}
