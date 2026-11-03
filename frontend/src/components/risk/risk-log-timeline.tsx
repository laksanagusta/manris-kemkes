"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Loader2 } from "@/components/shared/icons";
import { CommentComposer } from "@/components/shared/design-system/domain/comment-composer";
import { CommentThreadItem } from "@/components/shared/design-system/domain/comment-thread-item";

import type { CommunicationLog } from "@/types/communication-log";
import type { MeetingMinutesRisk } from "@/types/meeting-minute";
import { createCommunicationLog, getCommunicationLogs } from "@/lib/communication-logs";
import { getMeetingMinutesByRisk } from "@/lib/meeting-minutes";
import {
  mergeApprovalHistories,
  normalizeApprovalHistoryItems,
} from "@/lib/risk-activity-history";
import type {
  ApprovalHistory,
  RawApprovalHistory,
} from "@/lib/risk-activity-history";

interface RiskLogTimelineProps {
  riskId: string;
  token: string;
  canAdd?: boolean;
}

interface RawCommunicationLog {
  id?: string;
  riskId?: string;
  stakeholder?: string;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  ID?: string;
  RiskID?: string;
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
}: {
  item: TimelineItem;
}) {
  const actorName = getActorName(item);
  return (
    <CommentThreadItem
      author={actorName}
      timestamp={formatRelativeTime(item.date)}
      dateTime={Number.isFinite(new Date(item.date).getTime()) ? new Date(item.date).toISOString() : undefined}
    >
      {item.type === "communication" ? (item.description || getActivityText(item)) : (
        <><span className="text-muted-foreground">{getActivityText(item)}</span>{item.description ? `\n${item.description}` : ""}</>
      )}
    </CommentThreadItem>
  );
}

export function RiskLogTimeline({
  riskId,
  token,
  canAdd = true,
}: RiskLogTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutesRisk[]>(
    [],
  );
  const [showAll, setShowAll] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState("");
  const [stakeholder, setStakeholder] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string>();
  const sendingRef = useRef(false);

  const sendComment = async () => {
    if (!canAdd || sendingRef.current || !message.trim() || !stakeholder.trim()) return;
    sendingRef.current = true;
    setSending(true);
    setSendError(undefined);
    try {
      await createCommunicationLog(riskId, { stakeholder: stakeholder.trim(), notes: message.trim() }, token);
      setMessage("");
      setStakeholder("");
      setRefreshKey(value => value + 1);
      toast.success("Catatan berhasil dikirim");
    } catch {
      setSendError("Catatan belum terkirim. Coba kirim kembali.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };


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
      toast.error("Gagal memuat catatan komunikasi");
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
      title: `Catatan untuk ${log.stakeholder}`,
      description: log.notes,
      metadata: {
        oleh: log.createdByName,
        stakeholder: log.stakeholder,

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
  const visibleTimelineItems = showAll ? timelineItems : timelineItems.slice(0, LOG_PREVIEW_LIMIT);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 id="risk-side-log" className="text-sm font-semibold capitalize text-primary">Catatan</h2>
      </div>
      <div className="mt-3 space-y-3">
        {loading ? <div role="status" className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Memuat catatan...</div>
          : timelineItems.length === 0 ? <p className="py-2 text-xs text-muted-foreground">Belum ada catatan.</p>
          : visibleTimelineItems.map(item => <ActivityFeedRow key={item.id} item={item} />)}
      </div>
      {timelineItems.length > LOG_PREVIEW_LIMIT ? <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll(value => !value)} aria-expanded={showAll}>{showAll ? "Tampilkan lebih sedikit" : `Lihat semua catatan (${timelineItems.length})`}</Button> : null}
      {canAdd ? <CommentComposer message={message} stakeholder={stakeholder} busy={sending} error={sendError} onMessageChange={setMessage} onStakeholderChange={setStakeholder} onSubmit={sendComment} /> : null}
    </>
  );
}
