"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { listMonitoringTasks } from "@/lib/api/mitigation-tasks";
import type { MitigationTask } from "@/types/risk";

interface MitigationStatusTableProps {
  monitoringId: string;
}

export function MitigationStatusTable({ monitoringId }: MitigationStatusTableProps) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!token || !monitoringId) return;
    setLoading(true);
    try {
      const data = await listMonitoringTasks(token, monitoringId);
      setTasks(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, monitoringId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/80 shadow-sm px-4 py-3">
        <p className="text-sm text-muted-foreground">Memuat laporan mitigasi...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progressPct = Math.round((doneCount / tasks.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Laporan Pelaksanaan Mitigasi
          </p>
          <p className="text-xs text-muted-foreground">
            Status pelaporan mitigasi pada periode ini.
          </p>
        </div>
        <Badge variant={doneCount === tasks.length ? "default" : "outline"}>
          {doneCount}/{tasks.length} dilaporkan
        </Badge>
      </div>
      <Progress value={progressPct} className="h-1.5" />
      <div className="rounded-xl border border-border/50 bg-card/80 shadow-sm">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="[&_tr]:border-b [&_tr]:border-border/50">
              <TableRow className="border-border/50 transition-colors hover:bg-transparent">
                <TableHead className="whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Rencana Mitigasi
                </TableHead>
                <TableHead className="w-56 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  PIC
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task, index) => (
                <TableRow
                  key={task.id}
                  className="border-border/30 transition-colors hover:bg-muted/30"
                >
                  <TableCell className="max-w-[360px] px-2.5 py-2.5 text-sm font-medium">
                    {task.mitigationAction || "-"}
                  </TableCell>
                  <TableCell className="px-2.5 py-2.5 text-sm text-muted-foreground">
                    {task.mitigationOwner || "-"}
                  </TableCell>
                  <TableCell className="px-2.5 py-2.5 text-sm">
                    {task.status === "done" ? (
                      <Badge variant="default" className="text-[11px]">
                        Selesai
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px]">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
