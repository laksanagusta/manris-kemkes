import Link from "next/link";
import { PropertyList, PropertyLabel } from "@/components/shared/design-system/layout/property-list";
import { Badge } from "@/components/ui/badge";
import { RiskVersionHistoryList } from "../domain/risk-version-history-list";
import { DetailSidePanel } from "../layout/detail-side-panel";

export function DetailSidePanelExample() {
  return (
    <div className="w-full max-w-[380px]">
      <DetailSidePanel>
        <section aria-labelledby="detail-panel-example-properties">
          <h2 id="detail-panel-example-properties" className="text-sm font-semibold capitalize text-primary">Properti</h2>
          <PropertyList compact className="[&_dt]:text-tertiary-foreground">
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Kode risiko</PropertyLabel><dd className="max-w-[60%] break-words text-right font-sans">R-001</dd></div>
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Versi</PropertyLabel><dd className="text-right font-sans">v1</dd></div>
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Periode profil</PropertyLabel><dd className="text-right font-sans">Triwulan III 2026</dd></div>
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Status</PropertyLabel><dd><Badge variant="secondary">Draf</Badge></dd></div>
          </PropertyList>
        </section>
        <section className="border-t border-dashed border-border/70 pt-5" aria-labelledby="detail-panel-example-events">
          <h2 id="detail-panel-example-events" className="text-sm font-semibold capitalize text-primary">Kejadian</h2>
          <ul className="mt-3 space-y-1"><li>
            <Link href="/risk-events" className="group -mx-2 block rounded-md px-2 py-2 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40">
              <p className="truncate text-sm font-medium leading-5 text-foreground" title="Gangguan layanan pelaporan pada seluruh unit operasional selama pemeliharaan jaringan">Gangguan layanan pelaporan pada seluruh unit operasional selama pemeliharaan jaringan</p>
              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm leading-5 text-muted-foreground">
                <span className="min-w-0 truncate font-mono">KJR-4f9311f1</span><Badge variant="destructive">Tinggi</Badge>
                <time dateTime="2026-11-08" className="ml-auto shrink-0">08 Nov 2026</time>
              </div>
            </Link>
          </li></ul>
        </section>
        <section className="border-t border-dashed border-border/70 pt-5" aria-labelledby="detail-panel-example-versions">
          <h2 id="detail-panel-example-versions" className="text-sm font-semibold capitalize text-primary">Riwayat versi</h2>
          <div className="mt-4">
            <RiskVersionHistoryList versions={[
              { id: "contoh-versi-2", versionNumber: 2, title: "Pembaruan rencana penanganan", createdAt: "2026-11-08T04:35:00Z", assessmentCycle: "2026-H2", isCurrent: true },
              { id: "contoh-versi-1", versionNumber: 1, title: "Identifikasi risiko awal", createdAt: "2026-11-07T09:03:00Z", assessmentCycle: "2026-H2", isCurrent: false },
            ]} onVersionSelect={(_, event) => event.preventDefault()} />
          </div>
        </section>
        <section className="border-t border-dashed border-border/70 pt-5" aria-labelledby="detail-panel-example-signatures">
          <h2 id="detail-panel-example-signatures" className="text-sm font-semibold capitalize text-primary">Histori tanda tangan</h2>
        </section>
      </DetailSidePanel>
    </div>
  );
}
