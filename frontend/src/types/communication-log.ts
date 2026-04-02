export type CommunicationMethod = "Meeting" | "Email" | "Phone" | "Chat";

export interface CommunicationLog {
  id: string;
  riskId: string;
  date: string;
  method: CommunicationMethod;
  stakeholder: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface CreateCommunicationLogInput {
  date: string;
  method: CommunicationMethod;
  stakeholder: string;
  notes: string;
}

export const COMMUNICATION_METHODS: CommunicationMethod[] = ["Meeting", "Email", "Phone", "Chat"];

export const COMMUNICATION_METHOD_LABELS: Record<CommunicationMethod, string> = {
  Meeting: "Meeting",
  Email: "Email",
  Phone: "Telepon",
  Chat: "Chat/Pesan",
};