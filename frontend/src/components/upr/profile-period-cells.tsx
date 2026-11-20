'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ProfilePeriodProgress } from '@/lib/api/profile-periods';
import { periodWindowState, type ProcessProgress } from '@/lib/profile-period-progress';

const statusLabels = { pending: 'Pending', ongoing: 'Ongoing', done: 'Done' };

function PeriodStatusAction({ progress, label, actionLabel, href, disabled, onStart, readOnly }: {
  progress: ProcessProgress;
  label?: string;
  actionLabel: string;
  href?: string;
  disabled?: boolean;
  onStart?: () => void;
  readOnly?: boolean;
}) {
  return <div className="flex flex-col items-start gap-1.5">
    <div className="flex items-center gap-2">
      {label && <span className="text-xs font-medium">{label}</span>}
      <Badge variant="outline" className={progress.status === 'done' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : ''}>
        {statusLabels[progress.status]}
      </Badge>
    </div>
    {href ? (
      <Button asChild variant="outline" size="xs"><Link href={href}>{actionLabel}</Link></Button>
    ) : !readOnly ? (
      <Button type="button" variant="outline" size="xs" disabled={disabled || !onStart} onClick={onStart}>{actionLabel}</Button>
    ) : null}
  </div>;
}

export function ProfileDocumentPeriodCell({ period, profileId, organizationId, canCreate = true, readOnly }: {
  period: ProfilePeriodProgress; profileId: string; organizationId?: string; canCreate?: boolean; readOnly?: boolean;
}) {
  const canStart = !readOnly && canCreate && periodWindowState(period) === 'open';
  const query = new URLSearchParams({ profile_version_id: profileId, monitoring_period_id: period.id });
  if (organizationId) query.set('org_id', organizationId);
  const wpHref = period.workingPaper.id ? `/risk/working-papers/${period.workingPaper.id}` : canStart ? `/risk/working-papers/new?${query}` : undefined;
  const evalQuery = new URLSearchParams({ create: '1', profile_version_id: profileId, monitoring_period_id: period.id });
  const evalHref = period.evaluation.id ? `/evaluations/${period.evaluation.id}` : canStart ? `/evaluations?${evalQuery}` : undefined;

  return <div className="flex min-w-40 flex-col items-start gap-3 py-1">
    <PeriodStatusAction
      label="Kertas kerja"
      progress={period.workingPaper}
      href={wpHref}
      readOnly={readOnly}
      actionLabel={period.workingPaper.id ? readOnly || period.workingPaper.status === 'done' ? 'Lihat kertas kerja' : 'Lanjutkan kertas kerja' : 'Mulai kertas kerja'}
    />
    <PeriodStatusAction
      label="Evaluasi"
      progress={period.evaluation}
      href={evalHref}
      readOnly={readOnly}
      actionLabel={period.evaluation.id ? readOnly || period.evaluation.status === 'done' ? 'Lihat evaluasi' : 'Lanjutkan evaluasi' : 'Mulai evaluasi'}
    />
  </div>;
}

export function RiskMonitoringPeriodCell({ period, groupId, onStart, disabled, readOnly }: {
  period: ProfilePeriodProgress; groupId: string; onStart?: () => void; disabled?: boolean; readOnly?: boolean;
}) {
  const monitoring = period.monitorings.find(item => item.groupId === groupId);
  if (monitoring?.applicable === false) return <p className="text-xs text-muted-foreground">Belum berlaku pada periode ini</p>;
  const progress: ProcessProgress = monitoring ?? { status: 'pending', completed: 0, total: 0 };
  const href = progress.id ? `/risk/monitoring/${progress.id}` : undefined;

  return <div className="min-w-40 py-1">
    <PeriodStatusAction
      progress={progress}
      href={href}
      actionLabel={href ? readOnly || progress.status === 'done' ? 'Lihat pemantauan' : 'Lanjutkan pemantauan' : 'Mulai pemantauan'}
      disabled={disabled || periodWindowState(period) !== 'open'}
      onStart={onStart}
      readOnly={readOnly}
    />
  </div>;
}
