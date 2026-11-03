export interface CommunicationLog {
  id: string;
  riskId: string;
  stakeholder: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface CreateCommunicationLogInput {
  stakeholder: string;
  notes: string;
}
