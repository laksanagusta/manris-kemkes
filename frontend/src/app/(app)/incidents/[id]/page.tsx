"use client";

import { useParams } from "next/navigation";
import { IncidentFormPage } from "../new/page";

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();

  return <IncidentFormPage incidentId={params.id} />;
}
