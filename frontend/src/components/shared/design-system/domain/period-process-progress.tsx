import Link from 'next/link';
import type { ProcessProgress } from '@/lib/profile-period-progress';
import { progressPercent } from '@/lib/profile-period-progress';
import { cn } from '@/lib/utils';

const labels = { pending: 'Pending', ongoing: 'Ongoing', done: 'Done' };
export function PeriodProcessProgress({ label, progress, href, unit = 'bagian' }: {
  label: string; progress: ProcessProgress; href?: string; unit?: string;
}) {
  const percent = progressPercent(progress);
  const content = <>
    <span className="flex items-center justify-between gap-3 text-xs">
      <span className="font-medium">{label}</span>
      <span className={cn('shrink-0', progress.status === 'done' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>{labels[progress.status]}</span>
    </span>
    {percent !== null ? <>
      <span role="progressbar" aria-label={`${label}: ${labels[progress.status]}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${progress.completed} dari ${progress.total} ${unit}; ${percent}%`} className="block h-1 overflow-hidden rounded-full bg-muted">
        <span className={cn('block h-full rounded-full', progress.status === 'done' ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-primary')} style={{ width: `${percent}%` }} />
      </span>
      <span className="block text-xs tabular-nums text-muted-foreground">{progress.completed}/{progress.total} {unit} · {percent}%</span>
    </> : <span className="block text-xs text-muted-foreground">{progress.status === 'pending' ? 'Belum dimulai' : progress.status === 'done' ? 'Selesai' : 'Rincian progres belum tersedia'}</span>}
    {progress.note && <span className="block text-xs text-muted-foreground">{progress.note}</span>}
  </>;
  const cls = 'block min-w-44 space-y-1.5 rounded-sm text-foreground';
  return href ? <Link href={href} className={cn(cls, 'no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-ring')} aria-label={`${label}: ${labels[progress.status]}. Buka detail`}>{content}</Link> : <div className={cls}>{content}</div>;
}
