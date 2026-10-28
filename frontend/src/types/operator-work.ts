export type OperatorWorkItem = {
  mitigationAction?: string;
  key: string;
  kind: "risk_draft" | "mitigation_report" | "monitoring_start" | "monitoring_draft";
  targetId: string;
  riskId: string;
  riskCode: string;
  riskTitle: string;
  actionLabel: string;
  period: string;
  dueDate: string;
  responsibility: "personal" | "unit";
  createdAt: string;
};
export type OperatorWorkPage = { items: OperatorWorkItem[]; page: number; hasNext: boolean; total: number; today?: string };

export type OperatorWorkSectionKey = "reports" | "monitoring" | "drafts";
export type OperatorWorkSection = { key: OperatorWorkSectionKey; total: number; items: OperatorWorkItem[] };
export type OperatorWorkSummary = { sections: OperatorWorkSection[]; today: string };
