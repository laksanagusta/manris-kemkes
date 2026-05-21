"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getLinearRiskLevelBadgeClass } from "@/lib/linear-status-badge";
import {
  History,
  GitBranch,
  Calendar,
  Eye,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { buildApprovedRiskHistoryItem } from "@/lib/risk-history";

const versions = [
  { id: "v4", name: "Q1 2026 Snapshot", date: "2026-03-01", isCurrent: true },
  { id: "v3", name: "Q4 2025 Snapshot", date: "2025-12-01", isCurrent: false },
  { id: "v2", name: "Q3 2025 Snapshot", date: "2025-09-01", isCurrent: false },
  { id: "v1", name: "Q2 2025 Snapshot", date: "2025-06-01", isCurrent: false },
];
export default function RiskHistoryPage() {
  const { token } = useAuth();
  const [selectedVersion, setSelectedVersion] = useState("v3");
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    // Since there's no actual snapshot back-end yet, we simulate history by diffing Current vs Target score
    api.get<any[]>("/risks?status=approved", token).then((risks) => {
      const mapped = risks.map((r) => buildApprovedRiskHistoryItem(r));
      setHistoryData(mapped.slice(0, 10)); // Just show recent
    }).finally(() => setLoading(false));
  }, [token, selectedVersion]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="size-6 text-primary" />
            Risk Versioning (History)
          </h1>
          <p className="text-sm text-muted-foreground">
            Rekam jejak periode manajemen risiko organisasi dari waktu ke waktu
          </p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20">
          <GitBranch className="size-4" />
          Create Snapshot Baru
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Timeline Version Selector */}
        <div className="lg:col-span-1 border-r border-border/50 pr-4">
          <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider text-muted-foreground">Timeline Snapshot</h3>
          <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {versions.map((ver) => (
              <button
                key={ver.id}
                onClick={() => setSelectedVersion(ver.id)}
                className={cn(
                  "relative flex items-center justify-between w-full p-3 rounded-lg border text-left transition-all z-10",
                  selectedVersion === ver.id
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "bg-card/80 border-border/50 hover:bg-muted/50",
                  ver.isCurrent && "ring-1 ring-primary/50"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{ver.name}</span>
                    {ver.isCurrent && (
                      <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1.5 ml-1">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                    <Calendar className="size-3" />
                    <span>{ver.date}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Change Comparison */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GitBranch className="size-4" />
                Perbandingan: {versions.find(v => v.id === selectedVersion)?.name} vs Current
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-20 text-xs whitespace-nowrap">Kode</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Risiko & Alasan Perubahan</TableHead>
                    <TableHead className="text-xs w-28 whitespace-nowrap">Versi Lama</TableHead>
                    <TableHead className="text-xs text-center w-12 whitespace-nowrap">→</TableHead>
                    <TableHead className="text-xs w-28 whitespace-nowrap">Versi Current</TableHead>
                    <TableHead className="text-xs w-16 text-center whitespace-nowrap">Tren</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        Memuat data history...
                      </TableCell>
                    </TableRow>
                  ) : historyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24">
                        <div className="flex flex-col gap-1 text-left">
                          <p className="text-sm font-medium text-muted-foreground">Belum ada history untuk snapshot ini</p>
                          <p className="text-xs text-muted-foreground/70">Snapshot ini tidak memiliki rekam jejak yang tercatat</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : historyData.map((history) => (
                    <TableRow key={history.riskId} className="border-border/30 hover:bg-muted/30">
                      <TableCell className="text-xs font-mono text-muted-foreground">{history.riskId}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate text-xs font-medium leading-relaxed">{history.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground mt-0.5 italic text-primary/70">{history.changeReason}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getLinearRiskLevelBadgeClass(history.previousLevel)}>
                          {history.previousLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">→</TableCell>
                      <TableCell>
                        <Badge className={getLinearRiskLevelBadgeClass(history.currentLevel)}>
                          {history.currentLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {history.trend === "up" && <TrendingUp className="size-4 text-risk-extreme mx-auto" />}
                        {history.trend === "down" && <TrendingDown className="size-4 text-success mx-auto" />}
                        {history.trend === "stable" && <Minus className="size-4 text-muted-foreground mx-auto" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
