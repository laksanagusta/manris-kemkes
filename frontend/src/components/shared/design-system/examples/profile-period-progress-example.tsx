import { AnnualProfilePeriods } from '@/components/upr/annual-profile-periods';
import { RiskMonitoringPeriodCell } from '@/components/upr/profile-period-cells';
import type { ProfilePeriodProgress } from '@/lib/api/profile-periods';

const period: ProfilePeriodProgress = {
  id: 'example-period',
  label: 'Semester I',
  ordinal: 1,
  opensOn: '2026-01-01',
  closesOn: '2026-06-30',
  calendarEndsOn: '2026-06-30',
  scopeProfileId: 'example-profile',
  scopeLocked: true,
  workingPaper: { status: 'ongoing', completed: 2, total: 4, id: 'example-working-paper' },
  evaluation: { status: 'done', completed: 20, total: 20, id: 'example-evaluation' },
  monitorings: [{ groupId: 'example-risk', status: 'done', completed: 4, total: 4, id: 'example-monitoring' }],
};

export function ProfilePeriodProgressExample() {
  return <section className="space-y-4" aria-label="Progres periode profil">
    <h3 className="text-sm font-medium">Status dan aksi per periode</h3>
    <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
      <AnnualProfilePeriods
        workspace={{ year: 2026, version: 2, rule: { id: 'example-rule', name: 'Aturan semester', year: 2026, frequency: 'semester', active: true, periods: [period] }, periods: [period] }}
        profileId="example-profile" finalized readOnly retry={() => undefined}
      />
      <div className="space-y-2">
        <RiskMonitoringPeriodCell groupId="example-risk" period={period} profileFinalized readOnly />
      </div>
    </div>
  </section>;
}
