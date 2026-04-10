"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";

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
import {
  ShieldCheck,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  XCircle,
  Calendar,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ControlsPage() {
  const { token, user } = useAuth();
  const [controls, setControls] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    api.get<any[]>("/controls", token)
      .then(data => {
        setControls(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch controls:", err);
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Control Library</h1>
          <p className="text-sm text-muted-foreground">
            Pustaka pengendalian risiko dan pencatatan hasil testing
          </p>
        </div>
        {(!user?.isGlobal && !user?.organizationId) ? null : (
          <Link href="/compliance/controls/new">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="size-4" />
              Tambah Kontrol
            </Button>
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari kontrol..." className="h-8 pl-8 text-xs bg-card border-border/50" />
      </div>

      {/* Control Cards */}
      <div className="space-y-3">
        {loading ? (
           <div className="py-10 text-center text-sm text-muted-foreground">Memuat data control library...</div>
        ) : controls.length === 0 ? (
           <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada control library yang ditemukan.</div>
        ) : controls.map((control) => {
          const isExpanded = expandedId === control.id;
          const lastTest = control.tests?.[0];
          const effectiveCount = control.tests ? control.tests.filter((t: any) => t.result === "Efektif").length : 0;

          return (
            <Card key={control.id} className="border-border/50 bg-card/80 transition-all">
              <CardContent className="p-0">
                {/* Main row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : control.id)}
                  className="flex items-center gap-4 w-full text-left p-4 hover:bg-muted/30 transition-colors rounded-t-lg"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {control.id.substring(0,8)}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                        {control.frequency}
                      </Badge>
                      {isReadOnlyForOrg(user, control.organizationId) && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                          RO
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold">{control.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{control.description}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {control.owner}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] h-4 px-1.5",
                        control.effectiveness === "efektif"
                          ? "text-success border-success/20"
                          : "text-risk-extreme border-risk-extreme/20"
                      )}
                    >
                      {control.effectiveness}
                    </Badge>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform shrink-0",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* Expanded: Testing records */}
                {isExpanded && (
                  <div className="border-t border-border/30 px-4 pb-4">
                    <div className="flex items-center justify-between py-3">
                      <h4 className="text-xs font-semibold">Testing Records</h4>
                      {!isReadOnlyForOrg(user, control.organizationId) && (
                        <Button variant="outline" size="xs" className="text-[10px] h-6 gap-1">
                          <Plus className="size-2.5" />
                          Tambah Testing
                        </Button>
                      )}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/30 hover:bg-transparent">
                          <TableHead className="text-[10px] w-28">Tanggal</TableHead>
                          <TableHead className="text-[10px]">Tester</TableHead>
                          <TableHead className="text-[10px] w-28">Hasil</TableHead>
                          <TableHead className="text-[10px]">Temuan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {control.tests && control.tests.length > 0 ? control.tests.map((test: any, i: number) => (
                           <TableRow key={i} className="border-border/20">
                             {/* render test rows */}
                             <TableCell className="text-[11px] text-muted-foreground">
                               <span className="flex items-center gap-1">
                                 <Calendar className="size-3" />
                                 {test.date}
                               </span>
                             </TableCell>
                             <TableCell className="text-[11px]">{test.tester}</TableCell>
                             {/* ... */}
                           </TableRow>
                        )) : (
                           <TableRow>
                             <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                               Belum ada testing record untuk control ini.
                             </TableCell>
                           </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
