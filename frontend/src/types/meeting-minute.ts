export interface ActionItem {
  task: string;
  pic: string;
  ownerUnit?: string;
  deadline: string;
  priority: "High" | "Medium" | "Low";
  status?: "open" | "on_track" | "blocked";
  notes?: string;
  relatedDecision?: string;
  needsConfirmation?: string[];
}

export interface MeetingMinutesRisk {
  id: string;
  meetingId: string;
  riskId: string;
  riskCode?: string;
  riskTitle?: string;
  linkedBy: string;
  linkedByName?: string;
  linkedAt: string;
}

export interface MeetingMinute {
  id: string;
  title: string;
  date: string;
  participants: string[];
  agenda: string[];
  summary: string;
  keyPoints: string[];
  decisions: string[];
  openIssues: string[];
  actionItems: ActionItem[];
  nextCheckIn?: string;
  transcript: string;
  organizationId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingMinuteWithRisks extends MeetingMinute {
  linkedRisks: MeetingMinutesRisk[];
}

export interface CreateMeetingMinuteInput {
  title: string;
  date: string;
  participants?: string[];
  agenda?: string[];
  summary: string;
  keyPoints?: string[];
  decisions?: string[];
  openIssues?: string[];
  actionItems?: ActionItem[];
  nextCheckIn?: string;
  transcript?: string;
  organizationId?: string;
  riskIds?: string[];
}

export interface CreateMeetingMinuteResult {
  id: string;
  title: string;
  date: string;
  linkedRiskIds: string[];
}

export interface ListMeetingMinutesOptions {
  organizationId?: string;
  createdBy?: string;
  riskId?: string;
  createdAt?: string;
  limit?: number;
  offset?: number;
}
