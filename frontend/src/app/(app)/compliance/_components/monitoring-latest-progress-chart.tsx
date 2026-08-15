"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { Card, CardContent } from "@/components/ui/card";
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

const PROGRESS_COLOR_CLASS = "";
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
    <Card className="bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between gap-4 px-0 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-inner ring-1 ring-inset ring-border/80">
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200 ease-out",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Progress Kertas Kerja Terbaru
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Persentase risiko final pada kertas kerja terbaru tiap
                    organisasi.
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Memuat progress kertas kerja terbaru...
              </div>
            ) : !hasData ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data progress organisasi untuk ditampilkan.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto rounded-md ring-1 ring-inset ring-border">
                <Table>
                  <TableHeader>
                    <TableRow className="h-11">
                      <TableHead className="h-11 whitespace-nowrap py-3 align-middle">
                        Organisasi
                      </TableHead>
                      <TableHead className="h-11 whitespace-nowrap py-3 align-middle">
                        Periode
                      </TableHead>
                      <TableHead className="h-11 w-[40%] whitespace-nowrap py-3 align-middle">
                        Progress
                      </TableHead>
                      <TableHead className="h-11 whitespace-nowrap py-3 text-right align-middle">
                        Final
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
