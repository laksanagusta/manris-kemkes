"use client";

import { DetailLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import { approveProfilePeriodClosure, getProfilePeriodProgress, type ProfilePeriodWorkspace, type ProfilePeriodProgress } from "@/lib/api/profile-periods";
import { startMonitoring } from "@/lib/api/risk-monitoring";
import type { AnnualMember } from "@/lib/api/upr-workflow";
import { todayMonitoringDate } from "@/lib/monitoring-date";
import { periodObservationDate } from "@/lib/profile-period-progress";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageStack } from "@/components/shared/design-system";
import { ActionConfirmationDialog } from "@/components/shared/design-system/actions/action-confirmation-dialog";
import { ArrowLeft } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AnnualProfileContent } from "@/components/upr/annual-profile-content";
import { WorkflowError, workflowError } from "@/components/upr/workflow-ui";
import { useAuth } from "@/contexts/auth-context";
import {
  uprApi,
  type AnnualCandidate,
  type AnnualProfile,
} from "@/lib/api/upr-workflow";
import {
  annualProfileHref,
  annualProfileListHref,
  annualProfileReadiness,
  isAnnualProfileYear,
  saveAnnualCandidateBatch,
} from "@/lib/annual-profile";

function AnnualProfileWorkspace() {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { year: yearParam } = useParams<{ year: string }>();
  const year = Number(yearParam);
  const validYear = /^\d{4}$/.test(yearParam) && isAnnualProfileYear(year);
  const version = params.get("versi") ?? "";
  const [periodData,setPeriodData] = useState<{id:string;workspace?:ProfilePeriodWorkspace;error?:string}>({id:""});
  const [monitoringTarget,setMonitoringTarget] = useState<{member:AnnualMember;period:ProfilePeriodProgress} | null>(null);
  const [data, setData] = useState<AnnualProfile | null>(null);
  const [candidates, setCandidates] = useState<AnnualCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [candidateError, setCandidateError] = useState("");
  const [pending, setPending] = useState(false);
  const [reload, setReload] = useState(0);
  const [loadedContext, setLoadedContext] = useState("");
  const mutationLock = useRef(false);
  const organizationId = user?.organizationId;
  const isSuperAdmin = user?.role === "superadmin";
  const canReadProfile = Boolean(organizationId || (isSuperAdmin && version));
  const context = `${organizationId}:${year}:${version}`;
  const readOnly = !data?.organizationId || data.organizationId !== organizationId;
  const fetching = loading || loadedContext !== context;
  const busy = fetching || pending || Boolean(refreshError);
  const returnTo = annualProfileHref(year, data?.selected?.id);

  const selectedProfileId = data?.selected?.id;
  const periodWorkspace = periodData.id === selectedProfileId ? periodData.workspace : undefined;

  const selectVersion = (id: string) => {
    if (busy) return;
    setLoading(true);
    router.replace(annualProfileHref(year, id));
  };

  useEffect(() => {
    if (!token || !canReadProfile || !validYear) return;
    let cancelled = false;
    async function load(authToken: string) {
      try {
        const profile = await uprApi.profile(authToken, year, version);
        const id = profile.selected?.id;
        if (id) {
          try {
            const workspace = await getProfilePeriodProgress(authToken, id);
            if (cancelled) return;
            setPeriodData({ id, workspace });
          } catch (cause) {
            if (cancelled) return;
            setPeriodData({ id, error: workflowError(cause) });
          }
        }
        if (cancelled) return;
        setData(profile);
        setError("");
        setRefreshError("");
        setCandidates([]);
        setCandidateError("");
        if (profile.organizationId === organizationId) {
          try {
            const choices = await uprApi.candidates(authToken, year);
            if (!cancelled) setCandidates(choices);
          } catch (cause) {
            if (!cancelled) setCandidateError(workflowError(cause));
          }
        }
      } catch (cause) {
        if (cancelled) return;
        setData(null);
        setError(workflowError(cause));
      } finally {
        if (!cancelled) {
          setLoadedContext(context);
          setLoading(false);
        }
      }
    }
    void load(token);
    return () => {
      cancelled = true;
    };
  }, [token, organizationId, canReadProfile, year, version, reload, validYear, context]);

  const refresh = useCallback(
    async (id: string) => {
      if (!token) return;
      const [profile, choices, periods] = await Promise.allSettled([
        uprApi.profile(token, year, id),
        uprApi.candidates(token, year),
        getProfilePeriodProgress(token, id),
      ]);
      setPeriodData(periods.status === "fulfilled"
        ? { id, workspace: periods.value }
        : { id, error: workflowError(periods.reason) });
      if (profile.status === "fulfilled") {
        setData(profile.value);
        setError("");
        setRefreshError("");
      } else {
        setRefreshError(
          `Daftar profil belum berhasil diperbarui. Muat ulang sebelum mengubah profil lagi. ${workflowError(profile.reason)}`,
        );
      }
      if (choices.status === "fulfilled") {
        setCandidates(choices.value);
        setCandidateError("");
      } else {
        setCandidates([]);
        setCandidateError(workflowError(choices.reason));
      }
    },
    [token, year],
  );

  async function mutate<T>(
    action: (authToken: string, profileId: string) => Promise<T>,
    allowReadOnly = false,
  ): Promise<T> {
    if ((readOnly && !(allowReadOnly && isSuperAdmin)) || !token || mutationLock.current || fetching || refreshError)
      throw new Error(
        "Muat ulang profil atau tunggu hingga proses sebelumnya selesai.",
      );
    mutationLock.current = true;
    setPending(true);
    try {
      return await action(token, data?.selected?.id ?? "");
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }

  return (
    <PageStack className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="w-fit px-0 md:hidden"
      >
        <Link href={annualProfileListHref}>
          <ArrowLeft aria-hidden="true" data-icon="inline-start" />
          Kembali ke daftar profil
        </Link>
      </Button>
      {refreshError && (
        <WorkflowError
          message={refreshError}
          retry={() => {
            if (pending || !data?.selected) return;
            setPending(true);
            void refresh(data.selected.id).finally(() => setPending(false));
          }}
        />
      )}
      {periodData.id===selectedProfileId && periodData.error && <WorkflowError message={`Progres periode gagal dimuat. ${periodData.error}`} retry={() => setReload(value=>value+1)} />}
      {!validYear ? (
        <WorkflowError message="Tahun profil tidak valid." />
      ) : authLoading ? (
        <DetailLoadingSkeleton message="Memuat profil…" />
      ) : !canReadProfile ? (
        <Alert>
          <AlertDescription>
            Akun harus terhubung ke organisasi untuk membuka profil tahunan.
          </AlertDescription>
        </Alert>
      ) : fetching ? (
        <DetailLoadingSkeleton message="Memuat profil…" />
      ) : error ? (
        <WorkflowError
          message={error}
          retry={() => {
            setLoading(true);
            setReload((value) => value + 1);
          }}
        />
      ) : (
        data && (
          <AnnualProfileContent
            key={`${organizationId}:${year}:${data.selected?.id ?? "empty"}`}
            year={year}
            readOnly={readOnly}
            profile={data}
            periodWorkspace={periodWorkspace}
            onApprovePeriodClosure={isSuperAdmin ? (periodId, reason) =>
              mutate(async (authToken, profileId) => {
                await approveProfilePeriodClosure(authToken, profileId, periodId, reason);
                await refresh(profileId);
                toast.success("Penutupan administratif disetujui.");
              }, true) : undefined}
            onStartPeriodMonitoring={readOnly ? undefined : (member,period)=>{
              if(!periodWorkspace?.rule) return;
              setMonitoringTarget({member,period});
            }}
            candidates={candidates}
            organization={data.organizationName || (readOnly ? "Unit pemilik profil" : user?.orgName || "Unit akun Anda")}
            busy={pending || Boolean(refreshError)}
            candidateError={candidateError}
            returnTo={returnTo}
            onRetryCandidates={() => {
              if (token)
                void mutate(async (authToken) => {
                  try {
                    setCandidates(await uprApi.candidates(authToken, year));
                    setCandidateError("");
                  } catch (cause) {
                    setCandidateError(workflowError(cause));
                  }
                });
            }}
            onSelectVersion={selectVersion}
            onDraft={() =>
              mutate(async (authToken) => {
                const next = await uprApi.draft(authToken, year);
                setLoading(true);
                router.replace(annualProfileHref(year, next.id));
                setReload((value) => value + 1);
                toast.success(
                  data.selected
                    ? "Draf revisi siap dilanjutkan."
                    : "Draf profil berhasil dibuat.",
                );
              })
            }
            onAdd={(picked) =>
              mutate(async (authToken, profileId) => {
                const result = await saveAnnualCandidateBatch(
                  picked,
                  (candidate) =>
                    uprApi.saveMember(authToken, profileId, {
                      riskId: candidate.id,
                      objectiveId: null,
                      changeReason: "",
                      reassess: false,
                      deferAssessment: true,
                    }),
                );
                await refresh(profileId);
                if (result.added.length)
                  toast.success(
                    `${result.added.length} risiko ditambahkan. Lengkapi penilaian dan sasaran dari daftar profil.`,
                  );
                return result;
              })
            }
            onSave={(input) =>
              mutate(async (authToken, profileId) => {
                const result = await uprApi.saveMember(
                  authToken,
                  profileId,
                  input,
                );
                await refresh(profileId);
                toast.success("Perubahan risiko disimpan dalam draf profil.");
                if (input.reassess)
                  router.push(
                    `/risk/register/new?id=${result.riskId}&returnTo=${encodeURIComponent(returnTo)}`,
                  );
              })
            }
            onRemove={(member, exclusion) =>
              mutate(async (authToken, profileId) => {
                if (exclusion) {
                  await uprApi.excludeMember(authToken, profileId, member.groupId, exclusion);
                } else {
                  await uprApi.removeMember(authToken, profileId, member.groupId);
                }
                await refresh(profileId);
                toast.success(
                  exclusion
                    ? "Pengeluaran risiko disimpan dalam draf revisi."
                    : "Risiko dikeluarkan dari profil dan tetap tersimpan di Register.",
                );
              })
            }
            onCancelExclusion={(groupId) =>
              mutate(async (authToken, profileId) => {
                await uprApi.cancelMemberExclusion(authToken, profileId, groupId);
                await refresh(profileId);
                toast.success("Pengeluaran dibatalkan. Risiko kembali ke draf profil.");
              })
            }
            onFinalize={() =>
              mutate(async (authToken, profileId) => {
                if (!annualProfileReadiness(data).canFinalize)
                  throw new Error(
                    "Lengkapi penilaian dan sasaran sebelum finalisasi.",
                  );
                await uprApi.finalizeProfile(authToken, profileId);
                await refresh(profileId);
                toast.success("Profil Risiko Tahunan difinalisasi.");
              })
            }
            onDeleteDraft={() =>
              mutate(async (authToken, profileId) => {
                await uprApi.deleteDraft(authToken, profileId);
                toast.success(`Draf profil ${year} dihapus permanen.`);
                router.replace(annualProfileListHref);
              })
            }
          />
        )
      )}
      <ActionConfirmationDialog
        open={Boolean(monitoringTarget)}
        onOpenChange={(open) => {
          if (!open) setMonitoringTarget(null);
        }}
        title="Mulai pemantauan"
        description={`${monitoringTarget?.member.code ?? "Risiko"} · ${monitoringTarget?.period.label ?? "Periode"}.`}
        confirmLabel="Mulai pemantauan"
        onConfirm={async () => {
          if (readOnly || !token || !selectedProfileId || !periodWorkspace?.rule || !monitoringTarget?.member.riskId) {
            throw new Error("Data pemantauan belum tersedia.");
          }
          const observedAt = periodObservationDate(periodWorkspace.rule, monitoringTarget.period, todayMonitoringDate());
          try {
            const result = await startMonitoring(
              token,
              monitoringTarget.member.riskId,
              observedAt,
              {
                profileVersionId: selectedProfileId,
                monitoringPeriodId: monitoringTarget.period.id,
              },
            );
            router.push(result.redirectUrl || `/risk/monitoring/${result.monitoring.id}`);
          } catch (error) {
            throw new Error(workflowError(error));
          }
        }}
      >
        Draf pemantauan akan dibuat dan formulirnya langsung dibuka.
      </ActionConfirmationDialog>
    </PageStack>
  );
}

export default function AnnualProfilePage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton><DetailLoadingSkeleton message="Memuat profil…" /></PageLoadingSkeleton>}>
      <AnnualProfileWorkspace />
    </Suspense>
  );
}
