'use client';

import { PeriodProcessProgress } from '@/components/shared/design-system/domain/period-process-progress';
import type { ProfilePeriodProgress } from '@/lib/api/profile-periods';
import { periodWindowState, type ProcessProgress } from '@/lib/profile-period-progress';
import { workflowDate } from './workflow-ui';

export function PeriodWindowNotice({ period }: { period: ProfilePeriodProgress }) {
  const state = periodWindowState(period);
  return <p className="text-xs text-muted-foreground">{state === 'upcoming' ? `Dibuka ${workflowDate(period.opensOn)}` : state === 'closed' ? `Ditutup ${workflowDate(period.closesOn)}` : `Hingga ${workflowDate(period.closesOn)}`}</p>;
}

export function ProfileDocumentPeriodCell({ period, profileId, organizationId, canCreate = true }: {
  period: ProfilePeriodProgress; profileId: string; organizationId?: string; canCreate?: boolean;
}) {
  const query = new URLSearchParams({ profile_version_id: profileId, monitoring_period_id: period.id });
  if (organizationId) query.set('org_id', organizationId);
  const wpHref = period.workingPaper.id ? `/risk/working-papers/${period.workingPaper.id}` : canCreate && periodWindowState(period) === 'open' ? `/risk/working-papers/new?${query}` : undefined;
  const evalQuery = new URLSearchParams({ create:'1', profile_version_id:profileId, monitoring_period_id:period.id });
  const evalHref = period.evaluation.id ? `/evaluations/${period.evaluation.id}` : canCreate && periodWindowState(period) === 'open' ? `/evaluations?${evalQuery}` : undefined;
  return <div className="min-w-48 space-y-3 py-1">
    <PeriodProcessProgress label="Kertas kerja" progress={period.workingPaper} href={wpHref} unit="penandatangan" />
    <PeriodProcessProgress label="Evaluasi" progress={period.evaluation} href={evalHref} unit="poin" />
    <PeriodWindowNotice period={period} />
  </div>;
}

export function RiskMonitoringPeriodCell({period,groupId,onStart,disabled}: {
  period: ProfilePeriodProgress; groupId: string; onStart?: () => void; disabled?: boolean;
}) {
  const monitoring = period.monitorings.find(item => item.groupId === groupId);
  if(monitoring?.applicable === false) return <div className="min-w-48 space-y-2"><p className="text-xs text-muted-foreground">Belum berlaku pada periode ini</p><PeriodWindowNotice period={period} /></div>;
  const progress: ProcessProgress = monitoring ?? {status:'pending',completed:0,total:0};
  const href = progress.id ? `/risk/monitoring/${progress.id}` : undefined;
  return <div className="min-w-48 space-y-2 py-1">
    <PeriodProcessProgress label="Pemantauan" progress={progress} href={href} />
    {!href && onStart && periodWindowState(period) === 'open' && <button type="button" disabled={disabled} onClick={onStart} className="min-h-8 text-xs font-medium text-primary disabled:opacity-50">Mulai pemantauan</button>}
    <PeriodWindowNotice period={period} />
  </div>;
}
