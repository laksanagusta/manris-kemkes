"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
  GitBranch,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import {
  deleteRiskCascade,
  listRiskCascades,
  type ListRiskCascadesParams,
} from "@/lib/api/risk-cascades";
import type { RiskCascadeRecord, RiskCascadeType } from "@/types/risk-cascade";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { RiskCascadeActionDialog } from "@/components/risk/risk-cascade-action-dialog";

const cascadeTypeLabels: Record<RiskCascadeType, string> = {
  mandatory_top_down: "Mandat Top Down",
  recommended_top_down: "Rekomendasi Top Down",
  bottom_up_escalation: "Usulan Naik",
};

const statusLabels: Record<string, string> = {
  proposed: "Menunggu Tinjauan",
  analyzed: "Sedang Ditinjau",
  accepted: "Disetujui",
  rejected: "Ditolak",
  implemented: "Selesai",
};

const statusTone: Record<string, string> = {
  proposed: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  analyzed: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  accepted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  implemented: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

function formatCascadeTitle(item: RiskCascadeRecord) {
  const code = item.sourceRiskCode || "Risk";
  const title = item.sourceRiskTitle || "-";
  return `${code} · ${title}`;
}

function RiskCascadeRowActions({
  item,
  onReview,
  onDelete,
}: {
  item: RiskCascadeRecord;
  onReview?: () => void;
  onDelete?: () => void;
}) {
  const hasActions = Boolean(onReview || onDelete);
  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          aria-label={`Aksi eskalasi ${item.sourceRiskCode || item.sourceRiskTitle || item.id}`}
        >
          <GitBranch className="size-3.5" />
          Aksi
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {onReview && (
          <DropdownMenuItem onClick={onReview}>
            <ShieldAlert className="size-3.5" />
            Tinjau eskalasi
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Hapus draft
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function RiskCascadingPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RiskCascadeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createCascadeType, setCreateCascadeType] =
    useState<RiskCascadeType>("mandatory_top_down");
  const [decisionItem, setDecisionItem] = useState<RiskCascadeRecord | null>(
    null,
  );

  const deferredSearch = useDeferredValue(search);
  const initialSourceRiskId = searchParams.get("sourceRiskId") || "";
  const initialMode = searchParams.get("mode");

  useEffect(() => {
    if (searchParams.get("sourceRiskId") || initialMode === "bottom-up") {
      setCreateOpen(true);
    }
    if (initialMode === "bottom-up") {
      setCreateCascadeType("bottom_up_escalation");
    }
  }, [initialMode, searchParams]);

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params: ListRiskCascadesParams = {
        page: 1,
        limit: 100,
      };
      const response = await listRiskCascades(token, params);
      setItems(response.data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat eskalasi.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [
        item.sourceRiskCode,
        item.sourceRiskTitle,
        item.sourceOrgName,
        item.targetOrgName,
        item.analysisNote,
        item.decisionNote,
        item.cascadeType,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [deferredSearch, items]);

  const summary = useMemo(() => {
    const total = items.length;
    const pending = items.filter((item) =>
      ["proposed", "analyzed"].includes(item.status),
    ).length;
    const approved = items.filter((item) =>
      ["accepted", "implemented"].includes(item.status),
    ).length;
    const bottomUp = items.filter(
      (item) => item.cascadeType === "bottom_up_escalation",
    ).length;
    return { total, pending, approved, bottomUp };
  }, [items]);

  const handleDelete = async (item: RiskCascadeRecord) => {
    if (!token) return;
    if (
      !window.confirm(
        "Hapus draft eskalasi ini? Aksi ini tidak bisa dibatalkan.",
      )
    ) {
      return;
    }
    try {
      await deleteRiskCascade(token, item.id);
      toast.success("Draft eskalasi dihapus.");
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menghapus eskalasi.";
      toast.error(message);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Memuat eskalasi risiko...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Risk Governance
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Eskalasi Risiko
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Pantau semua eskalasi dalam satu daftar. Alur dan bahasanya dibuat
              lebih sederhana supaya mudah dibaca, mudah diputuskan, dan tetap
              rapi untuk audit.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setCreateCascadeType("mandatory_top_down");
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            Eskalasi
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Total Eskalasi", value: summary.total },
          { label: "Menunggu Tinjauan", value: summary.pending },
          { label: "Sudah Disetujui", value: summary.approved },
          { label: "Usulan Naik", value: summary.bottomUp },
        ].map((card, index) => (
          <Card
            key={card.label}
            className={cn(
              "overflow-hidden backdrop-blur-sm border-border/50 bg-card/80",
              index === 3 && "border-emerald-500/20 bg-emerald-500/5",
            )}
          >
            <CardContent className="flex items-end justify-between gap-3 p-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
                  {card.label}
                </p>
                <p className="text-2xl font-semibold">{card.value}</p>
              </div>
              <GitBranch className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-[15px] font-semibold">
            Daftar Eskalasi
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Semua mandat top-down dan usulan naik tampil dalam satu tabel.
            Eskalasi yang masih draft bisa dihapus.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-2">
              <Label htmlFor="cascade-search">Cari eskalasi</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="cascade-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari kode risiko, organisasi, status, atau catatan..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan tampilan</Label>
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <Clock3 className="size-4" />
                Status dan aksi dibuat lebih ringkas agar cepat dipindai.
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Risiko</TableHead>
                  <TableHead>Organisasi</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Adopsi</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Belum ada eskalasi yang cocok.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const canReview =
                      item.status === "proposed" || item.status === "analyzed";
                    const canDelete = item.status === "proposed";
                    const statusLabel =
                      statusLabels[item.status] || item.status;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {formatCascadeTitle(item)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.targetRiskCode
                                ? `Target: ${item.targetRiskCode}`
                                : "Belum ada risiko target"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p>{item.sourceOrgName || "-"}</p>
                            <p className="text-xs text-muted-foreground">
                              → {item.targetOrgName || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {cascadeTypeLabels[item.cascadeType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize",
                              statusTone[item.status],
                            )}
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">
                          {item.adoptionType || "-"}
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {item.decisionNote || item.analysisNote || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <RiskCascadeRowActions
                              item={item}
                              onReview={
                                canReview
                                  ? () => setDecisionItem(item)
                                  : undefined
                              }
                              onDelete={
                                canDelete ? () => handleDelete(item) : undefined
                              }
                            />
                            {!canReview && !canDelete && (
                              <span className="text-xs text-muted-foreground">
                                Tidak ada aksi
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RiskCascadeActionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        initialSourceRiskId={initialSourceRiskId}
        initialCascadeType={createCascadeType}
        onSaved={loadData}
      />
      <RiskCascadeActionDialog
        open={Boolean(decisionItem)}
        onOpenChange={(open) => {
          if (!open) setDecisionItem(null);
        }}
        mode="decision"
        cascade={decisionItem}
        onSaved={loadData}
      />
    </div>
  );
}
