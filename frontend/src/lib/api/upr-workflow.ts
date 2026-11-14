import { api } from "@/lib/api";

export type AnnualVersion = {
  id: string;
  version: number;
  finalizedAt: string | null;
  finalizedBy: string | null;
};

export type AnnualProfileListVersion = Pick<
  AnnualVersion,
  "id" | "version" | "finalizedAt"
> & {
  year: number;
  updatedAt: string;
  riskCount: number;
};

export type AnnualPickupRisk = {
  id: string | null;
  code: string;
  title: string;
  period: string;
  score: number | null;
  unavailable: string;
};

export type Baseline = {
  riskId: string;
  title: string;
  code: string;
  objective: string | null;
  score: number;
  targetScore: number;
  mitigations: {
    id: string;
    action: string;
    owner: string;
    due_date: string | null;
  }[];
};

export type AnnualMember = {
  groupId: string;
  riskId: string | null;
  sourceRiskId: string | null;
  objectiveId: string | null;
  effectiveFrom: string;
  changeReason: string;
  baseline: Baseline | null;
  code: string;
  title: string;
  riskStatus: string;
  score: number | null;
  canRemove: boolean;
};

export type AnnualCandidate = {
  id: string;
  groupId: string;
  code: string;
  title: string;
  period: string;
  score: number;
  source:
    | "prior_profile"
    | "year_end_register"
    | "other_active"
    | "current_year";
  suggestedObjectiveId: string | null;
};

export type AnnualProfile = {
  versions: AnnualVersion[];
  selected: AnnualVersion | null;
  members: AnnualMember[];
  objectives: { id: string; title: string }[];
};

export type AnnualMemberInput = {
  riskId: string;
  objectiveId: string | null;
  effectiveFrom: string;
  changeReason: string;
  reassess: boolean;
  deferAssessment?: boolean;
};

export type ReportKind = "semester" | "working_paper" | "evaluation";
export type ReportResolution = "accepted" | "changes_requested";

export type ReportRecord = {
  title?: string;
  id: string;
  kind: ReportKind;
  period: string;
  version: number;
  previousVersionId: string | null;
  finalizedAt: string;
  organizationId: string;
  organization: string;
  deliveryId: string | null;
  previousDeliveryId: string | null;
  recipientId: string | null;
  recipient: string | null;
  sentAt: string | null;
  sentBy: string | null;
  senderName: string | null;
  resolution: ReportResolution | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolverName: string | null;
  note: string | null;
};

export type ReportSource = {
  id: string;
  kind: Exclude<ReportKind, "semester">;
  period: string;
  code: string;
  title: string;
  documentDate?: string | null;
};

export type ReportWorkspace = {
  hasChildren: boolean;
  drafts: ReportDraftSummary[];
  incoming: ReportRecord[];
  outgoing: ReportRecord[];
  sources: ReportSource[];
  recipient: string | null;
};

export type SemesterInput = {
  year: number;
  semester: number;
  profileId: string | null;
  reason: string;
};

export type SemesterMonitoringObservation = {
  id: string;
  period: string;
  observedAt?: string;
  observedAtInferred?: boolean;
  finalizedAt?: string;
  score: number | null;
  conclusion: string;
  mitigationProgress: string;
  mitigationCompletion: number;
};

export type ReportDraftInput = SemesterInput & {
  title: string;
  workingPaperIds: string[];
  evaluationId: string | null;
};

export type ReportDraftSummary = Pick<ReportDraftInput, "title" | "year" | "semester"> & { id: string };

export type ReportDocumentKind = "profile" | ReportSource["kind"];

export type ReportDocumentOption = {
  id: string;
  kind: ReportDocumentKind;
  title: string;
  code: string;
  documentDate: string | null;
  finalizedAt: string | null;
};

export type ReportDraft = {
  id: string;
  input: ReportDraftInput;
  revision: number;
  sentId: string | null;
};

export type SemesterSnapshot = {
  title?: string;
  reviewKey?: string;
  cutoff: string;
  profile: AnnualVersion | null;
  reason: string;
  supporting: {
    kind: ReportKind;
    period: string;
    sourceId: string | null;
    code: string | null;
    finalizedAt: string | null;
    contents?: EvaluationSnapshot | WorkingPaperSnapshot;
  }[];
  risks: (Baseline & {
    groupId: string;
    effectiveFrom: string;
    changeReason: string;
    monitoring: SemesterMonitoringObservation[];
    latestMonitoring?: SemesterMonitoringObservation | null;
    mitigationReports?: { id: string; action: string; notes: string; reportedOn: string }[];
    events?: { id: string; code: string; description: string; occurredOn: string }[];
  })[];
};

export type EvaluationSnapshot = {
  code: string;
  reportNumber: string;
  reportDate: string | null;
  assignmentLetterNumber: string;
  monitoringDateRange: string;
  unitLeaderName: string;
  teamLead: string;
  problems: string;
  recommendations: string;
  sections?: {
    id: string;
    title: string;
    description: string;
    conclusion: string;
    items?: {
      id: string;
      label: string;
      answer: string;
      condition: string;
      description: string;
      analysis: string;
    }[];
  }[];
};

export type WorkingPaperSnapshot = {
  observation_cutoff?: string;
  code: string;
  title: string;
  document_hash: string;
  completed_at: string | null;
  risks:
    | {
        id: string;
        risk: {
          code: string;
          title: string;
          inherentScore: number;
          mitigations?: string[];
          monitoring?: {
            status: string;
            observedNilai: number;
            mitigationProgressSummary: string;
          };
        };
        result_risk?: { inherentScore: number };
      }[]
    | null;
  signatories:
    | {
        id: string;
        signer_name: string;
        signer_jabatan: string;
        signed_at?: string;
      }[]
    | null;
};

export type ReportDetail = ReportRecord & {
  snapshot: SemesterSnapshot | EvaluationSnapshot | WorkingPaperSnapshot;
};

export const reportKindLabel: Record<ReportKind, string> = {
  semester: "Laporan Penerapan Manajemen Risiko",
  working_paper: "KK Pemantauan dan Reviu",
  evaluation: "Evaluasi",
};

export const uprApi = {
  profiles: (token: string) =>
    api.get<AnnualProfileListVersion[]>("/annual-profiles", token),
  pickup: (token: string, year: number, sourceProfileId: string | null) =>
    api.get<AnnualPickupRisk[]>(
      `/annual-profiles/${year}/pickup${sourceProfileId ? `?sourceProfileId=${encodeURIComponent(sourceProfileId)}` : ""}`,
      token,
    ),
  initiate: (
    token: string,
    year: number,
    sourceProfileId: string | null,
    riskIds: string[],
    monitoringRuleId?: string,
  ) =>
    api.post<{ id: string }>(
      `/annual-profiles/${year}/initiate`,
      { sourceProfileId, riskIds, monitoringRuleId },
      token,
    ),
  profile: (token: string, year: number, id = "") =>
    api.get<AnnualProfile>(
      `/annual-profiles/${year}${id ? `?version=${encodeURIComponent(id)}` : ""}`,
      token,
    ),
  candidates: (token: string, year: number) =>
    api.get<AnnualCandidate[]>(`/annual-profiles/${year}/candidates`, token),
  draft: (token: string, year: number) =>
    api.post<{ id: string }>(`/annual-profiles/${year}/draft`, {}, token),
  saveMember: (token: string, profile: string, data: AnnualMemberInput) =>
    api.post<{ riskId: string }>(
      `/annual-profile-versions/${profile}/members`,
      data,
      token,
    ),
  removeMember: (token: string, profile: string, group: string) =>
    api.delete(
      `/annual-profile-versions/${profile}/members/${group}`,
      undefined,
      token,
    ),
  finalizeProfile: (token: string, profile: string) =>
    api.post(`/annual-profile-versions/${profile}/finalize`, {}, token),
  deleteDraft: (token: string, profile: string) =>
    api.delete(
      `/annual-profile-versions/${profile}`,
      undefined,
      token,
    ),
  workspace: (token: string) => api.get<ReportWorkspace>("/upr-reports?include_sources=false", token),
  searchReportDocuments: (token: string, kind: ReportDocumentKind, year: number, query: string, page: number, signal: AbortSignal) => {
    const params = new URLSearchParams({ kind, year: String(year), q: query, page: String(page) });
    return api.get<{ items: ReportDocumentOption[]; hasMore: boolean }>(
      `/upr-report-drafts/documents?${params}`, token, { signal },
    );
  },
  selectedReportDocuments: (token: string, year: number, ids: string[]) =>
    api.post<ReportDocumentOption[]>("/upr-report-drafts/documents/selected", { year, ids }, token),
  reportDraft: (token: string, id: string) =>
    api.get<ReportDraft>(`/upr-report-drafts/${id}`, token),
  createReportDraft: (token: string, input: ReportDraftInput) =>
    api.post<ReportDraft>("/upr-report-drafts", input, token),
  updateReportDraft: (token: string, id: string, input: ReportDraftInput, revision: number) =>
    api.put<ReportDraft>(`/upr-report-drafts/${id}`, { input, revision }, token),
  previewReportDraft: (token: string, input: ReportDraftInput) =>
    api.post<SemesterSnapshot>("/upr-report-drafts/preview", input, token),
  sendReportDraft: (token: string, id: string, revision: number, reviewKey: string) =>
    api.post<{ id: string }>(`/upr-report-drafts/${id}/send`, { revision, reviewKey }, token),
  preview: (token: string, data: SemesterInput) =>
    api.post<SemesterSnapshot>("/upr-reports/semester/preview", data, token),
  finalizeSemester: (token: string, data: SemesterInput) =>
    api.post<{ id: string }>("/upr-reports/semester/finalize", data, token),
  detail: (token: string, id: string) =>
    api.get<ReportDetail>(`/upr-reports/${id}`, token),
  send: (
    token: string,
    id: string,
    kind?: ReportSource["kind"],
    previousDeliveryId?: string,
  ) =>
    api.post<{ id: string }>(
      `/upr-reports/${id}/send`,
      { kind, previousDeliveryId },
      token,
    ),
  resolve: (
    token: string,
    delivery: string,
    resolution: ReportResolution,
    note = "",
  ) =>
    api.post(
      `/upr-report-deliveries/${delivery}/resolve`,
      { resolution, note },
      token,
    ),
};
