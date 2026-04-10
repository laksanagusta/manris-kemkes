"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import type { IncidentRecord, IncidentSummary } from "@/types/incident";

import { Card, CardContent } from "@/components/ui/card";
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
  CheckCircle2,
  Clock3,
  Link2,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  User,
} from "lucide-react";

const statusVariant: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  final: "bg-primary/10 text-primary border-primary/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-risk-high/10 text-risk-high border-risk-high/20",
  open: "bg-risk-high/15 text-risk-high border-risk-high/20",
  investigating: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  resolved: "bg-success/15 text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
};

const severityVariant: Record<string, string> = {
  critical: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  major: "bg-risk-high/15 text-risk-high border-risk-high/20",
  minor: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  insignificant: "bg-risk-low/15 text-risk-low border-risk-low/20",
};

function getSeverityLabel(severity: string) {
  if (severity === "critical") return "Kritis";
  if (severity === "major") return "Major";
  if (severity === "minor") return "Minor";
  return "Insignificant";
}

function getStatusLabel(status: string) {
  if (status === "final") return "Menunggu Approval";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "investigating") return "Investigating";
  if (status === "resolved") return "Resolved";
  if (status === "closed") return "Closed";
  if (status === "open") return "Open";
  return "Draft";
}

export default function IncidentPage() {
  const { token, user } = useAuth();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    Promise.all([
      api.get<IncidentRecord[]>("/incidents", token),
      api.get<IncidentSummary>("/incidents/summary", token),
    ])
      .then(([incidentData, summaryData]) => {
        if (cancelled) return;
        setIncidents(incidentData || []);
        setSummary(summaryData);
      })
      .catch((error) => {
        console.error("Failed to load incidents:", error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesSearch =
        !search ||
        incident.title.toLowerCase().includes(search.toLowerCase()) ||
        incident.code?.toLowerCase().includes(search.toLowerCase()) ||
        incident.what.toLowerCase().includes(search.toLowerCase());

      const matchesSeverity =
        severityFilter === "all" ||
        incident.severity.toLowerCase() === severityFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        incident.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, search, severityFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insiden</h1>
          <p className="text-sm text-muted-foreground">
            Batch incident intake dari PDF, review, approval, dan kaitan
            multi-risk.
          </p>
        </div>
        {(!token || (user?.isGlobal || !!user?.organizationId)) && (
          <Link href="/incidents/new">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              Incident
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Insiden",
            value: summary?.total || 0,
            icon: Sparkles,
            color: "text-foreground",
          },
          {
            label: "Draft",
            value: summary?.draft || 0,
            icon: Clock3,
            color: "text-muted-foreground",
          },
          {
            label: "Menunggu Approval",
            value: summary?.final || 0,
            icon: TriangleAlert,
            color: "text-primary",
          },
          {
            label: "Approved",
            value: summary?.approved || 0,
            icon: CheckCircle2,
            color: "text-success",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={cn("size-5", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari kode, judul, atau isi incident..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-8 border-none bg-muted/30 pl-8 text-xs"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 w-36 border-none bg-muted/30 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Severity</SelectItem>
                <SelectItem value="critical">Kritis</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="insignificant">Insignificant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-44 border-none bg-muted/30 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="final">Menunggu Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-card/80">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-24 text-xs">Kode</TableHead>
              <TableHead className="text-xs">Insiden</TableHead>
              <TableHead className="w-40 text-xs">Created By</TableHead>
              <TableHead className="w-32 text-xs">Kapan</TableHead>
              <TableHead className="w-28 text-xs">Severity</TableHead>
              <TableHead className="w-36 text-xs">Status</TableHead>
              <TableHead className="w-52 text-xs">Risiko Terkait</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  Memuat insiden...
                </TableCell>
              </TableRow>
            ) : filteredIncidents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-xs text-muted-foreground"
                >
                  Belum ada insiden yang cocok dengan filter ini.
                </TableCell>
              </TableRow>
            ) : (
              filteredIncidents.map((incident) => {
                const isReadOnly = isReadOnlyForOrg(user, incident.organizationId || "");
                return (
                <TableRow
                  key={incident.id}
                  className="border-border/30 transition-colors hover:bg-muted/30"
                >
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {incident.code || incident.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="flex min-w-0 items-center gap-2 text-xs">
                      <Link
                        href={`/incidents/${incident.id}`}
                        className="block truncate font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                      >
                        {incident.title}
                      </Link>
                      {isReadOnly && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1" title="Read-only access">RO</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <User className="size-3" />
                      <span className="truncate">
                        {incident.reporterName || "System"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {incident.when
                      ? new Date(incident.when).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Belum diisi"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "h-5 border px-1.5 text-[10px] font-semibold",
                        severityVariant[incident.severity] ||
                          severityVariant.minor,
                      )}
                    >
                      {getSeverityLabel(incident.severity)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        "h-5 border px-1.5 text-[10px] font-medium",
                        statusVariant[incident.status] || statusVariant.draft,
                      )}
                    >
                      {getStatusLabel(incident.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    {incident.linkedRisks && incident.linkedRisks.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {incident.linkedRisks.map((risk) => (
                          <Link
                            key={`${incident.id}-${risk.id}`}
                            href={`/risk/register/${risk.id}`}
                            className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] text-primary hover:bg-primary/15"
                          >
                            <ShieldAlert className="size-3 shrink-0" />
                            <span className="truncate">{risk.code || risk.title}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Link2 className="size-3" />
                        Tidak ada risiko
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
