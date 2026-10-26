export type AgentSkillId = "risks" | "mitigations" | "incidents" | "reports";
export interface AgentSkill { id: AgentSkillId; name: string; description: string }
export type AgentRunStatus = "queued" | "running" | "waiting_for_input" | "waiting_for_confirmation" | "completed" | "failed" | "cancelled";
export interface AgentConversation { id: string; title: string; status: string; createdAt: string; updatedAt: string }
export interface AgentAttachment { id: string; name: string; mimeType: string; size: number; createdAt: string; warnings?: string[] }
export interface AgentActivity { id: string; label: string; status: string; createdAt: string }
export interface AgentRun { id: string; conversationId: string; status: AgentRunStatus; events: AgentActivity[]; startedAt?: string; finishedAt?: string; error?: string }
export type AgentCell = string | number | boolean | null;
export interface AgentWidgetAction { label: string; prompt: string; skills: AgentSkillId[] }
export interface AgentRiskDetail {
  id: string; code: string; title: string; score: number | null; level: string; status: string;
  cycle: string; organizationId: string; href: string; causes?: string[]; impacts?: string[];
  control?: string; mitigations?: { action: string; owner: string; dueDate: string }[];
  actions: AgentWidgetAction[];
}
export interface AgentPriorityList {
  items: { risk: AgentRiskDetail; tasks: { id: string; action: string; owner: string; dueDate: string; href: string }[]; overdueDays: number; overdueCount: number }[];
  total: number; page: number; limit: number; cycle: string;
}
export interface AgentPeriodComparison {
  cycle: string; comparisonCycle: string; href: string; warnings?: string[];
  rows: { label: string; current: number | null; previous: number | null; delta: number | null }[];
}
export interface AgentWidget {
  id: string; type: "table" | "metrics" | "bar_chart" | "document" | "clarification" | "risk_detail" | "priority_list" | "period_comparison";
  title: string; description?: string; snapshotAt: string; scopeLabel?: string;
  columns?: { key: string; label: string }[];
  rows?: Record<string, AgentCell>[];
  metrics?: { label: string; value: string | number; description?: string }[];
  sourceIds?: string[];
  risk?: AgentRiskDetail;
  priorities?: AgentPriorityList;
  comparison?: AgentPeriodComparison;
  actions?: AgentWidgetAction[];
  refreshAction?: AgentWidgetAction;
  warnings?: string[];
}
export interface AgentMessage { id: string; conversationId: string; runId?: string; role: "user" | "assistant"; content: string; widgets: AgentWidget[]; attachments: AgentAttachment[]; createdAt: string }
export interface AgentOperation {
  id: string; kind: string; targetId?: string; title: string; reason?: string; included: boolean;
  before?: Record<string, unknown>; after: Record<string, unknown>; expectedUpdatedAt?: string; organizationId?: string;
}
export type AgentProposalStatus = "proposed" | "applying" | "applied" | "rejected" | "stale" | "failed";
export interface AgentProposal {
  id: string; conversationId: string; runId: string; revision: number; status: AgentProposalStatus; title: string;
  operations: AgentOperation[]; createdAt: string; appliedAt?: string; receipt?: { operationId: string; title: string; href?: string }[];
}
export interface AgentConversationDetail { conversation: AgentConversation; messages: AgentMessage[]; runs: AgentRun[]; proposals: AgentProposal[] }
export interface AgentSendInput { content: string; skills: AgentSkillId[]; attachmentIds: string[]; idempotencyKey: string }
