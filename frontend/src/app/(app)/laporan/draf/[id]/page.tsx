"use client";

import { useParams } from "next/navigation";
import { ReportDraftEditor } from "@/components/upr/report-draft-editor";

export default function EditReportDraftPage() {
  const { id } = useParams<{ id: string }>();
  return <ReportDraftEditor key={id} draftId={id} />;
}
