import { Button } from "@/components/ui/button";
import type { ProfilePeriodProgress } from "@/lib/api/profile-periods";
import type { AnnualMemberExclusion } from "@/lib/api/upr-workflow";
import { todayMonitoringDate } from "@/lib/monitoring-date";

export function AnnualExclusionReview({ exclusions, year, periods, busy, onCancel }: {
  exclusions: AnnualMemberExclusion[];
  year: number;
  periods?: ProfilePeriodProgress[];
  busy: boolean;
  onCancel: (groupId: string) => void;
}) {
  if (!exclusions.length) return null;

  const profileStart = `${year}-01-01`;
  const today = todayMonitoringDate();
  const effectiveDate = today < profileStart ? profileStart : today;
  const firstPeriod = effectiveDate.startsWith(`${year}-`)
    ? periods?.find((period) => period.calendarEndsOn && effectiveDate <= period.calendarEndsOn)
    : undefined;

  return (
    <div className="space-y-1">
      <dt className="text-secondary-foreground">Pengeluaran risiko</dt>
      <dd>{exclusions.length} risiko akan dikeluarkan</dd>
      {today < profileStart && <dd>Pengeluaran berlaku mulai 1 Januari {year}.</dd>}
      {firstPeriod && (
        <dd className="text-muted-foreground">
          Jika difinalisasi hari ini, periode pertama yang terdampak adalah {firstPeriod.label}.
        </dd>
      )}
      <dd>
        <ul className="max-h-40 divide-y divide-border overflow-y-auto">
          {exclusions.map(({ groupId, code, title }) => (
            <li key={groupId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0 wrap-anywhere">{code} {title}</span>
              <Button type="button" variant="outline" size="sm" disabled={busy}
                aria-label={`Batalkan pengeluaran ${code} ${title}`}
                onClick={() => onCancel(groupId)}>
                Batalkan pengeluaran
              </Button>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
