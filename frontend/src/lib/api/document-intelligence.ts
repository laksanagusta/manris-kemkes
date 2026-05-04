import { api } from "@/lib/api";
import type {
  DocumentAnalysisMode,
  DocumentIntelligenceResponse,
} from "@/types/document-intelligence";

export interface AnalyzeDocumentIntelligenceInput {
  file: File;
  mode: DocumentAnalysisMode;
  organizationId?: string;
  period?: string;
}

export async function analyzeDocumentIntelligence(
  token: string,
  input: AnalyzeDocumentIntelligenceInput,
): Promise<DocumentIntelligenceResponse> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("mode", input.mode);
  if (input.organizationId) {
    form.append("organizationId", input.organizationId);
  }
  if (input.period) {
    form.append("period", input.period);
  }

  return api.postForm<DocumentIntelligenceResponse>(
    "/ai/document-intelligence/analyze",
    form,
    token,
  );
}
