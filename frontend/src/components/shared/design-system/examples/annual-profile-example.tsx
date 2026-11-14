"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageStack } from "@/components/shared/design-system";
import { AnnualProfileContent } from "@/components/upr/annual-profile-content";
import type {
  AnnualCandidate,
  AnnualMember,
  AnnualPickupRisk,
  AnnualProfile,
  AnnualProfileListVersion,
} from "@/lib/api/upr-workflow";

const objectives = [
  { id: "example-objective", title: "Validasi data tepat waktu" },
];
const initialMembers: AnnualMember[] = [
  {
    groupId: "example-group-1",
    riskId: "example-risk-1",
    sourceRiskId: null,
    objectiveId: objectives[0].id,
    effectiveFrom: "2026-01-01",
    changeReason: "",
    baseline: null,
    code: "R-014",
    title: "Keterlambatan validasi data",
    riskStatus: "final",
    score: 15,
    canRemove: true,
  },
  {
    groupId: "example-group-2",
    riskId: "example-risk-2",
    sourceRiskId: null,
    objectiveId: null,
    effectiveFrom: "2026-01-01",
    changeReason: "",
    baseline: null,
    code: "R-021",
    title: "Ketergantungan pada satu petugas",
    riskStatus: "draft",
    score: null,
    canRemove: true,
  },
];
const candidates: AnnualCandidate[] = [
  {
    id: "example-risk-3",
    groupId: "example-group-3",
    code: "R-032",
    title: "Gangguan sinkronisasi sistem",
    period: "2025-Q4",
    score: 12,
    source: "prior_profile",
    suggestedObjectiveId: null,
  },
  {
    id: "example-risk-4",
    groupId: "example-group-4",
    code: "R-040",
    title: "Keterlambatan laporan unit",
    period: "2026-Q2",
    score: 10,
    source: "current_year",
    suggestedObjectiveId: objectives[0].id,
  },
];

export function AnnualProfileExample({
  year,
  sampleVersion,
  sampleVersions,
  pickup,
}: {
  year: number;
  sampleVersion: AnnualProfileListVersion;
  sampleVersions: AnnualProfileListVersion[];
  pickup?: AnnualPickupRisk[];
}) {
  function membersFor(version: AnnualProfileListVersion): AnnualMember[] {
    return pickup && version.id === sampleVersion.id
      ? pickup.map(
          (risk): AnnualMember => ({
            groupId: risk.id!,
            riskId: null,
            sourceRiskId: risk.id,
            objectiveId: null,
            effectiveFrom: `${year}-01-01`,
            changeReason: "",
            baseline: null,
            code: risk.code,
            title: risk.title,
            riskStatus: "",
            score: null,
            canRemove: true,
          }),
        )
      : initialMembers.slice(0, version.riskCount).map((member) =>
          version.finalizedAt
            ? {
                ...member,
                riskStatus: "final",
                score: member.score ?? 12,
                canRemove: false,
                baseline: {
                  riskId: member.riskId!,
                  code: member.code,
                  title: member.title,
                  score: member.score ?? 12,
                  targetScore: 6,
                  objective: objectives[0].title,
                  mitigations: [],
                },
              }
            : member,
        );
  }
  function initialProfile(empty = false): AnnualProfile {
    const versions = sampleVersions.map((version) => ({
      ...version,
      finalizedBy: version.finalizedAt ? "example-actor" : null,
    }));
    return {
      selected:
        versions.find((version) => version.id === sampleVersion.id) ?? null,
      versions,
      members: empty ? [] : membersFor(sampleVersion),
      objectives,
    };
  }
  const [profile, setProfile] = useState(() => initialProfile());
  const [error, setError] = useState("");
  const [generation, setGeneration] = useState(0);
  const [message, setMessage] = useState("");
  const [partialFailure, setPartialFailure] = useState(false);
  const snapshots = useRef<Record<string, AnnualMember[]>>({});
  const profileCandidates = [
    ...candidates,
    ...(pickup ?? []).map(
      (risk): AnnualCandidate => ({
        id: risk.id!,
        groupId: risk.id!,
        code: risk.code,
        title: risk.title,
        period: risk.period,
        score: risk.score ?? 0,
        source: "other_active",
        suggestedObjectiveId: null,
      }),
    ),
  ];
  return (
    <PageStack>
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Kondisi contoh profil tahunan"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setProfile(initialProfile());
            setError("");
            setGeneration((value) => value + 1);
          }}
        >
          Reset contoh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setProfile(initialProfile(true));
            setError("");
            setGeneration((value) => value + 1);
          }}
        >
          Profil kosong
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setProfile((current) => ({
              ...current,
              members: current.members.map((member) => ({
                ...member,
                objectiveId: objectives[0].id,
                riskId: member.riskId ?? member.sourceRiskId,
                riskStatus: "final",
                score: member.score ?? 12,
              })),
            }))
          }
        >
          Lengkapi penilaian contoh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setError("Contoh: daftar kandidat gagal dimuat.")}
        >
          Simulasikan gagal memuat kandidat
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={partialFailure}
          onClick={() => setPartialFailure((value) => !value)}
        >
          Simulasikan gagal sebagian
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Data ilustratif. Perubahan contoh disimpan selama halaman ini terbuka.
        Tautan ke formulir dan detail risiko dinonaktifkan.
      </p>
      <div
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a")) {
            event.preventDefault();
            event.stopPropagation();
            setMessage(
              "Contoh: formulir atau detail risiko dibuka dari halaman profil sebenarnya.",
            );
          }
        }}
      >
        <AnnualProfileContent
          key={`${generation}:${profile.selected?.id}`}
          year={year}
          profile={profile}
          candidates={profileCandidates}
          organization="UPR-T.II · Unit contoh"
          busy={false}
          candidateError={error}
          returnTo={`/risk/annual-profiles/${year}`}
          onRetryCandidates={() => setError("")}
          onSelectVersion={(id) => {
            if (profile.selected)
              snapshots.current[profile.selected.id] = profile.members;
            const sample = sampleVersions.find((version) => version.id === id);
            setProfile((current) => ({
              ...current,
              selected: current.versions.find((item) => item.id === id) ?? null,
              members:
                snapshots.current[id] ??
                (sample ? membersFor(sample) : current.members),
            }));
          }}
          onDraft={async () => {
            setProfile((current) => {
              if (current.selected)
                snapshots.current[current.selected.id] = current.members;
              const number =
                Math.max(...current.versions.map((item) => item.version)) + 1;
              const version = {
                id: `example-${year}-v${number}`,
                version: number,
                finalizedAt: null,
                finalizedBy: null,
              };
              return {
                ...current,
                selected: version,
                versions: [version, ...current.versions],
                members: current.members.map((member) => ({
                  ...member,
                  canRemove: false,
                })),
              };
            });
          }}
          onAdd={async (picked, date, reason) => {
            const saved = partialFailure ? picked.slice(0, 1) : picked;
            setProfile((current) => ({
              ...current,
              members: [
                ...current.members,
                ...saved.map(
                  (candidate): AnnualMember => ({
                    groupId: candidate.groupId,
                    riskId: candidate.period.startsWith(`${year}-`)
                      ? candidate.id
                      : null,
                    sourceRiskId: candidate.id,
                    objectiveId: null,
                    effectiveFrom: date || `${year}-01-01`,
                    changeReason: reason,
                    baseline: null,
                    code: candidate.code,
                    title: candidate.title,
                    riskStatus: candidate.period.startsWith(`${year}-`)
                      ? "final"
                      : "",
                    score: candidate.period.startsWith(`${year}-`)
                      ? candidate.score
                      : null,
                    canRemove: true,
                  }),
                ),
              ],
            }));
            return {
              added: saved.map((item) => item.id),
              error:
                partialFailure && picked.length > 1
                  ? "Contoh: permintaan kedua gagal. Coba lagi."
                  : undefined,
            };
          }}
          onSave={async (input) => {
            setProfile((current) => ({
              ...current,
              members: current.members.map((member) =>
                member.riskId === input.riskId ||
                member.sourceRiskId === input.riskId
                  ? {
                      ...member,
                      riskId: input.riskId,
                      objectiveId: input.objectiveId,
                      effectiveFrom: input.effectiveFrom,
                      changeReason: input.changeReason,
                      baseline: null,
                      riskStatus: input.reassess ? "draft" : member.riskStatus,
                    }
                  : member,
              ),
            }));
          }}
          onRemove={async (member) => {
            setProfile((current) => ({
              ...current,
              members: current.members.filter(
                (item) => item.groupId !== member.groupId,
              ),
            }));
          }}
          onFinalize={async () => {
            setProfile((current) => {
              const selected = {
                ...current.selected!,
                finalizedAt: "2026-11-12T11:00:00Z",
                finalizedBy: "example-actor",
              };
              return {
                ...current,
                selected,
                versions: current.versions.map((item) =>
                  item.id === selected.id ? selected : item,
                ),
                members: current.members.map((member) => ({
                  ...member,
                  canRemove: false,
                  baseline: {
                    riskId: member.riskId!,
                    code: member.code,
                    title: member.title,
                    score: member.score ?? 12,
                    targetScore: 6,
                    objective: objectives[0].title,
                    mitigations: [],
                  },
                })),
              };
            });
          }}
          onDeleteDraft={async () => {
            const deletedId = profile.selected?.id;
            if (!deletedId) return;
            setProfile((current) => {
              const versions = current.versions
                .filter((item) => item.id !== deletedId)
                .sort((a, b) => b.version - a.version);
              const selected = versions[0] ?? null;
              const sample = sampleVersions.find((item) => item.id === selected?.id);
              return {
                ...current,
                versions,
                selected,
                members: selected
                  ? snapshots.current[selected.id] ?? (sample ? membersFor(sample) : [])
                  : [],
              };
            });
            setMessage(
              "Contoh: draf dihapus permanen. Data risiko Register tetap tersimpan.",
            );
          }}
        />
      </div>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </PageStack>
  );
}
