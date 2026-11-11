export interface UnitProgressItem {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  status: string;
  updatedAt: string;
}

export interface UnitProgressRisk extends UnitProgressItem {
  monitoringId?: string;
  monitoringStatus?: string;
  profileChanged: boolean;
}

export interface UnitProgressWorkingPaper extends UnitProgressItem {
  signed: number;
  signers: number;
  nextSigner?: string;
  tteSkipped: boolean;
}

export interface UnitProgressMitigation extends UnitProgressItem {
  riskTitle: string;
  owner: string;
  dueDate: string;
  overdue: boolean;
  reportedLate: boolean;
}

export interface UnitProgressReport {
  cycle: string;
  monitoringAvailable: boolean;
  organizations: { id: string; name: string }[];
  risks: UnitProgressRisk[];
  workingPapers: UnitProgressWorkingPaper[];
  evaluations: UnitProgressItem[];
  mitigations: UnitProgressMitigation[];
}
