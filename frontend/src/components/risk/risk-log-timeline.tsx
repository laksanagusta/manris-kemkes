"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus } from "@/components/ui/icons";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CollectionDialogCancel } from "@/components/shared/design-system";

import type { CommunicationLog } from "@/types/communication-log";
import type { MeetingMinutesRisk } from "@/types/meeting-minute";
import { getCommunicationLogs } from "@/lib/communication-logs";
import { getMeetingMinutesByRisk } from "@/lib/meeting-minutes";
import {
  mergeApprovalHistories,
  normalizeApprovalHistoryItems,
} from "@/lib/risk-activity-history";
import type {
  ApprovalHistory,
  RawApprovalHistory,
} from "@/lib/risk-activity-history";
import { CommunicationLogDialog } from "./communication-log-dialog";

interface RiskLogTimelineProps {
  riskId: string;
  token: string;
}

interface RawCommunicationLog {
  id?: string;
  riskId?: string;
  date?: string;
  method?: string;
  stakeholder?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  ID?: string;
  RiskID?: string;
  Date?: string;
  Method?: string;
  Stakeholder?: string;
  Notes?: string;
  CreatedBy?: string;
  CreatedByName?: string;
  CreatedAt?: string;
}

interface TimelineItem {
  id: string;
  type: "approval" | "communication" | "version" | "meeting_minute";
  date: string;
  title: string;
  description: string;
  metadata?: Record<string, string>;
  link?: string;
}

const LOG_PREVIEW_LIMIT = 5;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  submitted: {
    label: "Diajukan",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  approved: {
    label: "Disetujui",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  rejected: {
    label: "Ditolak",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
  returned: {
    label: "Dikembalikan",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
};

async function getApprovalHistory(
  entityType: string,
  entityId: string,
  token: string,
): Promise<ApprovalHistory[]> {
  try {
    const result = await api.get<{
      history?: RawApprovalHistory[];
      History?: RawApprovalHistory[];
    } | null>(
      `/approvals/by-entity?request_type=${entityType}&entity_id=${entityId}`,
      token,
    );
    console.log(`[approval-history] type=${entityType} entity=${entityId}`, result);
    if (!result) return [];
    return normalizeApprovalHistoryItems(result.history || result.History || []);
  } catch (err) {
    console.warn(`[approval-history] type=${entityType} entity=${entityId} error:`, err);
    return [];
  }
}

function normalizeCommunicationLogs(
  logs: RawCommunicationLog[],
): CommunicationLog[] {
  return logs.map((item, index) => ({
    id: item.id || item.ID || `comm-${index}`,
    riskId: item.riskId || item.RiskID || "",
    date: item.date || item.Date || new Date(0).toISOString(),
    method: (item.method ||
      item.Method ||
      "Meeting") as CommunicationLog["method"],
    stakeholder: item.stakeholder || item.Stakeholder || "-",
    notes: item.notes || item.Notes || "",
    createdBy: item.createdBy || item.CreatedBy || "",
    createdByName: item.createdByName || item.CreatedByName || "-",
    createdAt: item.createdAt || item.CreatedAt || new Date(0).toISOString(),
  }));
}

async function getRiskVersions(
  riskId: string,
  token: string,
): Promise<Array<{ id: string; createdAt?: string }> | null> {
  try {
    return await api.get<Array<{ id: string; createdAt?: string }>>(
      `/risks/${riskId}/versions`,
      token,
    );
  } catch {
    return null;
  }
}

function getRelatedRiskIds(
  currentRiskId: string,
  versions: Array<{ id: string; createdAt?: string }> | null,
): string[] {
  const ids = new Set<string>([currentRiskId]);

  for (const version of versions ?? []) {
    if (version.id) {
      ids.add(version.id);
    }
  }

  return [...ids];
}

function formatRelativeTime(dateStr: string): string {
  const timestamp = new Date(dateStr).getTime();
  if (!Number.isFinite(timestamp)) return "baru saja";

  const elapsed = Math.max(0, Date.now() - timestamp);
  if (elapsed < 60_000) return "baru saja";

  const units = [
    { value: 86_400_000, label: "hari" },
    { value: 3_600_000, label: "jam" },
    { value: 60_000, label: "mnt" },
  ];

  const unit = units.find(({ value }) => elapsed >= value) ?? units[2];
  return `${Math.floor(elapsed / unit.value)} ${unit.label} lalu`;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (!Number.isFinite(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "SY";
}

function getActorName(item: TimelineItem): string {
  const actorName = item.metadata?.oleh?.trim();
  return actorName && actorName !== "-" ? actorName : "Sistem";
}

function getActivityText(item: TimelineItem): string {
  if (item.type === "approval") {
    return `mengubah status menjadi ${item.title.toLowerCase()}`;
  }
  if (item.type === "communication") {
    return `mencatat ${item.title}`;
  }
  if (item.type === "meeting_minute") {
    return `menautkan ${item.title}`;
  }
  return item.title;
}

function ActivityFeedRow({
  item,
  onOpen,
}: {
  item: TimelineItem;
  onOpen: () => void;
}) {
  const actorName = getActorName(item);
  const activityText = getActivityText(item);

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg px-1 py-2 text-left transition-colors duration-150 hover:bg-muted/40">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={onOpen}
        aria-label={`Buka detail aktivitas dari ${actorName}`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {getInitials(actorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="whitespace-normal break-words text-sm leading-5 text-foreground">
            <span className="font-medium">{actorName}</span>{" "}
            {activityText}
            <span className="text-muted-foreground/70">
              {" · "}
              {formatRelativeTime(item.date)}
            </span>
          </p>
        </div>
      </button>
    </div>
  );
}

export function RiskLogTimeline({ riskId, token }: RiskLogTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutesRisk[]>(
    [],
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAllLogsDialog, setShowAllLogsDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logs, versions, minutesData] = await Promise.all([
        getCommunicationLogs(riskId, token),
        getRiskVersions(riskId, token),
        getMeetingMinutesByRisk(riskId, token),
      ]);
      const relatedRiskIds = getRelatedRiskIds(riskId, versions);
      const approvalHistories = await Promise.all(
        relatedRiskIds.flatMap((entityId) => [
          getApprovalHistory("risk", entityId, token),
          getApprovalHistory("assessment", entityId, token),
        ]),
      );

      setCommLogs(
        normalizeCommunicationLogs((logs || []) as RawCommunicationLog[]),
      );
      setApprovalHistory(
        mergeApprovalHistories(...approvalHistories),
      );
      setMeetingMinutes(minutesData || []);
    } catch {
      toast.error("Gagal memuat log komunikasi");
    } finally {
      setLoading(false);
    }
  }, [riskId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const timelineItems: TimelineItem[] = [
    ...approvalHistory.map((h) => ({
      id: `approval-${h.id}`,
      type: "approval" as const,
      date: h.createdAt,
      title: ACTION_LABELS[h.action]?.label || h.action,
      description: h.comments || "-",
      metadata: {
        oleh: h.actorName,
        role: h.actorRole,
      },
    })),
    ...commLogs.map((log) => ({
      id: `comm-${log.id}`,
      type: "communication" as const,
      date: log.createdAt,
      title: `${log.method} dengan ${log.stakeholder}`,
      description: log.notes,
      metadata: {
        oleh: log.createdByName,
        method: log.method,
        stakeholder: log.stakeholder,
        tanggal: new Date(log.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      },
    })),
    ...meetingMinutes.map((mm) => ({
      id: `mm-${mm.id}`,
      type: "meeting_minute" as const,
      date: mm.linkedAt,
      title: `Notulen: ${mm.riskTitle || "Rapat"}`,
      description: `Ditautkan oleh ${mm.linkedByName || "User"}`,
      metadata: {
        oleh: mm.linkedByName || "User",
      },
      link: `/minutes/${mm.meetingId}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const visibleTimelineItems = timelineItems.slice(0, LOG_PREVIEW_LIMIT);

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Memuat log...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {timelineItems.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            Belum ada aktivitas log.
          </p>
        ) : (
          visibleTimelineItems.map((item) => (
            <ActivityFeedRow
              key={item.id}
              item={item}
              onOpen={() => setSelectedItem(item)}
            />
          ))
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/50 pt-2">
        {timelineItems.length > LOG_PREVIEW_LIMIT ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setShowAllLogsDialog(true)}
          >
            Lihat semua log ({timelineItems.length})
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="size-3.5" /> Tambah log
        </Button>
      </div>

      <CommunicationLogDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        riskId={riskId}
        token={token}
        onSuccess={handleAddSuccess}
      />

      <Dialog
        open={showAllLogsDialog}
        onOpenChange={setShowAllLogsDialog}
      >
        <DialogContent
          className="max-w-2xl no-scrollbar"
          showCloseButton={false}
        >
          <div className="flex min-h-0 flex-col gap-5">
            <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
              <DialogTitle className="text-base">Semua Log</DialogTitle>
            </DialogHeader>
            <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto pr-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
              <div className="space-y-1">
                {timelineItems.map((item) => (
                  <ActivityFeedRow
                    key={item.id}
                    item={item}
                    onOpen={() => {
                      setShowAllLogsDialog(false);
                      setSelectedItem(item);
                    }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms]">
              <CollectionDialogCancel
                onClick={() => setShowAllLogsDialog(false)}
              >
                Tutup
              </CollectionDialogCancel>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
      >
        <DialogContent
          className="max-w-2xl no-scrollbar"
          showCloseButton={false}
        >
          <div className="flex min-h-0 flex-col gap-5">
            <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
              <DialogTitle className="text-base">
                Detail Aktivitas Log
              </DialogTitle>
            </DialogHeader>

            {selectedItem && (
              <div className="space-y-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="log-detail-date">Tanggal</Label>
                    <Input
                      id="log-detail-date"
                      disabled
                      value={
                        selectedItem.metadata?.tanggal ||
                        formatDateTime(selectedItem.date)
                      }
                      className="text-base sm:text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="log-detail-actor">Oleh</Label>
                    <Input
                      id="log-detail-actor"
                      disabled
                      value={getActorName(selectedItem)}
                      className="text-base sm:text-sm"
                    />
                  </div>

                  {selectedItem.type === "communication" ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="log-detail-method">Metode</Label>
                        <Input
                          id="log-detail-method"
                          disabled
                          value={selectedItem.metadata?.method || "-"}
                          className="text-base sm:text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="log-detail-stakeholder">
                          Stakeholder
                        </Label>
                        <Input
                          id="log-detail-stakeholder"
                          disabled
                          value={selectedItem.metadata?.stakeholder || "-"}
                          className="text-base sm:text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="log-detail-notes">Catatan</Label>
                        <Textarea
                          id="log-detail-notes"
                          disabled
                          value={selectedItem.description || "-"}
                          className="min-h-[100px] resize-none text-base sm:text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="log-detail-type">Jenis aktivitas</Label>
                        <Input
                          id="log-detail-type"
                          disabled
                          value={
                            selectedItem.type === "approval"
                              ? "Approval"
                              : "Notulen rapat"
                          }
                          className="text-base sm:text-sm"
                        />
                      </div>

                      {selectedItem.metadata?.role && (
                        <div className="flex flex-col gap-2">
                          <Label htmlFor="log-detail-role">Peran</Label>
                          <Input
                            id="log-detail-role"
                            disabled
                            value={selectedItem.metadata.role}
                            className="text-base sm:text-sm"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="log-detail-description">Detail</Label>
                        <Textarea
                          id="log-detail-description"
                          disabled
                          value={selectedItem.description || "-"}
                          className="min-h-[100px] resize-none text-base sm:text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>

                {selectedItem.link && (
                  <Link
                    href={selectedItem.link}
                    className="inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    Buka detail notulen →
                  </Link>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms]">
              <CollectionDialogCancel onClick={() => setSelectedItem(null)}>
                Tutup
              </CollectionDialogCancel>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
