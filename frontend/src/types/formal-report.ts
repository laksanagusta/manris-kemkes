export type FormalReportType =
  | "monitoring_evaluation_report";

export type FormalReportStatus = "draft" | "generated" | "submitted" | "approved";

export type FormalReport = {
  id: string;
  organizationId: string;
  period: string;
  reportType: FormalReportType;
  status: FormalReportStatus;
  generatedFileUrl: string;
  generatedBy?: string | null;
  generatedAt?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedFormalReportResponse = {
  data: FormalReport[];
  total: number;
  page: number;
  limit: number;
};

export type ListFormalReportsParams = {
  organizationId?: string;
  organizationGroupId?: string;
  period?: string;
  reportType?: FormalReportType;
  status?: FormalReportStatus;
  page?: number;
  limit?: number;
};

export type GenerateFormalReportRequest = {
  organizationId: string;
  period: string;
  reportType: FormalReportType;
  generatedBy?: string;
};

// FormalReportSummary is the parsed summary structure from backend metadata.
export interface FormalReportSummary {
  headline: string;
  focus: string;
  riskCount: number;
  incidentCount: number;
  tmpmrCount: number;
  tmpmrScore: number;
  tmpmrLevel: string;
  sourceWarnings: string[];
}

// parseFormalReportSummary safely extracts the summary object from formal report metadata.
export function parseFormalReportSummary(
  metadata: Record<string, unknown>,
): FormalReportSummary | null {
  const raw = metadata?.summary;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const summary = raw as Record<string, unknown>;
  return {
    headline: typeof summary.headline === "string" ? summary.headline : "",
    focus: typeof summary.focus === "string" ? summary.focus : "",
    riskCount: typeof summary.riskCount === "number" ? summary.riskCount : 0,
    incidentCount: typeof summary.incidentCount === "number" ? summary.incidentCount : 0,
    tmpmrCount: typeof summary.tmpmrCount === "number" ? summary.tmpmrCount : 0,
    tmpmrScore: typeof summary.tmpmrScore === "number" ? summary.tmpmrScore : 0,
    tmpmrLevel: typeof summary.tmpmrLevel === "string" ? summary.tmpmrLevel : "",
    sourceWarnings: Array.isArray(summary.sourceWarnings)
      ? (summary.sourceWarnings as unknown[]).filter((w): w is string => typeof w === "string")
      : [],
  };
}
