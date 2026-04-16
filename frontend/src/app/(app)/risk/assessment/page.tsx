"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listApprovedRisks,
  createReassessmentDraft,
  getCurrentCycle,
  formatCycleLabel,
} from "@/lib/api/risk-assessment";
import type { Risk } from "@/types/risk";
import { useAuth } from "@/contexts/auth-context";
import {
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  levelToColor,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
} from "@/lib/risk";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function RiskAssessmentListPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [cycle, setCycle] = useState(getCurrentCycle());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [data, setData] = useState<Risk[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assessingId, setAssessingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleCycleChange = (val: string) => {
    setCycle(val);
    setPage(1);
  };

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const fetchRisks = async () => {
      setIsLoading(true);
      try {
        const result = await listApprovedRisks(token, {
          q: debouncedSearch,
          assessment_cycle: cycle,
          page,
          limit,
        });
        if (isMounted) setData(result);
      } catch (error) {
        if (isMounted) toast.error("Gagal memuat data risiko");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRisks();
    return () => {
      isMounted = false;
    };
  }, [token, cycle, debouncedSearch, page]);

  const handleAssess = async (risk: Risk) => {
    if (!token) return;
    setAssessingId(risk.id);
    try {
      // If draft/in_review/in_approval → open existing form
      if (risk.status === "draft" || risk.status === "in_review" || risk.status === "in_approval") {
        router.push(`/risk/assessment/${risk.id}`);
        return;
      }
      // If approved → create new reassessment draft
      const draft = await createReassessmentDraft(token, risk.id, cycle);
      toast.success("Draf penilaian berhasil dibuat");
      router.push(`/risk/assessment/${draft.id}`);
    } catch (error) {
      toast.error((error as Error)?.message || "Gagal membuat draf penilaian");
      setAssessingId(null);
    }
  };

  const currentYear = new Date().getFullYear();
  const cycleOptions = [
    `${currentYear}-H1`,
    `${currentYear}-H2`,
    `${currentYear + 1}-H1`,
    `${currentYear + 1}-H2`,
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pemantauan Risiko</h1>
          <p className="text-sm text-muted-foreground">
            Lakukan penilaian ulang untuk risiko yang telah disetujui
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari risiko..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30 border-none"
              />
            </div>
            <Select value={cycle} onValueChange={handleCycleChange}>
              <SelectTrigger className="h-8 w-44 text-xs bg-muted/30 border-none">
                <SelectValue placeholder="Siklus Asesmen" />
              </SelectTrigger>
              <SelectContent>
                {cycleOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {formatCycleLabel(opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Daftar Risiko</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead className="min-w-[200px]">Judul</TableHead>
                  <TableHead>Organisasi</TableHead>
                  <TableHead>Probabilitas</TableHead>
                  <TableHead>Dampak</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : !data || data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Tidak ada risiko yang perlu dinilai
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((risk) => {
                    const prob = risk.probability || 0;
                    const imp = risk.impact || 0;
                    const probLabel = PROBABILITY_LABELS[prob] || "-";
                    const impLabel = IMPACT_LABELS[imp] || "-";
                    const inherentScore = risk.inherentScore || 0;
                    const level = getRiskLevelFromNilai(inherentScore);

                    return (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium">
                          {risk.riskCode || risk.code || "-"}
                        </TableCell>
                        <TableCell>{risk.title}</TableCell>
                        <TableCell>{risk.orgName || "-"}</TableCell>
                        <TableCell>{probLabel}</TableCell>
                        <TableCell>{impLabel}</TableCell>
                        <TableCell>{inherentScore.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={levelToColor(level)}>
                            {getRiskLevelLabel(level)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 px-2 text-xs"
                            disabled={assessingId === risk.id}
                            onClick={() => handleAssess(risk)}
                          >
                            {assessingId === risk.id ? "Memproses..." : "Nilai"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Menampilkan {(page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, data.length)} dari {data.length} risiko
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= data.length || isLoading}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
