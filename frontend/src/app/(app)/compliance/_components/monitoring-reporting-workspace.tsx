"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MitigationMonitoringPanel } from "./mitigation-monitoring-panel";
import { KRIMonitorPanel } from "./kri-monitor-panel";
import { RiskReviewPanel } from "./risk-review-panel";

type MonitoringTab = "reviews" | "mitigations" | "kri";

const tabMeta: Record<MonitoringTab, { label: string; description: string }> = {
  reviews: {
    label: "Risk Review",
    description:
      "Pantau queue reassessment semester global, lihat risiko yang due, draft berjalan, hingga yang sudah approved.",
  },
  mitigations: {
    label: "Mitigasi",
    description:
      "Lacak rencana yang mendekati tenggat dan laporkan progres pelaksanaannya.",
  },
  kri: {
    label: "KRI",
    description:
      "Pantau indikator risiko dan masuk ke detail untuk pelaporan nilai berkala.",
  },
};

function getActiveTab(tabValue: string | null): MonitoringTab {
  if (tabValue === "kri") return "kri";
  if (tabValue === "mitigations") return "mitigations";
  return "reviews";
}

export function MonitoringReportingWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeTab = getActiveTab(searchParams.get("tab"));
  const activeMeta = tabMeta[activeTab];

  const handleTabChange = (value: string) => {
    const nextTab = getActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());

    if (nextTab === "reviews") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }

    const nextUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/80">
          Compliance workspace
        </p>
        <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.03em] text-foreground">
          Monitoring & Reporting
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Satu ruang kerja untuk memantau eksekusi mitigasi dan melaporkan
          pembaruan KRI tanpa memecah alur kerja ke menu yang berbeda.
        </p>
      </section>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
          <TabsList className="h-10 w-full border border-border/50 bg-muted/40 md:min-w-[520px] md:w-auto">
            <TabsTrigger
              value="reviews"
              className="h-full min-w-0 basis-0 gap-2 px-5 text-sm"
            >
              <ShieldAlert className="size-4" />
              Risk Review
            </TabsTrigger>
            <TabsTrigger
              value="mitigations"
              className="h-full min-w-0 basis-0 gap-2 px-5 text-sm"
            >
              <ClipboardCheck className="size-4" />
              Mitigasi
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="reviews" className="mt-0">
          <RiskReviewPanel />
        </TabsContent>
        <TabsContent value="mitigations" className="mt-0">
          <MitigationMonitoringPanel />
        </TabsContent>
        <TabsContent value="kri" className="mt-0">
          <KRIMonitorPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
