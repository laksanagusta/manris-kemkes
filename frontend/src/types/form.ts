// ── Core Enums ────────────────────────────────────────────────────────────────

export type FormFieldType = "text" | "textarea" | "radio" | "checkbox" | "dropdown";

export type FormStatus = "draft" | "published" | "closed";

export type TargetAudience = "all" | "specific";

// ── Value Objects ─────────────────────────────────────────────────────────────

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface ConditionalLogic {
  sourceFieldId: string;
  value: string; // equals operator only
}

// ── Domain Entities ────────────────────────────────────────────────────────────

export interface FormField {
  id: string;
  sectionId: string;
  formId: string;
  fieldType: FormFieldType;
  fieldKey: string;
  label: string;
  placeholder?: string | null;
  isRequired: boolean;
  options: FormFieldOption[]; // JSONB on DB
  position: number;
  conditionalLogic?: ConditionalLogic | null;
  createdAt: string;
}

export interface FormSection {
  id: string;
  formId: string;
  title: string;
  description?: string | null;
  position: number;
  fields: FormField[];
  createdAt: string;
}

export interface Form {
  id: string;
  title: string;
  description?: string | null;
  status: FormStatus;
  targetAudience: TargetAudience;
  sections: FormSection[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface FormResponse {
  id: string;
  formId: string;
  respondentId: string;
  answers: Record<string, unknown>; // JSONB on DB
  submittedAt: string;
}

// ── Assignments ───────────────────────────────────────────────────────────────

export interface FormAssignment {
  id: string;
  formId: string;
  organizationId: string;
  createdAt: string;
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export interface TrendPoint {
  period: string;
  values: Record<string, number>;
}

export interface FormFieldAnalytics {
  fieldId: string;
  fieldKey: string;
  label: string;
  fieldType: FormFieldType;
  summary: Record<string, number>; // e.g., { "red": 2, "blue": 3 } or { "filled": 10, "empty": 2 }
  trend: TrendPoint[];
}

export interface FormAnalyticsSummary {
  totalResponses: number;
  fields: FormFieldAnalytics[];
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface CreateFormDTO {
  title: string;
  description?: string | null;
  targetAudience: TargetAudience;
  sections: CreateSectionDTO[];
}

export interface UpdateFormDTO {
  title?: string;
  description?: string | null;
  targetAudience?: TargetAudience;
  sections?: CreateSectionDTO[];
}

export interface CreateSectionDTO {
  title: string;
  description?: string | null;
  position: number;
  fields: CreateFieldDTO[];
}

export interface CreateFieldDTO {
  fieldType: FormFieldType;
  fieldKey: string;
  label: string;
  placeholder?: string | null;
  isRequired: boolean;
  options: FormFieldOption[];
  position: number;
  conditionalLogic?: ConditionalLogic | null;
}

export interface SubmitResponseDTO {
  answers: Record<string, unknown>;
}

export interface PublishFormDTO {
  organizationIds?: string[]; // required when targetAudience is "specific"
}

export interface CloseFormDTO {
  // no fields — close is a status change with no payload
}
