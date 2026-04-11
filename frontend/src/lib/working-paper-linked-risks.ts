import type { WorkingPaper, WorkingPaperRiskData } from "@/types/working-paper";

export function getWorkingPaperRiskRows(workingPaper: WorkingPaper): WorkingPaperRiskData[] {
  return [...(workingPaper.risks || [])]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((link) => link.risk);
}
