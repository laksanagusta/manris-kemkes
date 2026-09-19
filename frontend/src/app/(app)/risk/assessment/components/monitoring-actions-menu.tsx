"use client";

import { useCallback, useState } from "react";

import {
  ActionButton,
  Badge,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/shared/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileSearch, MoreHorizontal, Trash2 } from "@/components/ui/icons";
import {
  formatRiskScore,
  riskCategoryLabels,
  roundRiskScore,
} from "@/lib/risk";
import type { Risk } from "@/types/risk";

interface MonitoringActionsMenuProps {
  risk: Risk;
  canDeleteDraft: boolean;
  deleteDisabled?: boolean;
  onDeleteDraft: () => void;
}

export function MonitoringActionsMenu({
  risk,
  canDeleteDraft,
  deleteDisabled = false,
  onDeleteDraft,
}: MonitoringActionsMenuProps) {
  const [isRiskDrawerOpen, setIsRiskDrawerOpen] = useState(false);
  const code = risk.riskCode || risk.code || "-";
  const categoryLabel =
    riskCategoryLabels[risk.category] || "Belum dikategorikan";
  const statusLabel = risk.status === "final" ? "Final" : "Draft";
  const statusTone = risk.status === "final" ? "success" : "neutral";
  const inherentScore = roundRiskScore(risk.inherentScore ?? risk.nilai);

  const handleOpenRiskDrawer = useCallback(() => {
    setIsRiskDrawerOpen(true);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionButton
            variant="outline"
            size="icon-xs"
            aria-label="Tindakan pemantauan"
            title="Tindakan"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </ActionButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem className="gap-2" onSelect={handleOpenRiskDrawer}>
            <FileSearch className="size-3.5" aria-hidden="true" />
            Detail Risiko
          </DropdownMenuItem>
          {canDeleteDraft ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="gap-2"
                disabled={deleteDisabled}
                onSelect={onDeleteDraft}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Hapus draf
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Drawer open={isRiskDrawerOpen} onOpenChange={setIsRiskDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Detail Risiko</DrawerTitle>
            <DrawerDescription>
              Properti risiko sumber {code} yang menjadi acuan pemantauan ini.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerBody>
            <section aria-labelledby="source-risk-properties">
              <h2
                id="source-risk-properties"
                className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground"
              >
                Properti Sumber
              </h2>
              <dl className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-[13px] text-muted-foreground">Kode</dt>
                  <dd className="font-mono text-sm font-medium text-foreground">
                    {code}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-[13px] text-muted-foreground">Kategori</dt>
                  <dd className="min-w-0 truncate text-right text-sm text-foreground">
                    {categoryLabel}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-[13px] text-muted-foreground">Versi</dt>
                  <dd className="font-mono text-sm text-foreground">
                    v{risk.versionNumber ?? "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-[13px] text-muted-foreground">
                    Probabilitas
                  </dt>
                  <dd className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {risk.probability ?? "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-[13px] text-muted-foreground">Dampak</dt>
                  <dd className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {risk.impact ?? "-"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-[13px] text-muted-foreground">Skor</dt>
                  <dd className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {formatRiskScore(inherentScore, "-")}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-[13px] text-muted-foreground">Status</dt>
                  <dd>
                    <Badge tone={statusTone} size="compact">
                      {statusLabel}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </section>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
