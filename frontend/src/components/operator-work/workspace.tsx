"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getOperatorWorkSummary, listOperatorWorkSection } from "@/lib/api/operator-work";
import { readWorkUIState, workUIKey, workSectionPaths, workSectionTitles, type WorkUIState } from "@/lib/operator-work";
import type { OperatorWorkPage, OperatorWorkSectionKey, OperatorWorkSummary } from "@/types/operator-work";
import { ActionButton, CollectionErrorState, CollectionLoadingState, CollectionPageHeader, CollectionToolbar, PageStack } from "@/components/shared/design-system";
import { OperatorWorkSections } from "@/components/shared/design-system/domain/operator-work-sections";
import { OperatorWorkTable } from "@/components/shared/design-system/domain/operator-work-table";
import { useOperatorWorkActions } from "./use-operator-work-actions";

export function OperatorWorkRouteBoundary({section,children}: {section:OperatorWorkSectionKey;children:ReactNode}) {
 const search = useSearchParams();
 if (search.get("workSection") !== section) return children;
 return <PageStack><CollectionPageHeader title={section==="reports"?"Penanganan":section==="monitoring"?"Pemantauan":"Risiko"} /><OperatorWorkWorkspace section={section}/></PageStack>;
}

export function OperatorWorkWorkspace({section}: {section?:OperatorWorkSectionKey}) {
 const {token,user} = useAuth();
 if (!user || !token) return <CollectionLoadingState message="Memuat pekerjaan…" />;
 if (user.role !== "unit") return <CollectionErrorState title="Halaman operator" message="Pekerjaan saya tersedia untuk operator unit." />;
 return <WorkContent key={`${user.id}:${user.organizationId}:${token}:${section || "summary"}`} token={token} userID={user.id} section={section} />;
}

function WorkContent({token,userID,section}: {token:string;userID:string;section?:OperatorWorkSectionKey}) {
 const [data,setData] = useState<OperatorWorkSummary | OperatorWorkPage | null>(null);
 const [error,setError] = useState("");
 const [loading,setLoading] = useState(true);
 const [page,setPage] = useState(1);
 const [pageSize,setPageSize] = useState(20);
 const [reload,setReload] = useState(0);
 const [ui,setUI] = useState<WorkUIState>(() => {
  try { return readWorkUIState(typeof window === "undefined" ? null : sessionStorage.getItem(workUIKey(userID))); }
  catch { return readWorkUIState(null); }
 });
 const uiRef = useRef(ui);
 const restored = useRef(false);
 const persist = useCallback(() => {
  if (section) return;
  try {sessionStorage.setItem(workUIKey(userID),JSON.stringify({...uiRef.current,scrollY:window.scrollY}));} catch { /* Storage can be unavailable. */ }
 },[userID,section]);
 const {open,busyKey,actionError,clearActionError} = useOperatorWorkActions(token,persist);
 const refresh = useCallback(() => {setLoading(true);setError("");setReload(value=>value+1);},[]);
 useEffect(() => {
  let cancelled = false;
  const request = section ? listOperatorWorkSection(token,section,page,pageSize) : getOperatorWorkSummary(token);
  request
   .then(result => {
    if (cancelled) return;
    if (section && "items" in result && result.total>0 && page>Math.ceil(result.total/pageSize)) {
     setPage(Math.ceil(result.total/pageSize)); return;
    }
    setData(result);
   })
   .catch(() => {if(!cancelled)setError("Daftar pekerjaan belum berhasil dimuat.");})
   .finally(() => {if(!cancelled)setLoading(false);});
  return () => {cancelled=true;};
 },[token,section,page,pageSize,reload]);
 useEffect(() => {
  window.addEventListener("focus",refresh);
  return () => window.removeEventListener("focus",refresh);
 },[refresh]);
 useEffect(() => {
  if (section || !data || restored.current) return;
  const frame = requestAnimationFrame(() => {
   window.scrollTo({top:uiRef.current.scrollY,behavior:"instant"});
   restored.current=true;
  });
  return () => cancelAnimationFrame(frame);
 },[data,section]);
 useEffect(() => {
  if(section)return;
  const save=()=>{if(restored.current)persist();};
  window.addEventListener("scroll",save,{passive:true});
  window.addEventListener("pagehide",save);
  return ()=>{window.removeEventListener("scroll",save);window.removeEventListener("pagehide",save);};
 },[section,persist]);
 function changeSection(key:OperatorWorkSectionKey,value:boolean) {
  const next={...uiRef.current,open:{...uiRef.current.open,[key]:value}};
  uiRef.current=next;setUI(next);
  try {sessionStorage.setItem(workUIKey(userID),JSON.stringify({...next,scrollY:window.scrollY}));} catch { /* Optional UI preference only. */ }
 }
 function changePage(value:number){setLoading(true);setError("");setPage(value);}
 return <>
  {section ? <CollectionToolbar title={workSectionTitles[section]} description={section==="reports"?"Filter To-Do: belum dilaporkan, sudah dapat diisi, terlambat atau tenggat dalam 7 hari.":"Filter To-Do: pekerjaan yang masih perlu ditangani sesuai aturan periode dan tanggung jawab."} actions={<><ActionButton asChild variant="outline"><Link href="/work">Kembali ke pekerjaan</Link></ActionButton><ActionButton asChild variant="ghost"><Link href={workSectionPaths[section]}>Hapus filter</Link></ActionButton></>} /> :
   <CollectionPageHeader title="Pekerjaan saya" showTitle actions={<><ActionButton asChild><Link href="/risk/register/new?returnTo=/work" onClick={persist}>Tambah risiko</Link></ActionButton><ActionButton asChild><Link href="/risk-events?create=1" onClick={persist}>Catat kejadian</Link></ActionButton></>} />}
  {error ? <CollectionErrorState message={error} onReload={refresh}/> : null}
  {actionError ? <CollectionErrorState message={actionError} onReload={()=>{clearActionError();refresh();}}/> : null}
  {!data && loading ? <CollectionLoadingState message="Memuat pekerjaan…"/> : null}
  {data ? <div aria-busy={loading}>
   {"sections" in data ? <OperatorWorkSections sections={data.sections} open={ui.open} onOpenChange={changeSection} today={data.today} busyKey={busyKey} onOpen={item=>void open(item)} onNavigate={persist}/> :
    <OperatorWorkTable data={data} today={data.today || new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta"}).format(new Date())} busyKey={busyKey} onOpen={item=>void open(item)} loading={loading} pageSize={pageSize} onPageChange={changePage} onPageSizeChange={size=>{setLoading(true);setError("");setPage(1);setPageSize(size);}}/>}
  </div> : null}
 </>;
}
