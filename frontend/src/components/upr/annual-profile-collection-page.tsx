"use client";

import { getProfilePeriodProgress, type ProfilePeriodWorkspace } from "@/lib/api/profile-periods";
import { listMonitoringRules } from "@/lib/api/monitoring-rules";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { annualProfileHref, groupAnnualProfiles } from "@/lib/annual-profile";
import { ApiError } from "@/lib/api";
import { uprApi, type AnnualProfileListVersion } from "@/lib/api/upr-workflow";
import { businessYear } from "@/lib/business-clock";
import { AnnualProfileCollection } from "./annual-profile-collection";
import { workflowError } from "./workflow-ui";

export function AnnualProfileCollectionPage() {
  const { token, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const organizationId = user?.organizationId;
  const readAll = user?.role === "superadmin" && !organizationId;
  const accessKey = organizationId ?? (readAll ? user.id : null);
  const [periodProgress, setPeriodProgress] = useState<{scope:string; data:Record<string,ProfilePeriodWorkspace | {error:string}>}>({scope:"",data:{}});
  const [versions, setVersions] = useState<AnnualProfileListVersion[]>([]);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [reloadProgress, setReloadProgress] = useState(0);

  useEffect(() => {
    if (!token || !accessKey) return;
    let cancelled = false;
    uprApi.profiles(token, { includeDescendants: true }).then(
      (rows) => {
        if (!cancelled) {
          setVersions(rows);
          setError("");
          setLoadedScope(accessKey);
        }
      },
      (cause) => {
        if (!cancelled) {
          setError(workflowError(cause));
          setLoadedScope(accessKey);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, accessKey, reload]);

  useEffect(() => {
    if (!token || !accessKey) return;
    let active = true;
    const profileIds = groupAnnualProfiles(versions).flatMap(({ final, draft }) => {
      const profile = final ?? draft;
      return profile ? [profile.id] : [];
    });
    Promise.all(profileIds.map(async (id) => {
      try {
        return [id, await getProfilePeriodProgress(token, id)] as const;
      } catch (error) {
        return [id, { error: workflowError(error) }] as const;
      }
    })).then((entries) => {
      if (active) setPeriodProgress({ scope: accessKey, data: Object.fromEntries(entries) });
    });
    return () => { active = false; };
  }, [token, accessKey, versions, reloadProgress]);
  const loadRules = useCallback((search = "", signal?: AbortSignal) => token ? listMonitoringRules(token, signal, false, { query: search, limit: 5 }) : Promise.reject(new Error("Sesi tidak tersedia.")), [token]);
  const loadPickup = useCallback(
    (year: number, source: string | null) => {
      if (!token)
        return Promise.reject(
          new Error("Sesi tidak tersedia. Muat ulang halaman."),
        );
      return uprApi.pickup(token, year, source);
    },
    [token],
  );

  const openProfile = (year: number, version: string) =>
    router.push(annualProfileHref(year, version));
  return (
    <AnnualProfileCollection
      key={accessKey ?? "no-org"}
      organization={organizationId ? user?.orgName || "Unit akun Anda" : ""}
      readAll={readAll}
      versions={loadedScope === accessKey ? versions : []}
      defaultYear={businessYear()}
      loading={
        authLoading ||
        Boolean(token && accessKey && loadedScope !== accessKey)
      }
      error={error}
      retry={() => {
        setLoadedScope(null);
        setReload((value) => value + 1);
      }}
      loadPickup={loadPickup}
      loadRules={loadRules}
      organizationId={organizationId ?? undefined}
      periodProgress={periodProgress.scope === accessKey ? periodProgress.data : {}}
      retryPeriodProgress={() => setReloadProgress((value) => value + 1)}
      openProfile={openProfile}
      create={async (year, source, ids, ruleId) => {
        if (!token) throw new Error("Sesi tidak tersedia. Muat ulang halaman.");
        try {
          const created = await uprApi.initiate(token, year, source, ids, ruleId);
          toast.success(
            `Draf profil ${year} dibuat dengan ${ids.length} risiko.`,
          );
          openProfile(year, created.id);
        } catch (cause) {
          if (cause instanceof ApiError && cause.status === 409) {
            try {
              setVersions(await uprApi.profiles(token, { includeDescendants: true }));
            } catch {
              /* keep the original submission error */
            }
          }
          throw cause;
        }
      }}
      deleteDraft={async (profile) => {
        if (!token) throw new Error("Sesi tidak tersedia. Muat ulang halaman.");
        if (profile.organizationId !== organizationId) {
          throw new Error("Profil unit lain hanya dapat dibaca.");
        }
        await uprApi.deleteDraft(token, profile.id);
        setVersions((current) =>
          current.filter((version) => version.id !== profile.id),
        );
        toast.success(`Draf profil ${profile.year} dihapus permanen.`);
      }}
    />
  );
}
