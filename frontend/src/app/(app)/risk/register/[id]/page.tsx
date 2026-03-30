"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RiskDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/risk/register/new?id=${id}`);
    }
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat detail risiko...</p>
      </div>
    </div>
  );
}
