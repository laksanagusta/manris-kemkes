export type EvaluationStatus = "draft" | "final";
export type EvaluationAnswer = "unset" | "yes" | "no";

export type EvaluationItem = {
  id: string;
  sectionId: string;
  templateItemId?: string | null;
  itemKey: string;
  itemNo: string;
  label: string;
  answer: EvaluationAnswer;
  condition: string;
  description: string;
  analysis: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationSection = {
  id: string;
  evaluationId: string;
  templateSectionId?: string | null;
  sectionKey: string;
  title: string;
  description: string;
  conclusion: string;
  sortOrder: number;
  items: EvaluationItem[];
  createdAt: string;
  updatedAt: string;
};

export type Evaluation = {
  id: string;
  organizationId: string;
  period: string;
  templateId: string;
  templateName?: string;
  status: EvaluationStatus;
  reportNumber: string;
  reportDate?: string | null;
  assignmentLetterNumber: string;
  assignmentLetterDate?: string | null;
  monitoringDateRange: string;
  unitCode: string;
  unitLocation: string;
  unitAddress: string;
  unitEselonI: string;
  unitLeaderName: string;
  teamCoordinator: string;
  teamLead: string;
  teamMembers: string;
  problems: string;
  recommendations: string;
  createdBy?: string | null;
  finalizedAt?: string | null;
  sections: EvaluationSection[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedEvaluationResponse = {
  data: Evaluation[];
  total: number;
  page: number;
  limit: number;
};

export type ListEvaluationsParams = {
  organizationId?: string;
  period?: string;
  status?: EvaluationStatus;
  query?: string;
  page?: number;
  limit?: number;
};

export type CreateEvaluationRequest = {
  organizationId: string;
  period: string;
  templateKey?: string;
};

export type EvaluationItemInput = {
  id?: string;
  templateItemId?: string | null;
  itemKey: string;
  itemNo: string;
  label: string;
  answer: EvaluationAnswer;
  condition: string;
  description: string;
  analysis: string;
  sortOrder: number;
};

export type EvaluationSectionInput = {
  id?: string;
  templateSectionId?: string | null;
  sectionKey: string;
  title: string;
  description: string;
  conclusion: string;
  sortOrder: number;
  items: EvaluationItemInput[];
};

export type UpdateEvaluationRequest = {
  reportNumber: string;
  reportDate?: string | null;
  assignmentLetterNumber: string;
  assignmentLetterDate?: string | null;
  monitoringDateRange: string;
  unitCode: string;
  unitLocation: string;
  unitAddress: string;
  unitEselonI: string;
  unitLeaderName: string;
  teamCoordinator: string;
  teamLead: string;
  teamMembers: string;
  problems: string;
  recommendations: string;
  sections: EvaluationSectionInput[];
};

