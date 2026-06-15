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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Memuat laporan mitigasi...
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progressPct = Math.round((doneCount / tasks.length) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Laporan Pelaksanaan Mitigasi
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Status pelaporan mitigasi pada periode ini.
            </p>
          </div>
          <Badge variant={doneCount === tasks.length ? "default" : "outline"}>
            {doneCount}/{tasks.length} dilaporkan
          </Badge>
        </div>
        <Progress value={progressPct} className="mt-4 h-2" />
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="h-11">
                <TableHead className="h-11 whitespace-nowrap py-3 align-middle">
                  Mitigasi
                </TableHead>
                <TableHead className="h-11 w-36 whitespace-nowrap py-3 align-middle">
                  PIC
                </TableHead>
                <TableHead className="h-11 w-28 whitespace-nowrap py-3 align-middle">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="text-sm font-medium">
                    {task.mitigationAction || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {task.mitigationOwner || "-"}
                  </TableCell>
                  <TableCell>
                    {task.status === "done" ? (
                      <Badge variant="default" className="text-xs">
                        Selesai
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
