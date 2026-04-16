"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listApprovedRisks,
  createReassessmentDraft,
  getCurrentCycle,
  formatCycleLabel,
  type PaginatedRiskResponse,
} from "@/lib/api/risk-assessment";
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

  const [data, setData] = useState<PaginatedRiskResponse | null>(null);
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

  const handleAssess = async (riskId: string) => {
    if (!token) return;
    setAssessingId(riskId);
    try {
      const draft = await createReassessmentDraft(token, riskId, cycle);
      toast.success("Draf penilaian berhasil dibuat");
      router.push(`/risk/assessment/${draft.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Gagal membuat draf penilaian");
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
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Penilaian Risiko</h1>
          <p className="text-muted-foreground">
            Lakukan penilaian ulang untuk risiko yang telah disetujui.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Risiko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari judul/kode..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={cycle} onValueChange={handleCycleChange}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Pilih Periode" />
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
          </div>

          <div className="rounded-md border">
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
                ) : !data || data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Tidak ada risiko yang perlu dinilai
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((risk) => {
                    const prob = risk.probability || 0;
                    const imp = risk.impact || 0;
                    const probLabel = PROBABILITY_LABELS[prob] || "-";
                    const impLabel = IMPACT_LABELS[imp] || "-";
                    const nilai = risk.nilai || 0;
                    const level = getRiskLevelFromNilai(nilai);

                    return (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium">
                          {risk.riskCode || risk.code || "-"}
                        </TableCell>
                        <TableCell>{risk.title}</TableCell>
                        <TableCell>{risk.orgName || "-"}</TableCell>
                        <TableCell>{probLabel}</TableCell>
                        <TableCell>{impLabel}</TableCell>
                        <TableCell>{nilai.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={levelToColor(level)}>
                            {getRiskLevelLabel(level)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            disabled={assessingId === risk.id}
                            onClick={() => handleAssess(risk.id)}
                          >
                            {assessingId === risk.id ? "Memproses..." : "Assess"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.total > limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * limit + 1} -{" "}
                {Math.min(page * limit, data.total)} dari {data.total} risiko
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                >
                  Sebelumnnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= data.total || isLoading}
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
