export interface CommunicationLog {
  id: string;
  riskId: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface CreateCommunicationLogInput {
  notes: string;
}
