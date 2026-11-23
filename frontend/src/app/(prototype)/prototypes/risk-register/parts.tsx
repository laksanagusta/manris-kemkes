import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { RiskTableScore } from "@/components/shared/design-system/domain/risk-table-score";
import { DetailSidePanel } from "@/components/shared/design-system/layout/detail-side-panel";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import { getRiskLevelFromNilai, getRiskLevelDisplayLabel, levelToFillColor, riskCategoryLabels } from "@/lib/risk";
import { MoreHorizontal } from "@/components/shared/icons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCreated, riskStatuses, type OptionalColumn, type RiskRow } from "./data";

export type StageProps = {
  rows: RiskRow[];
  visible: ReadonlySet<OptionalColumn>;
  onOpen: (row: RiskRow) => void;
};

export const surface = "rounded-(--surface-radius) bg-card shadow-(--surface-shadow-low)";
export const titleButton = "block max-w-full rounded-sm text-left text-sm font-medium hover:text-primary focus-visible:outline-2 focus-visible:outline-ring";

export function RiskStatus({ status }: { status: RiskRow["status"] }) {
  const tone = status === "final" ? "success" : "neutral";
  return <Badge variant={toBadgeVariant(tone)} className={getStatusBadgeClassName(tone)}>{riskStatuses[status]}</Badge>;
}

export function RiskScore({ score, passive = false }: { score: RiskRow["score"]; passive?: boolean }) {
  if (score === null) return <span className="text-sm text-muted-foreground">Belum dinilai</span>;
  const level = getRiskLevelFromNilai(score);
  return passive ? (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium tabular-nums">
      {score}
      <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: levelToFillColor(level) }} />
      <span className="sr-only"> — {getRiskLevelDisplayLabel(level)}</span>
    </span>
  ) : <RiskTableScore score={String(score)} level={level} />;
}

export function RiskRowMenu({ row, onOpen }: { row: RiskRow; onOpen: StageProps["onOpen"] }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" id={`prototype-risk-action-${row.code}`} aria-label={`Aksi ${row.code}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onOpen(row)}>Lihat detail</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RiskDetails({ row }: { row: RiskRow }) {
  return (
    <DetailSidePanel>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <CollectionCode code={row.code} />
        <RiskStatus status={row.status} />
      </div>
      <section className="space-y-2 border-t border-dashed border-border pt-4">
        <h3 className="text-sm font-semibold">Deskripsi risiko</h3>
        <p className="text-sm leading-6 text-secondary-foreground">{row.description}</p>
      </section>
      <dl className="grid gap-3 border-t border-dashed border-border pt-4 text-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3"><dt className="text-muted-foreground">Organisasi</dt><dd>{row.organization}</dd></div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3"><dt className="text-muted-foreground">Kategori</dt><dd>{riskCategoryLabels[row.category]}</dd></div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3"><dt className="text-muted-foreground">Skor</dt><dd><RiskScore score={row.score} /></dd></div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-3"><dt className="text-muted-foreground">Dibuat</dt><dd><time dateTime={row.created}>{formatCreated(row.created)} WIB</time></dd></div>
      </dl>
      <section className="space-y-2 border-t border-dashed border-border pt-4">
        <h3 className="text-sm font-semibold">Rencana penanganan</h3>
        <p className="text-sm leading-6 text-secondary-foreground">{row.mitigation}</p>
      </section>
    </DetailSidePanel>
  );
}
