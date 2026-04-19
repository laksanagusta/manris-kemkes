"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MessageSquare,
  Plus,
  CalendarDays,
} from "lucide-react";

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

const METHOD_ICONS: Record<string, React.ReactNode> = {
  Meeting: <Clock className="size-3" />,
  Email: <MessageSquare className="size-3" />,
  Phone: <MessageSquare className="size-3" />,
  Chat: <MessageSquare className="size-3" />,
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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RiskLogTimeline({ riskId, token }: RiskLogTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutesRisk[]>(
    [],
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
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

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Memuat log...
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="size-4" /> Log & Komunikasi
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs h-8"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="size-3.5" /> Tambah Log
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {timelineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/60 rounded-lg bg-muted/10">
              <MessageSquare className="size-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Belum Ada Log Komunikasi</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Tambahkan log komunikasi untuk mencatat interaksi dengan
                stakeholder terkait risiko ini.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2 text-xs"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="size-3.5" /> Tambah Log Pertama
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border/50" />

              {/* Timeline items */}
              <div className="space-y-4">
                {timelineItems.map((item) => (
                  <div key={item.id} className="flex gap-3 relative">
                    {/* Icon */}
                    <div className="shrink-0 w-6 h-6 rounded-full bg-background border border-border/50 flex items-center justify-center z-10">
                      {item.type === "approval" ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      ) : item.type === "meeting_minute" ? (
                        <CalendarDays className="size-3.5 text-primary" />
                      ) : (
                        <MessageSquare className="size-3.5 text-blue-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-semibold">
                          {item.title}
                        </span>
                        {item.type === "approval" && (
                          <Badge variant="outline" className="text-[10px]">
                            Approval
                          </Badge>
                        )}
                        {item.type === "communication" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1"
                          >
                            {METHOD_ICONS[item.metadata?.method || "Meeting"]}
                            {item.metadata?.method || "Komunikasi"}
                          </Badge>
                        )}
                        {item.type === "meeting_minute" && (
                          <Badge variant="outline" className="text-[10px]">
                            Notulen
                          </Badge>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{formatDateTime(item.date)}</span>
                        {item.metadata?.oleh && (
                          <span>Oleh: {item.metadata.oleh}</span>
                        )}
                        {item.metadata?.role && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1.5"
                          >
                            {item.metadata.role}
                          </Badge>
                        )}
                      </div>

                      {item.link && (
                        <Link
                          href={item.link}
                          className="text-xs text-primary hover:underline mt-1"
                        >
                          Lihat detail notulen →
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CommunicationLogDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        riskId={riskId}
        token={token}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}
