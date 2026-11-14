import { api } from '@/lib/api';
import type { MonitoringRule, MonitoringRulePeriod } from './monitoring-rules';
import type { ProcessProgress } from '@/lib/profile-period-progress';

export type ProfilePeriodProgress = MonitoringRulePeriod & {
  workingPaper: ProcessProgress;
  evaluation: ProcessProgress;
  monitorings: (ProcessProgress & { groupId: string; applicable?: boolean })[];
};
export type ProfilePeriodWorkspace = { rule: MonitoringRule | null; periods: ProfilePeriodProgress[] };
export function getProfilePeriodProgress(token: string, profileId: string) {
  return api.get<ProfilePeriodWorkspace>(`/annual-profile-versions/${encodeURIComponent(profileId)}/period-progress`, token);
}
