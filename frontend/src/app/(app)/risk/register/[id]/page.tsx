"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PageStack } from "@/components/shared/design-system";

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

  return (
    <PageStack className="flex min-h-[400px] items-center justify-center rounded-lg bg-state-surface text-state-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-state-foreground">Memuat detail risiko...</p>
      </div>
    </PageStack>
  );
}
