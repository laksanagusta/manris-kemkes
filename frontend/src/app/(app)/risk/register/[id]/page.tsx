"use client";

import { FormLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function RiskDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const monitoringTab = useSearchParams().get("tab") === "monitoring";

  useEffect(() => {
    if (id) {
      const query = new URLSearchParams({ id });
      if (monitoringTab) query.set("tab", "monitoring");
      router.replace(`/risk/register/new?${query}`);
    }
  }, [id, monitoringTab, router]);

  return <PageLoadingSkeleton><FormLoadingSkeleton message="Memuat detail risiko…" /></PageLoadingSkeleton>;
}
