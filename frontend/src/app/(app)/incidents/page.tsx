"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  Link2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
} from "lucide-react";

const severityVariant: Record<string, string> = {
  Kritis: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  Major: "bg-risk-high/15 text-risk-high border-risk-high/20",
  Minor: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Insignificant: "bg-risk-low/15 text-risk-low border-risk-low/20",
};

const statusVariant: Record<string, string> = {
  open: "bg-risk-high/15 text-risk-high border-risk-high/20",
  investigating: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  resolved: "bg-success/15 text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
};

function getSeverityLabel(severity: string) {
  if (severity === "critical" || severity === "kritis") return "Kritis";
  if (severity === "major") return "Major";
  if (severity === "minor") return "Minor";
  return "Insignificant";
}

function getStatusLabel(status: string) {
  if (status === "investigating") return "Investigating";
  if (status === "resolved") return "Resolved";
  if (status === "closed") return "Closed";
  return "Open";
}

export default function IncidentPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!token) return;

    Promise.all([
      api.get<any[]>("/incidents", token),
      api.get<any>("/incidents/summary", token),
    ]).then(([incs, sum]) => {
      setIncidents(incs || []);
      setSummary(sum || { total: 0, open: 0, investigating: 0, resolved: 0 });
      setLoading(false);
    }).catch(console.error);
  }, [token]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // search
      if (search && !inc.title.toLowerCase().includes(search.toLowerCase()) && !inc.code?.toLowerCase().includes(search.toLowerCase())) return false;
      // severity
      if (severityFilter !== "all" && inc.severity.toLowerCase() !== severityFilter.toLowerCase()) return false;
      // status
      if (statusFilter !== "all" && inc.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      
      return true;
    });
  }, [incidents, search, severityFilter, statusFilter]);
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Incident Register
          </h1>
          <p className="text-sm text-muted-foreground">
            Pelaporan insiden menggunakan formula 5W1H + CAPA
          </p>
        </div>
        <Link href="/incidents/new">
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="size-4" />
            Lapor Insiden Baru
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Insiden", value: summary?.total || 0, icon: AlertTriangle, color: "text-foreground" },
          { label: "Open", value: summary?.open || 0, icon: AlertTriangle, color: "text-risk-high" },
          { label: "Investigating", value: summary?.investigating || 0, icon: Eye, color: "text-risk-medium" },
          { label: "Resolved / Closed", value: summary?.resolved || 0, icon: AlertTriangle, color: "text-success" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={cn("size-5", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari insiden..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/30 border-none"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-muted/30 border-none">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Severity</SelectItem>
                <SelectItem value="critical">Kritis</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-muted/30 border-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-20 text-xs">Kode</TableHead>
              <TableHead className="text-xs">Insiden</TableHead>
              <TableHead className="text-xs w-32">Kapan</TableHead>
              <TableHead className="text-xs w-36">Lokasi</TableHead>
              <TableHead className="text-xs w-24">Severity</TableHead>
              <TableHead className="text-xs w-28">Status</TableHead>
              <TableHead className="text-xs w-20">Linked</TableHead>
              <TableHead className="text-xs w-24">CAPA</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">Memuat insiden...</TableCell>
              </TableRow>
            ) : filteredIncidents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">Belum ada data insiden.</TableCell>
              </TableRow>
            ) : filteredIncidents.map((inc) => {
              const severityLabel = getSeverityLabel(inc.severity);
              const statusLabel = getStatusLabel(inc.status);
              const date = new Date(inc.when || inc.createdAt).toLocaleDateString("id-ID", {
                year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
              });

              return (
              <TableRow
                key={inc.id}
                className="border-border/30 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => router.push(`/incident/${inc.id}`)}
              >
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {inc.code || inc.id.substring(0,8)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-xs font-medium leading-relaxed line-clamp-1">
                      {inc.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="size-2.5" />
                        {inc.reporterName || "System"}
                      </span>
                      {inc.who && (
                        <span className="flex items-center gap-1">
                          <User className="size-2.5" />
                          {inc.who}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" />
                    {date.split(" ")[0]}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    <span className="truncate max-w-[120px]">{inc.where || "—"}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold border h-5 px-1.5",
                      severityVariant[severityLabel]
                    )}
                  >
                    {severityLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-[10px] font-medium border h-5 px-1.5 capitalize",
                      statusVariant[statusLabel.toLowerCase()] || "bg-muted text-muted-foreground"
                    )}
                  >
                    {statusLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  {inc.linkedRiskId ? (
                    <Link href={`/risk/register/${inc.linkedRiskId}`} className="flex items-center gap-1 text-xs text-primary font-mono hover:underline">
                      <Link2 className="size-3" />
                      {inc.linkedRiskCode || inc.linkedRiskId.substring(0,8)}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium h-5 px-1.5"
                  >
                    {inc.correctiveAction || inc.preventiveAction ? "In Progress" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan 1-5 dari 12 insiden
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button variant="ghost" size="xs" className="text-xs font-medium bg-primary/10 text-primary">1</Button>
            <Button variant="ghost" size="xs" className="text-xs text-muted-foreground">2</Button>
            <Button variant="ghost" size="xs" className="text-xs text-muted-foreground">3</Button>
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
