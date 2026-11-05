import { PropertyList, PropertyLabel } from "@/components/shared/design-system/layout/property-list";
import { Badge } from "@/components/ui/badge";
import { DetailSidePanel } from "../layout/detail-side-panel";

export function DetailSidePanelExample() {
  return (
    <div className="w-full max-w-[380px]">
      <DetailSidePanel>
        <section aria-labelledby="detail-panel-example-properties">
          <h2 id="detail-panel-example-properties" className="text-sm font-semibold capitalize text-primary">Properti</h2>
          <PropertyList compact className="[&_dt]:text-tertiary-foreground">
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Status</PropertyLabel><dd><Badge variant="secondary">Draf</Badge></dd></div>
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Kode risiko</PropertyLabel><dd className="max-w-[60%] break-words text-right font-sans">R-001</dd></div>
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Versi</PropertyLabel><dd className="text-right font-sans">v1</dd></div>
            <div className="flex items-center justify-between gap-4"><PropertyLabel showIcon={false}>Periode</PropertyLabel><dd className="text-right font-sans">2026-Q3</dd></div>
          </PropertyList>
        </section>
        <section className="border-t border-dashed border-border/70 pt-5" aria-labelledby="detail-panel-example-signatures">
          <h2 id="detail-panel-example-signatures" className="text-sm font-semibold capitalize text-primary">Histori tanda tangan</h2>
          <p className="mt-3 py-2 text-sm text-muted-foreground">Data ilustratif. Dokumen menunggu proses tanda tangan.</p>
        </section>
      </DetailSidePanel>
    </div>
  );
}
