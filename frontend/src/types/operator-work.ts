export type OperatorWorkItem = {
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
export type OperatorWorkPage = { items: OperatorWorkItem[]; page: number; hasNext: boolean };
