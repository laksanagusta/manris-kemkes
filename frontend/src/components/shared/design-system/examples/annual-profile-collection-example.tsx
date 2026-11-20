"use client";

import { useCallback, useState } from "react";
import { PageStack } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import {
  HeaderActionsProvider,
  useHeaderActions,
} from "@/lib/header-actions-context";
import { AnnualProfileCollection } from "@/components/upr/annual-profile-collection";
import type {
  AnnualPickupRisk,
  AnnualProfileListVersion,
} from "@/lib/api/upr-workflow";
import type { ProfilePeriodWorkspace } from "@/lib/api/profile-periods";
import type { MonitoringRule } from "@/lib/api/monitoring-rules";
import { AnnualProfileExample } from "./annual-profile-example";

const initial: AnnualProfileListVersion[] = [
  {
    id: "example-child-2026-v1",
    year: 2026,
    version: 1,
    finalizedAt: null,
    updatedAt: "2026-11-12T00:00:00Z",
    riskCount: 1,
    organizationId: "example-child",
    organizationName: "Unit bawahan contoh",
  },
  {
    id: "example-2026-v2",
    year: 2026,
    version: 2,
    finalizedAt: null,
    updatedAt: "2026-11-12T00:00:00Z",
    riskCount: 2,
  },
  {
    id: "example-2026-v1",
    year: 2026,
    version: 1,
    finalizedAt: "2026-06-30T00:00:00Z",
    updatedAt: "2026-06-30T00:00:00Z",
    riskCount: 1,
  },
  {
    id: "example-2025-v1",
    year: 2025,
    version: 1,
    finalizedAt: "2025-12-01T00:00:00Z",
    updatedAt: "2025-12-01T00:00:00Z",
    riskCount: 2,
  },
];
const register: AnnualPickupRisk[] = [
  {
    id: "sample-1",
    code: "R-014",
    title: "Keterlambatan validasi data",
    period: "2026-Q1",
    assessmentDate: "2026-03-12",
    category: "operasional",
    score: 15,
    unavailable: "",
  },
  {
    id: "sample-2",
    code: "R-021",
    title: "Ketergantungan pada satu petugas",
    period: "2026-Q3",
    assessmentDate: "2026-08-20",
    category: "operasional",
    score: 12,
    unavailable: "",
  },
];
const inactive: AnnualPickupRisk = {
  id: null,
  code: "R-009",
  title: "Kendala pada sistem lama",
  period: "",
  assessmentDate: null,
  category: "operasional",
  score: 8,
  unavailable: "Diarsipkan atau tidak lagi aktif",
};

function ExampleHeaderActionSlot({ year }: { year?: number }) {
  const actions = useHeaderActions();
  return actions ? (
    <div className="flex min-h-14 items-center border-b border-border py-2">
      <nav
        aria-label="Breadcrumb"
        className="min-w-0 truncate text-xs text-muted-foreground"
      >
        Profil Risiko Tahunan
        <span aria-hidden="true" className="px-2 text-muted-foreground/50">
          /
        </span>
        <span className="text-foreground">{year}</span>
      </nav>
      <div className="ms-auto flex shrink-0 items-center">{actions}</div>
    </div>
  ) : null;
}

const exampleRule2026: MonitoringRule = {
  id: "example-rule-2026",
  name: "Pemantauan semesteran 2026",
  year: 2026,
  frequency: "semester",
  active: true,
  periods: [
    { id: "example-2026-h1", label: "Semester I", ordinal: 1, opensOn: "2026-01-01", closesOn: "2026-06-30" },
    { id: "example-2026-h2", label: "Semester II", ordinal: 2, opensOn: "2026-07-01", closesOn: "2026-12-31" },
  ],
};
function exampleWorkspace(rule: MonitoringRule, version = 1): ProfilePeriodWorkspace {
  return {
    year: rule.year,
    version,
    rule,
    periods: rule.periods.map((period) => ({
      ...period,
      workingPaper: { status: "pending", completed: 0, total: 0 },
      evaluation: { status: "pending", completed: 0, total: 0 },
      monitorings: [],
    })),
  };
}

const exampleRules: MonitoringRule[] = [
  {
    id: "example-rule-2027",
    name: "Pemantauan semesteran 2027",
    year: 2027,
    frequency: "semester",
    active: true,
    periods: [
      { id: "example-2027-h1", label: "Semester I", ordinal: 1, opensOn: "2027-01-01", closesOn: "2027-06-30" },
      { id: "example-2027-h2", label: "Semester II", ordinal: 2, opensOn: "2027-07-01", closesOn: "2027-12-31" },
    ],
  },
];
const loadRules = async (search = ""): Promise<MonitoringRule[]> =>
  exampleRules.filter(rule => `${rule.year} ${rule.name}`.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID"))).slice(0, 5);


export function AnnualProfileCollectionExample() {
  const [versions, setVersions] = useState(initial);
  const [periodProgress, setPeriodProgress] = useState<Record<string, ProfilePeriodWorkspace>>({
    "example-2026-v1": exampleWorkspace(exampleRule2026),
    "example-2025-v1": { year: 2025, version: 1, rule: null, periods: [] },
  });
  const [pickedByVersion, setPickedByVersion] = useState<
    Record<string, AnnualPickupRisk[]>
  >({});
  const [detail, setDetail] = useState<{
    version: AnnualProfileListVersion;
    risks?: AnnualPickupRisk[];
  } | null>(null);
  const loadPickup = useCallback(
    async (_year: number, source: string | null) =>
      source ? [register[0], inactive] : register,
    [],
  );
  return (
    <HeaderActionsProvider>
      <PageStack>
        <ExampleHeaderActionSlot year={detail?.version.year} />
        <p className="text-xs text-muted-foreground">
          Contoh dengan data ilustratif. Coba tambah profil 2027 dari Register
          atau profil final sebelumnya. Aturan aktif untuk 2027 terpilih otomatis.
        </p>
        {detail ? (
          <>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Kembali ke daftar profil contoh
            </Button>
            <AnnualProfileExample
              key={detail.version.id}
              year={detail.version.year}
              sampleVersion={detail.version}
              sampleVersions={versions.filter(
                (version) => version.year === detail.version.year && version.organizationId === detail.version.organizationId,
              )}
              pickup={detail.risks}
              readOnly={detail.version.organizationId === "example-child"}
            />
          </>
        ) : (
          <AnnualProfileCollection
            embedded
            organization="UPR-T.II · Unit contoh"
            organizationId="example-owner"
            versions={versions}
            defaultYear={2027}
            retry={() => undefined}
            loadPickup={loadPickup}
            loadRules={loadRules}
            periodProgress={periodProgress}
            openProfile={(year, id) => {
              const version = versions.find(
                (item) => item.id === id && item.year === year,
              );
              if (version) setDetail({ version, risks: pickedByVersion[id] });
            }}
            create={async (year, _source, ids, ruleId) => {
              const version = {
                id: `example-${year}-v1`,
                year,
                version: 1,
                finalizedAt: null,
                updatedAt: "2026-11-12T00:00:00Z",
                riskCount: ids.length,
              };
              const risks = register.filter(
                (item) => item.id && ids.includes(item.id),
              );
              setVersions((current) => [version, ...current]);
              const rule = exampleRules.find((rule) => rule.id === ruleId);
              if (rule) setPeriodProgress((current) => ({ ...current, [version.id]: exampleWorkspace(rule) }));
              setPickedByVersion((current) => ({
                ...current,
                [version.id]: risks,
              }));
              setDetail({ version, risks });
            }}
            deleteDraft={async (profile) => {
              setVersions((current) =>
                current.filter((version) => version.id !== profile.id),
              );
            }}
          />
        )}
      </PageStack>
    </HeaderActionsProvider>
  );
}
