"use client";

import type { ReactNode } from "react";
import type { ReportDetail, ReportDocumentOption, SemesterSnapshot, WorkingPaperSnapshot, EvaluationSnapshot } from "@/lib/api/upr-workflow";
import { ReportFields } from "./report-fields";
import { SemesterContent } from "./semester-content";
import { EvaluationContent, WorkingPaperContent } from "./supporting-document-content";

export function FinalReportFields({ report }: { report: ReportDetail }) {
  const snapshot = report.snapshot as SemesterSnapshot;
  const [year, half] = report.period.split("-");
  const papers = snapshot.supporting.filter((item) => item.kind === "working_paper" && item.sourceId);
  const evaluation = snapshot.supporting.find((item) => item.kind === "evaluation" && item.sourceId);
  const documents: ReportDocumentOption[] = [];
  const frozenContents: Record<string, ReactNode> = {};

  if (snapshot.profile) {
    documents.push({
      id: snapshot.profile.id,
      kind: "profile",
      title: `Profil ${year} v${snapshot.profile.version}`,
      code: `Versi ${snapshot.profile.version}`,
      documentDate: snapshot.profile.finalizedAt,
      finalizedAt: snapshot.profile.finalizedAt,
    });
    frozenContents[snapshot.profile.id] = <SemesterContent snapshot={{ ...snapshot, supporting: [] }} />;
  }

  for (const section of snapshot.supporting) {
    if (!section.sourceId || section.kind === "semester") continue;
    const paper = section.kind === "working_paper" ? section.contents as WorkingPaperSnapshot | undefined : undefined;
    const evaluationContents = section.kind === "evaluation" ? section.contents as EvaluationSnapshot | undefined : undefined;
    documents.push({
      id: section.sourceId,
      kind: section.kind,
      title: paper?.title || (section.kind === "evaluation" ? "Evaluasi" : "KK Pemantauan dan Reviu"),
      code: section.code || "",
      documentDate: paper?.observation_cutoff || evaluationContents?.reportDate || section.finalizedAt,
      finalizedAt: section.finalizedAt,
    });
    if (section.contents) {
      frozenContents[section.sourceId] = section.kind === "working_paper"
        ? <WorkingPaperContent paper={section.contents as WorkingPaperSnapshot} />
        : <EvaluationContent evaluation={section.contents as EvaluationSnapshot} />;
    }
  }

  return (
    <div className="grid min-w-0 gap-6">
      <ReportFields
        readOnly
        input={{
          title: snapshot.title || report.title || "Laporan Penerapan Manajemen Risiko",
          year: Number(year),
          semester: half === "H2" ? 2 : 1,
          profileId: snapshot.profile?.id ?? null,
          workingPaperIds: papers.map((item) => item.sourceId!),
          evaluationId: evaluation?.sourceId ?? null,
          reason: snapshot.reason,
        }}
        documents={documents}
        frozenContents={frozenContents}
      />
    </div>
  );
}
