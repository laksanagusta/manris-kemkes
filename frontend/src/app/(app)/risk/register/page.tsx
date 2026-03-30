"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  Clock,
  Send,
  History,
  GitBranch,
  Calendar,
  Eye,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertCircle,
} from "lucide-react";

const levelBadgeVariant: Record<string, string> = {
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  Ekstrem: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

const statusVariant: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  final: "bg-primary/15 text-primary border-primary/20",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
};

function getRiskLevel(prob: number | undefined, impact: number | undefined): string {
  if (prob === undefined || impact === undefined || isNaN(prob) || isNaN(impact)) return "Rendah";
  const score = (prob + 1) * (impact + 1);
  if (score <= 4) return "Rendah";
  if (score <= 9) return "Sedang";
  if (score <= 16) return "Tinggi";
  return "Ekstrem";
}

function computeCompleteness(draft: any) {
  let score = 0;
  let total = 6;
  if (draft.title && draft.description) score++;
  if (draft.cause && draft.impactDesc) score++;
  if (draft.existingControl && draft.probability && draft.impact) score++;
  if (draft.treatmentOption) score++;
  if (draft.targetProbability && draft.targetImpact) score++;
  if (draft.nextReviewDate) score++;
  return Math.round((score / total) * 100);
}

export default function RiskRegisterPage() {
  const { token } = useAuth();
  const [risks, setRisks] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedVersion, setSelectedVersion] = useState("v3");
  const [activeTab, setActiveTab] = useState("all-risks");

  // Mock versions data (can be replaced with API call later)
  const versions = [
    { id: "v4", name: "Q1 2026 Snapshot", date: "2026-03-01", isCurrent: true },
    { id: "v3", name: "Q4 2025 Snapshot", date: "2025-12-01", isCurrent: false },
    { id: "v2", name: "Q3 2025 Snapshot", date: "2025-09-01", isCurrent: false },
    { id: "v1", name: "Q2 2025 Snapshot", date: "2025-06-01", isCurrent: false },
  ];

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        setError(null);
        const [allRisks, draftRisks] = await Promise.all([
          api.get<any[]>("/risks", token),
          api.get<any[]>("/risks?status=draft", token)
        ]);

        // Separate drafts from all risks
        setDrafts(draftRisks);
        setRisks(allRisks.filter(r => r.status !== 'draft'));

        // Generate history data from approved risks
        const approvedRisks = allRisks.filter(r => r.status === 'approved');
        const mappedHistory = approvedRisks.map((r) => {
          const prob = r.probability ?? 1;
          const impact = r.impact ?? 1;
          const targetProb = r.targetProbability ?? prob;
          const targetImpact = r.targetImpact ?? impact;

          const score = prob * impact;
          const target = targetProb * targetImpact;

          let currentLevel = "Rendah";
          if (score >= 17) currentLevel = "Ekstrem";
          else if (score >= 10) currentLevel = "Tinggi";
          else if (score >= 5) currentLevel = "Sedang";

          let previousLevel = "Rendah";
          if (target >= 17) previousLevel = "Ekstrem";
          else if (target >= 10) previousLevel = "Tinggi";
          else if (target >= 5) previousLevel = "Sedang";

          let trend = "stable";
          if (score > target) trend = "up";
          else if (score < target) trend = "down";

          return {
            riskId: r.code || "-",
            title: r.title || "-",
            unit: r.orgName || "—",
            currentLevel,
            previousLevel,
            trend,
            changeReason: `Skor awal (Inherent): ${score}, Skor Target: ${target}`,
          };
        });
        setHistoryData(mappedHistory.slice(0, 10));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Gagal memuat data risiko. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const filteredRisks = useMemo(() => {
    return risks.filter(r => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.code.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [risks, search, statusFilter]);

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Hapus draft ini?")) return;
    try {
      await api.delete(`/risks/${id}`, token || undefined);
      // Refresh drafts
      const updatedDrafts = await api.get<any[]>("/risks?status=draft", token || undefined);
      setDrafts(updatedDrafts);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitDraft = async (draft: any) => {
    if (!confirm("Ajukan draft ini menjadi Final?")) return;
    try {
      // Fetch full object so mitigations arrays are not wiped out
      const fullRisk = await api.get<any>(`/risks/${draft.id}`, token || undefined);
      await api.put(`/risks/${draft.id}`, { ...fullRisk, status: "final" }, token || undefined);
      // Refresh drafts and risks
      const [updatedDrafts, allRisks] = await Promise.all([
        api.get<any[]>("/risks?status=draft", token || undefined),
        api.get<any[]>("/risks", token || undefined)
      ]);
      setDrafts(updatedDrafts);
      setRisks(allRisks.filter(r => r.status !== 'draft'));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat daftar risiko...</div>;
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Gagal Memuat Data</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
            <ArrowUpRight className="size-4" />
            Muat Ulang Halaman
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Register</h1>
          <p className="text-sm text-muted-foreground">
            Kelola seluruh risiko organisasi sesuai ISO 31000:2018
          </p>
        </div>
        <Link href="/risk/register/new">
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="size-4" />
            Tambah Risiko
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all-risks" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/40 border border-border/50">
          <TabsTrigger value="all-risks" className="gap-2">
            <GitBranch className="size-3.5" />
            All Risks
          </TabsTrigger>
          <TabsTrigger value="my-drafts" className="gap-2">
            <Edit3 className="size-3.5" />
            My Drafts
            {drafts.length > 0 && (
              <Badge className="ml-1 bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-3.5" />
            Version History
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL RISKS */}
        <TabsContent value="all-risks" className="space-y-6 mt-6">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: `Total: ${risks.length}`, variant: "outline" as const },
              { label: `Ekstrem: ${risks.filter(r => getRiskLevel(r.probability - 1, r.impact - 1) === 'Ekstrem').length}`, cls: levelBadgeVariant.Ekstrem },
              { label: `Tinggi: ${risks.filter(r => getRiskLevel(r.probability - 1, r.impact - 1) === 'Tinggi').length}`, cls: levelBadgeVariant.Tinggi },
              { label: `Sedang: ${risks.filter(r => getRiskLevel(r.probability - 1, r.impact - 1) === 'Sedang').length}`, cls: levelBadgeVariant.Sedang },
              { label: `Rendah: ${risks.filter(r => getRiskLevel(r.probability - 1, r.impact - 1) === 'Rendah').length}`, cls: levelBadgeVariant.Rendah },
            ].filter(b => b.cls !== undefined).map((b) => (
              <Badge
                key={b.label}
                variant={b.variant || "outline"}
                className={cn("text-xs font-medium border", b.cls)}
              >
                {b.label}
              </Badge>
            ))}
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
                    onChange={e => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-muted/30 border-none"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="h-8 w-40 text-xs bg-muted/30 border-none">
                    <SelectValue placeholder="Unit Kerja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Unit</SelectItem>
                    <SelectItem value="surveilans">Dit. Surveilans</SelectItem>
                    <SelectItem value="p2pm">Dit. P2PM</SelectItem>
                    <SelectItem value="p2ptm">Dit. P2PTM</SelectItem>
                    <SelectItem value="sekretariat">Sekretariat</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="h-8 w-32 text-xs bg-muted/30 border-none">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Level</SelectItem>
                    <SelectItem value="extreme">Ekstrem</SelectItem>
                    <SelectItem value="high">Tinggi</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="low">Rendah</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-32 text-xs bg-muted/30 border-none">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-20 text-xs">Kode</TableHead>
                  <TableHead className="text-xs">Judul Risiko</TableHead>
                  <TableHead className="text-xs w-32">Unit Kerja</TableHead>
                  <TableHead className="text-xs text-center w-24">Probabilitas</TableHead>
                  <TableHead className="text-xs text-center w-24">Dampak</TableHead>
                  <TableHead className="text-xs text-center w-16">Skor</TableHead>
                  <TableHead className="text-xs w-24">Level</TableHead>
                  <TableHead className="text-xs w-24">Status</TableHead>
                  <TableHead className="text-xs w-28">Perlakuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                      Tidak ada risiko yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : filteredRisks.map((risk) => {
                  const levelLabel = getRiskLevel(risk.probability - 1, risk.impact - 1);
                  return (
                  <TableRow
                    key={risk.id}
                    className="border-border/30 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => window.location.href = `/risk/register/${risk.id}`}
                  >
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {risk.code || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium leading-relaxed line-clamp-1">
                          {risk.title || "-"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Dibuat oleh: {risk.createdByName || "System"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {risk.orgName || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium">
                      {risk.probability ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium">
                      {risk.impact ?? "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-bold">{risk.inherentScore ?? "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] font-semibold border h-5 px-1.5",
                          levelBadgeVariant[levelLabel]
                        )}
                      >
                        {levelLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-[10px] font-medium border h-5 px-1.5 capitalize",
                          statusVariant[risk.status]
                        )}
                      >
                        {risk.status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {risk.treatmentOption || "-"}
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Menampilkan {filteredRisks.length} dari {risks.length} risiko
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button variant="ghost" size="xs" className="text-xs font-medium bg-primary/10 text-primary">
                  1
                </Button>
                <Button variant="ghost" size="xs" className="text-xs text-muted-foreground">
                  2
                </Button>
                <Button variant="ghost" size="xs" className="text-xs text-muted-foreground">
                  3
                </Button>
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: MY DRAFTS */}
        <TabsContent value="my-drafts" className="space-y-6 mt-6">
          <Card className="border-border/50 bg-card/80 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-20 text-xs">ID</TableHead>
                  <TableHead className="text-xs">Judul Draf / Risiko</TableHead>
                  <TableHead className="text-xs w-32">Status</TableHead>
                  <TableHead className="text-xs w-32">Pembaruan</TableHead>
                  <TableHead className="text-xs w-28 text-center">Progres</TableHead>
                  <TableHead className="text-xs w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                      Belum ada draft.
                    </TableCell>
                  </TableRow>
                ) : drafts.map((draft) => {
                  const completeness = computeCompleteness(draft);
                  const date = draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString("id-ID", {
                    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                  }) : "-";

                  return (
                  <TableRow key={draft.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="text-xs font-mono text-muted-foreground">{draft.code || (draft.id ? draft.id.substring(0,8) : "-")}</TableCell>
                    <TableCell>
                      <p className="text-xs font-medium line-clamp-1">{draft.title || "Tanpa Judul"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{draft.orgName || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-5 px-1.5",
                          draft.status === 'draft' ? "text-muted-foreground" : "text-risk-medium border-risk-medium/50 bg-risk-medium/10"
                        )}
                      >
                        Draft (WIP)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Clock className="size-3" /> {date}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full", completeness === 100 ? "bg-success" : "bg-primary")} style={{ width: `${completeness}%` }} />
                        </div>
                        <span className="text-[10px] font-mono">{completeness}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {draft.status === 'draft' && (
                          <>
                            <Link href={`/risk/register/new?id=${draft.id}`}>
                              <Button variant="ghost" size="icon-xs" className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10" title="Lanjutkan Draft"><Edit3 className="size-3.5" /></Button>
                            </Link>
                            {completeness === 100 && (
                              <Button variant="ghost" size="icon-xs" onClick={() => handleSubmitDraft(draft)} className="h-7 w-7 text-success hover:text-success hover:bg-success/10" title="Ajukan Final"><Send className="size-3.5" /></Button>
                            )}
                            <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteDraft(draft.id)} className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 3: HISTORY */}
        <TabsContent value="history" className="space-y-6 mt-6">
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
                        <TableHead className="w-20 text-xs">Kode</TableHead>
                        <TableHead className="text-xs">Risiko & Alasan Perubahan</TableHead>
                        <TableHead className="text-xs w-28">Versi Lama</TableHead>
                        <TableHead className="text-xs text-center w-12">→</TableHead>
                        <TableHead className="text-xs w-28">Versi Current</TableHead>
                        <TableHead className="text-xs w-16 text-center">Tren</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                            Belum ada history untuk snapshot ini.
                          </TableCell>
                        </TableRow>
                      ) : historyData.map((history) => (
                        <TableRow key={history.riskId} className="border-border/30 hover:bg-muted/30">
                          <TableCell className="text-xs font-mono text-muted-foreground">{history.riskId || "-"}</TableCell>
                          <TableCell>
                            <p className="text-xs font-medium leading-relaxed">{history.title || "-"}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 italic text-primary/70">{history.changeReason || "-"}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px] font-semibold border h-5 px-1.5", levelBadgeVariant[history.previousLevel] || levelBadgeVariant.Rendah)}>
                              {history.previousLevel || "Rendah"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">→</TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px] font-semibold border h-5 px-1.5", levelBadgeVariant[history.currentLevel] || levelBadgeVariant.Rendah)}>
                              {history.currentLevel || "Rendah"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {history.trend === "up" && <TrendingUp className="size-4 text-risk-extreme mx-auto" />}
                            {history.trend === "down" && <TrendingDown className="size-4 text-success mx-auto" />}
                            {(history.trend === "stable" || !history.trend) && <Minus className="size-4 text-muted-foreground mx-auto" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
