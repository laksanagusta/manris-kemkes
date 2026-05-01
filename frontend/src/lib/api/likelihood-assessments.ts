import { api } from "@/lib/api";
import type {
  LikelihoodAssessment,
  LikelihoodAssessmentInput,
  UpsertLikelihoodAssessmentResponse,
} from "@/types/likelihood-assessment";

export async function upsertLikelihoodAssessment(
  token: string,
  data: LikelihoodAssessmentInput & { riskId: string }
): Promise<UpsertLikelihoodAssessmentResponse> {
  return api.post<UpsertLikelihoodAssessmentResponse>(
    "/likelihood-assessments",
    data,
    token
  );
}

export async function getLikelihoodAssessmentByRiskId(
  token: string,
  riskId: string
): Promise<LikelihoodAssessment> {
  return api.get<LikelihoodAssessment>(
    `/likelihood-assessments/${riskId}`,
    token
  );
}
