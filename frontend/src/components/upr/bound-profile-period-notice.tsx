'use client';

import { useEffect, useState } from 'react';
import { getProfilePeriodProgress, type ProfilePeriodProgress } from '@/lib/api/profile-periods';
import { workflowDate, workflowError } from './workflow-ui';

export function BoundProfilePeriodNotice({token,profileId,periodId}: {token?:string|null;profileId?:string|null;periodId?:string|null}) {
  const [loaded,setLoaded]=useState<{key:string;period?:ProfilePeriodProgress;year?:number;error?:string}|null>(null);
  const key=`${token}:${profileId}:${periodId}`;
  useEffect(()=>{
    if(!token||!profileId||!periodId) return;
    let active=true;
    getProfilePeriodProgress(token,profileId).then(workspace=>{
      if(active)setLoaded({key,period:workspace.periods.find(p=>p.id===periodId),year:workspace.rule?.year});
    },cause=>{if(active)setLoaded({key,error:workflowError(cause)});});
    return()=>{active=false;};
  },[token,profileId,periodId,key]);
  if(!profileId||!periodId) return null;
  if(!loaded||loaded.key!==key) return <p role="status" className="text-xs text-muted-foreground">Memuat periode profil…</p>;
  if(loaded.error) return <p role="alert" className="text-xs text-destructive">Periode gagal dimuat: {loaded.error}</p>;
  return loaded.period ? <div className="space-y-1 text-xs text-muted-foreground">
    <p className="font-medium text-foreground">{loaded.period.label} · {loaded.year}</p>
    <p>Pengisian {workflowDate(loaded.period.opensOn)}–{workflowDate(loaded.period.closesOn)} WIB.</p>
  </div> : null;
}
