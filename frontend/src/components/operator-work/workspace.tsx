"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getOperatorWorkSummary } from "@/lib/api/operator-work";
import { readWorkUIState, workUIKey, type WorkUIState } from "@/lib/operator-work";
import type { OperatorWorkSectionKey, OperatorWorkSummary } from "@/types/operator-work";
import { ActionButton, CollectionErrorState, CollectionLoadingState, CollectionPageHeader } from "@/components/shared/design-system";
import { OperatorWorkSections } from "@/components/shared/design-system/domain/operator-work-sections";
import { useOperatorWorkActions } from "./use-operator-work-actions";

export function OperatorWorkWorkspace() {
 const {token,user} = useAuth();
 if (!user || !token) return <CollectionLoadingState message="Memuat pekerjaan…" />;
 if (user.role !== "unit") return <CollectionErrorState title="Halaman operator" message="Pekerjaan saya tersedia untuk operator unit." />;
 return <WorkContent key={`${user.id}:${user.organizationId}:${token}`} token={token} userID={user.id} />;
}

function WorkContent({token,userID}: {token:string;userID:string}) {
 const [data,setData] = useState<OperatorWorkSummary | null>(null);
 const [error,setError] = useState("");
 const [loading,setLoading] = useState(true);
 const [reload,setReload] = useState(0);
 const [ui,setUI] = useState<WorkUIState>(() => {
  try { return readWorkUIState(typeof window === "undefined" ? null : sessionStorage.getItem(workUIKey(userID))); }
  catch { return readWorkUIState(null); }
 });
 const uiRef = useRef(ui);
 const restored = useRef(false);
 const persist = useCallback(() => {
  try {sessionStorage.setItem(workUIKey(userID),JSON.stringify({...uiRef.current,scrollY:window.scrollY}));} catch { /* Storage can be unavailable. */ }
 },[userID]);
 const {open,busyKey,actionError,clearActionError} = useOperatorWorkActions(token,persist);
 const refresh = useCallback(() => {setLoading(true);setError("");setReload(value=>value+1);},[]);
 useEffect(() => {
  let cancelled = false;
  const request = getOperatorWorkSummary(token);
  request
   .then(result => {
    if (cancelled) return;
    setData(result);
   })
   .catch(() => {if(!cancelled)setError("Daftar pekerjaan belum berhasil dimuat.");})
   .finally(() => {if(!cancelled)setLoading(false);});
  return () => {cancelled=true;};
 },[token,reload]);
 useEffect(() => {
  window.addEventListener("focus",refresh);
  return () => window.removeEventListener("focus",refresh);
 },[refresh]);
 useEffect(() => {
  if (!data || restored.current) return;
  const frame = requestAnimationFrame(() => {
   window.scrollTo({top:uiRef.current.scrollY,behavior:"instant"});
   restored.current=true;
  });
  return () => cancelAnimationFrame(frame);
 },[data]);
 useEffect(() => {
  const save=()=>{if(restored.current)persist();};
  window.addEventListener("scroll",save,{passive:true});
  window.addEventListener("pagehide",save);
  return ()=>{window.removeEventListener("scroll",save);window.removeEventListener("pagehide",save);};
 },[persist]);
 function changeSection(key:OperatorWorkSectionKey,value:boolean) {
  const next={...uiRef.current,open:{...uiRef.current.open,[key]:value}};
  uiRef.current=next;setUI(next);
  try {sessionStorage.setItem(workUIKey(userID),JSON.stringify({...next,scrollY:window.scrollY}));} catch { /* Optional UI preference only. */ }
 }
 return <>
   <CollectionPageHeader title="Pekerjaan saya" showTitle actions={<><ActionButton asChild><Link href="/risk/register/new?returnTo=/work" onClick={persist}>Tambah risiko</Link></ActionButton><ActionButton asChild><Link href="/risk-events?create=1" onClick={persist}>Catat kejadian</Link></ActionButton></>} />
  {error ? <CollectionErrorState message={error} onReload={refresh}/> : null}
  {actionError ? <CollectionErrorState message={actionError} onReload={()=>{clearActionError();refresh();}}/> : null}
  {!data && loading ? <CollectionLoadingState message="Memuat pekerjaan…"/> : null}
  {data ? <div aria-busy={loading}>
   <OperatorWorkSections sections={data.sections} open={ui.open} onOpenChange={changeSection} today={data.today} busyKey={busyKey} onOpen={item=>void open(item)} onNavigate={persist}/>

  </div> : null}
 </>;
}
