'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uprApi, type AnnualProfileListVersion } from '@/lib/api/upr-workflow';
import { getProfilePeriodProgress, type ProfilePeriodWorkspace } from '@/lib/api/profile-periods';
import { periodObservationDate, periodWindowState } from '@/lib/profile-period-progress';
import { todayMonitoringDate } from '@/lib/monitoring-date';
import { WorkflowError, workflowError } from './workflow-ui';

export type ProfilePeriodSelection = { profileVersionId:string; monitoringPeriodId?:string; observedAt?:string; existingRecordId?:string };

export function ProfilePeriodPicker({token,organizationId,initialProfileId='',initialPeriodId='',process,onChange,riskGroupId}: {
  token:string; organizationId:string; initialProfileId?:string; initialPeriodId?:string;
  process:'workingPaper'|'evaluation'|'monitoring'; riskGroupId?:string;
  onChange:(value:ProfilePeriodSelection | null)=>void;
}) {
  const [profiles,setProfiles]=useState<{scope:string;rows:AnnualProfileListVersion[]}|null>(null);
  const [profileId,setProfileId]=useState(initialProfileId);
  const [periodId,setPeriodId]=useState(initialPeriodId);
  const [workspace,setWorkspace]=useState<{scope:string;value:ProfilePeriodWorkspace}|null>(null);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const scope=`${token}:${organizationId}`;
  const profileScope=`${scope}:${profileId}`;
  const currentProfiles=profiles?.scope===scope ? profiles.rows : [];
  const selectedProfile=currentProfiles.find(profile=>profile.id===profileId);
  const currentWorkspace=workspace?.scope===profileScope ? workspace.value : undefined;
  useEffect(()=>{
    let active=true;
    uprApi.profiles(token).then(rows=>{
      if(active){setProfiles({scope,rows:rows.filter(row=>Boolean(row.finalizedAt)&&row.riskCount>0&&!rows.some(other=>other.year===row.year&&Boolean(other.finalizedAt)&&other.version>row.version))});setError('');}
    },cause=>{if(active)setError(workflowError(cause));});
    return ()=>{active=false;};
  },[token,scope,retry]);
  useEffect(()=>{
    if(!selectedProfile) return;
    let active=true;
    getProfilePeriodProgress(token,selectedProfile.id).then(value=>{
      if(active){setWorkspace({scope:profileScope,value});setError('');}
    },cause=>{if(active)setError(workflowError(cause));});
    return ()=>{active=false;};
  },[token,selectedProfile,profileScope,retry]);
  const period=currentWorkspace?.periods.find(item=>item.id===periodId);
  const record=period && (process==='monitoring' ? period.monitorings.find(item=>item.groupId===riskGroupId) : period[process]);
  const ready=Boolean(selectedProfile && currentWorkspace && !error && (!currentWorkspace.rule || (period && periodWindowState(period)==='open' && record?.status!=='done' && (process!=='monitoring' || !riskGroupId || Boolean(record && (!('applicable' in record) || record.applicable !== false))))));
  useEffect(()=>{
    onChange(ready && selectedProfile ? {
      profileVersionId:selectedProfile.id,
      ...(record?.id ? {existingRecordId:record.id} : {}),
      ...(currentWorkspace?.rule && period ? {monitoringPeriodId:period.id,observedAt:periodObservationDate(currentWorkspace.rule,period,todayMonitoringDate())} : {}),
    } : null);
  },[ready,selectedProfile,currentWorkspace,period,record,onChange]);
  return <div className="space-y-3">
    <div className="space-y-2"><Label htmlFor={`period-profile-${process}`}>Profil risiko</Label>
      <Select value={selectedProfile?.id??''} onValueChange={value=>{onChange(null);setProfileId(value);setPeriodId('');setWorkspace(null);setError('');}}>
        <SelectTrigger id={`period-profile-${process}`} className="w-full"><SelectValue placeholder="Pilih profil final" /></SelectTrigger>
        <SelectContent>{currentProfiles.map(profile=><SelectItem key={profile.id} value={profile.id}>{profile.year} · Versi {profile.version}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    {currentWorkspace?.rule && <div className="space-y-2"><Label htmlFor={`period-choice-${process}`}>Periode</Label>
      <Select value={periodId} onValueChange={value=>{onChange(null);setPeriodId(value);}}>
        <SelectTrigger id={`period-choice-${process}`} className="w-full"><SelectValue placeholder="Pilih periode pengisian" /></SelectTrigger>
        <SelectContent>{currentWorkspace.periods.map(item=>{
          const state=periodWindowState(item);
          const progress=process==='monitoring'?item.monitorings.find(m=>m.groupId===riskGroupId):item[process];
          return <SelectItem key={item.id} value={item.id} disabled={state!=='open'||progress?.status==='done'||Boolean(progress && 'applicable' in progress && progress.applicable===false)}>{item.label}{state==='upcoming'?' · Belum dibuka':state==='closed'?' · Ditutup':progress?.status==='done'?' · Done':''}</SelectItem>;
        })}</SelectContent>
      </Select>
      {period && <p className="text-xs text-muted-foreground">Pengisian {period.opensOn}–{period.closesOn} WIB.</p>}
    </div>}
    {error ? <WorkflowError message={error} retry={()=>{setError('');setProfiles(null);setWorkspace(null);setRetry(n=>n+1);}} /> : !profiles || (selectedProfile&&!currentWorkspace) ? <p role="status" className="text-xs text-muted-foreground">Memuat jadwal profil…</p> : !currentProfiles.length ? <p className="text-xs text-muted-foreground">Belum ada profil final berisi risiko.</p> : currentWorkspace&&!currentWorkspace.rule ? <p className="text-xs text-muted-foreground">Profil lama ini belum memakai rules. Alur sebelumnya tetap berlaku.</p> : null}
  </div>;
}
