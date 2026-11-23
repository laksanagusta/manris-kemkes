import { api } from '@/lib/api';
import type { MonitoringRule, MonitoringRulePeriod } from './monitoring-rules';
import type { ProcessProgress } from '@/lib/profile-period-progress';

export type ProfilePeriodProgress = MonitoringRulePeriod & {
  scopeProfileId?: string;
  scopeLocked?: boolean;
  needsReview?: boolean;
  blocksRevision?: boolean;
  canCloseAdministratively?: boolean;
  administrativeClosureReason?: string;
  calendarEndsOn?: string;
  workingPaper: ProcessProgress;
  evaluation: ProcessProgress;
  monitorings: (ProcessProgress & { groupId: string; applicable?: boolean })[];
};
export type ProfilePeriodWorkspace = {
  year: number;
  version: number;
  rule: MonitoringRule | null;
  periods: ProfilePeriodProgress[];
  linkedDocuments?: {
    id: string;
    kind: "workingPaper" | "evaluation";
    complete: boolean;
    observationCutoff?: string;
  }[];
};
export function getProfilePeriodProgress(token: string, profileId: string) {
  return api.get<ProfilePeriodWorkspace>(`/annual-profile-versions/${encodeURIComponent(profileId)}/period-progress`, token);
}

export function approveProfilePeriodClosure(token: string, profileId: string, periodId: string, reason: string) {
  return api.post(`/annual-profile-versions/${encodeURIComponent(profileId)}/periods/${encodeURIComponent(periodId)}/administrative-closure`, { reason }, token);
}
