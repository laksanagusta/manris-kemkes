"use client";

import { useEffect, useState } from "react";
import { getProfilePeriodProgress, type ProfilePeriodWorkspace } from "@/lib/api/profile-periods";
import { workflowDate, workflowError } from "./workflow-ui";

export function useProfilePeriodWorkspace(token?: string | null, profileId?: string | null) {
  const key = `${token}:${profileId}`;
  const [loaded, setLoaded] = useState<{ key: string; workspace?: ProfilePeriodWorkspace; error?: string } | null>(null);
  useEffect(() => {
    if (!token || !profileId) return;
    let active = true;
    let generation = 0;
    const load = () => {
      const request = ++generation;
      void getProfilePeriodProgress(token, profileId).then(
        workspace => { if (active && request === generation) setLoaded({ key, workspace }); },
        cause => { if (active && request === generation) setLoaded({ key, error: workflowError(cause) }); },
      );
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [token, profileId, key]);

  return loaded?.key === key ? loaded : null;
}

export function ProfilePeriodDetails({ loaded, periodId, showProfileVersion = false }: {
  loaded: ReturnType<typeof useProfilePeriodWorkspace>;
  periodId?: string | null;
  showProfileVersion?: boolean;
}) {
  if (!periodId && !showProfileVersion) return null;
  if (!loaded) return <p role="status" className="text-xs text-muted-foreground">Memuat periode profil…</p>;
  if (loaded.error) return <p role="alert" className="text-xs text-destructive">Periode gagal dimuat: {loaded.error}</p>;
  const workspace = loaded.workspace;
  const period = workspace?.periods.find(item => item.id === periodId);
  return workspace ? <div className="space-y-1 text-xs text-muted-foreground">
    {showProfileVersion && workspace.version > 0 && (
      <p>Profil Risiko Tahunan {workspace.year} · Versi {workspace.version}</p>
    )}
    {period && <>
      <p className="font-medium text-foreground">{period.label} · {workspace.year || workspace.rule?.year}</p>
      <p>Pengisian {workflowDate(period.opensOn)}–{workflowDate(period.closesOn)} WIB.</p>
    </>}
  </div> : null;
}

export function BoundProfilePeriodNotice({ token, profileId, periodId }: {
  token?: string | null;
  profileId?: string | null;
  periodId?: string | null;
}) {
  const loaded = useProfilePeriodWorkspace(token, periodId ? profileId : null);
  return <ProfilePeriodDetails loaded={loaded} periodId={periodId} />;
}
