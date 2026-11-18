'use client';
import { MitigationExecutionField, type MitigationExecution } from '../domain/mitigation-execution-field';
import { useState } from 'react';
import { RiskTransactionBadge } from '../domain/risk-transaction-badge';
import { RiskWorkflowActions } from '../domain/risk-workflow-actions';
import { RiskRevisionAction } from '../domain/risk-revision-action';
import { RiskCreationContext, RiskFinalizationReview } from '../domain/risk-creation-guidance';
import { MitigationProgressForm } from '../domain/mitigation-progress-form';
import type { StartRiskRevisionResponse } from '@/lib/api/risk-monitoring';

export function RiskRevisionExample(){
 const [execution,setExecution]=useState<MitigationExecution>('pending');
 const [notice,setNotice]=useState('');const [notes,setNotes]=useState('');const [evidence,setEvidence]=useState('');
 return <section className="space-y-6" aria-label="Revisi profil dan pelaporan mitigasi">
  <div className="space-y-3"><h3 className="text-sm font-medium">Revisi profil dan pemantauan</h3><div className="flex flex-wrap gap-2">{(['initial','monitoring','revision'] as const).map(transactionKind=><RiskTransactionBadge key={transactionKind} record={{transactionKind}} />)}</div>
   <p className="text-sm text-muted-foreground">Gunakan form Buat Risiko yang sama untuk mengedit profil. Finalisasi membuat versi baru; perubahan kemungkinan atau dampak juga dicatat sebagai transaksi revision.</p><RiskRevisionAction token="example" riskId="example" start={async()=>({riskId:'example',redirectUrl:'#risk-revision-example',existingDraft:false} satisfies StartRiskRevisionResponse)} onStarted={()=>setNotice('Form Buat Risiko dibuka dalam konteks revisi. Profil aktif belum berubah.')} />
   <div className="space-y-2"><p className="text-sm">Draf revisi tersedia</p><div className="flex flex-wrap gap-2"><RiskWorkflowActions token="example" riskId="example" drafts={{revisionRiskId:'example-revision'}} status="ready" onStartMonitoring={()=>{}} onRevisionStarted={()=>{}} onRetry={()=>{}} /></div></div>
   <div className="space-y-2"><p className="text-sm">Draf pemantauan tersedia</p><div className="flex flex-wrap gap-2"><RiskWorkflowActions token="example" riskId="example" drafts={{monitoringId:'example-monitoring'}} status="ready" onStartMonitoring={()=>{}} onRevisionStarted={()=>{}} onRetry={()=>{}} /></div></div>
   {notice&&<p role="status" className="text-sm text-muted-foreground">{notice}</p>}
   <RiskCreationContext saveMessage="Draf revisi tersimpan." revisionVersion={2} />
   <RiskFinalizationReview score={11} target={4} level="Sedang" mitigationCount={2} revision={{version:2,reason:'Perubahan pengendalian distribusi',previousProbability:3,previousImpact:3,probability:2,impact:3}} />
  </div>
  <div className="max-w-xl space-y-3"><h3 className="text-sm font-medium">Laporan di dalam pemantauan</h3><p className="text-xs text-muted-foreground">Setiap tindakan wajib dilaporkan. Kondisi belum dilaksanakan tetap bisa dilaporkan dengan alasan.</p><MitigationProgressForm leadingContent={<MitigationExecutionField value={execution} onChange={setExecution} />} evidenceUrl={evidence} onEvidenceUrlChange={setEvidence} notes={notes} onNotesChange={setNotes} /></div>
 </section>;
}
