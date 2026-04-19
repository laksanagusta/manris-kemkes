"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LatestOrganizationProgressDatum } from "@/lib/dashboard-insights";

const PROGRESS_COLOR_CLASS = "[&>div]:bg-[oklch(0.72_0.17_155)]";

type OrganizationLatestProgressChartProps = {
  data?: LatestOrganizationProgressDatum[];
};

export function OrganizationLatestProgressChart({
  data = [],
}: OrganizationLatestProgressChartProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasData = data.length > 0;
  const sortedData = [...data].sort((a, b) => b.approvedPercent - a.approvedPercent);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70 transition-opacity">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
              <div>
                <CardTitle className="text-base font-semibold">
                  Progress Kertas Kerja Terakhir
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Persentase risiko approved pada cycle terbaru tiap organisasi.
                </p>
              </div>
            </CollapsibleTrigger>
            {hasData ? (
              <Badge variant="outline" className="text-[10px]">
                {data.length} organisasi
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {!hasData ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                Belum ada data progress organisasi untuk ditampilkan.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto rounded-md border border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Organisasi</TableHead>
                      <TableHead className="whitespace-nowrap">Periode</TableHead>
                      <TableHead className="w-[40%] whitespace-nowrap">Progress</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((row, idx) => (
                      <TableRow key={`${row.orgName}-${idx}`}>
                        <TableCell className="text-sm font-medium">{row.orgName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.period}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={row.approvedPercent}
                              className={`h-2 ${PROGRESS_COLOR_CLASS}`}
                            />
                            <span className="w-8 text-right text-xs text-muted-foreground">
                              {row.approvedPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {row.approvedCount}/{row.totalCount}
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
