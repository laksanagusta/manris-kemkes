"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { buildLatestOrganizationProgressData } from "@/lib/dashboard-insights";
import { cn } from "@/lib/utils";
import { listWorkingPapers } from "@/lib/api/working-papers";
import type { LatestOrganizationProgressDatum } from "@/lib/dashboard-insights";
import type { WorkingPaper } from "@/types/working-paper";

const PROGRESS_COLOR_CLASS = "[&>div]:bg-[oklch(0.72_0.17_155)]";
const WORKING_PAPER_PAGE_SIZE = 100;

async function listAllWorkingPapers(token: string): Promise<WorkingPaper[]> {
  const firstPage = await listWorkingPapers(token, {
    page: 1,
    limit: WORKING_PAPER_PAGE_SIZE,
  });
  const initialData = firstPage.data ?? [];
  const pageSize = firstPage.limit ?? WORKING_PAPER_PAGE_SIZE;
  const totalPages = Math.max(
    1,
    Math.ceil((firstPage.total ?? initialData.length) / pageSize),
  );

  if (totalPages === 1) {
    return initialData;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      listWorkingPapers(token, {
        page: index + 2,
        limit: pageSize,
      }),
    ),
  );

  return [...initialData, ...remainingPages.flatMap((page) => page.data ?? [])];
}

type MonitoringLatestProgressChartProps = {
  data?: LatestOrganizationProgressDatum[];
};

export function MonitoringLatestProgressChart({
  data,
}: MonitoringLatestProgressChartProps) {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [workingPapers, setWorkingPapers] = useState<WorkingPaper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setWorkingPapers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadWorkingPapers = async () => {
      setLoading(true);
      try {
        const items = await listAllWorkingPapers(token);
        if (!cancelled) {
          setWorkingPapers(items);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setWorkingPapers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadWorkingPapers();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const resolvedData = useMemo(
    () => data ?? buildLatestOrganizationProgressData(workingPapers),
    [data, workingPapers],
  );
  const hasData = resolvedData.length > 0;
  const sortedData = [...resolvedData].sort(
    (a, b) => b.progressPercent - a.progressPercent,
  );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <CollapsibleTrigger className="flex flex-1 items-start gap-2 text-left transition-opacity hover:opacity-70">
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">
                  Progress Kertas Kerja Terakhir
                </CardTitle>
                <p className="text-xs leading-5 text-muted-foreground">
                  Persentase risiko approved pada kertas kerja terbaru tiap organisasi.
                </p>
              </div>
            </CollapsibleTrigger>
            {hasData ? (
              <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">
                {resolvedData.length} organisasi
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {loading ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Memuat progress kertas kerja terbaru...
              </div>
            ) : !hasData ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data progress organisasi untuk ditampilkan.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto rounded-md border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="h-11">
                      <TableHead className="h-11 whitespace-nowrap py-3 align-middle">Organisasi</TableHead>
                      <TableHead className="h-11 whitespace-nowrap py-3 align-middle">Periode</TableHead>
                      <TableHead className="h-11 w-[40%] whitespace-nowrap py-3 align-middle">Progress</TableHead>
                      <TableHead className="h-11 whitespace-nowrap py-3 text-right align-middle">
                        Approved
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((row) => (
                      <TableRow key={row.orgName}>
                        <TableCell className="text-sm font-medium">
                          {row.orgName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.period}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={row.progressPercent}
                              className={`h-2 ${PROGRESS_COLOR_CLASS}`}
                            />
                            <span className="w-8 text-right text-xs text-muted-foreground">
                              {row.progressPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.progressCount}/{row.totalCount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
