"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  listMonitoringTasks,
  updateTaskReport,
  validateMonitoringFinalize,
} from "@/lib/api/mitigation-tasks";
import type { MitigationTask, MonitoringValidationResult } from "@/types/risk";

interface MitigationReportTableProps {
  monitoringId: string;
  onValidationChange?: (validation: MonitoringValidationResult) => void;
}

export function MitigationReportTable({
  monitoringId,
  onValidationChange,
}: MitigationReportTableProps) {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MitigationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [validation, setValidation] = useState<MonitoringValidationResult | null>(null);

  const loadData = useCallback(async () => {
    if (!token || !monitoringId) return;
    setLoading(true);
    try {
      const data = await listMonitoringTasks(token, monitoringId);
      setTasks(data);
      const v = await validateMonitoringFinalize(token, monitoringId);
      setValidation(v);
      onValidationChange?.(v);
    } catch {
      toast.error("Gagal memuat data laporan mitigasi");
    } finally {
      setLoading(false);
    }
  }, [token, monitoringId, onValidationChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateTask = async (
    taskId: string,
    field: string,
    value: string | number,
  ) => {
    if (!token) return;
    try {
      await updateTaskReport(token, taskId, { [field]: value });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
      );
      const v = await validateMonitoringFinalize(token, monitoringId);
      setValidation(v);
      onValidationChange?.(v);
    } catch {
      toast.error("Gagal memperbarui laporan");
    }
  };

  const handleChangeStatus = (taskId: string, status: string) => {
    handleUpdateTask(taskId, "status", status);
  };

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
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Belum ada data rencana mitigasi untuk monitoring ini.
        </CardContent>
      </Card>
    );
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
              Laporkan status setiap rencana mitigasi sebelum finalisasi pemantauan.
            </p>
          </div>
          <Badge variant={validation?.canFinalize ? "default" : "outline"}>
            {doneCount}/{tasks.length} dilaporkan
          </Badge>
        </div>
        <Progress value={progressPct} className="mt-4 h-2" />
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="h-11">
                <TableHead className="h-11 whitespace-nowrap py-3 align-middle">
                  Mitigasi
                </TableHead>
                <TableHead className="h-11 w-32 whitespace-nowrap py-3 align-middle">
                  PIC
                </TableHead>
                <TableHead className="h-11 w-28 whitespace-nowrap py-3 align-middle">
                  Status
                </TableHead>
                <TableHead className="h-11 w-40 whitespace-nowrap py-3 align-middle">
                  Output Tercapai
                </TableHead>
                <TableHead className="h-11 w-40 whitespace-nowrap py-3 align-middle">
                  Kendala
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
                    <Select
                      value={task.status}
                      onValueChange={(val) => handleChangeStatus(task.id, val)}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Belum Dilaporkan</SelectItem>
                        <SelectItem value="done">Selesai Dilaporkan</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Output..."
                      value={task.reportOutput}
                      onChange={(e) => {
                        setTasks((prev) =>
                          prev.map((t) =>
                            t.id === task.id
                              ? { ...t, reportOutput: e.target.value }
                              : t,
                          ),
                        );
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== (task.reportOutput ?? "")) {
                          handleUpdateTask(task.id, "reportOutput", e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 text-xs"
                      placeholder="Kendala..."
                      value={task.reportObstacle}
                      onChange={(e) => {
                        setTasks((prev) =>
                          prev.map((t) =>
                            t.id === task.id
                              ? { ...t, reportObstacle: e.target.value }
                              : t,
                          ),
                        );
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== (task.reportObstacle ?? "")) {
                          handleUpdateTask(task.id, "reportObstacle", e.target.value);
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!validation?.canFinalize && validation && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <span className="font-medium">
              {validation.pendingTasks} mitigasi belum dilaporkan.
            </span>
            Laporkan seluruh mitigasi sebelum finalisasi.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
