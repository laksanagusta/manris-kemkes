"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  CollectionPageHeader,
  CollectionToolbar,
  PageStack,
} from "@/components/shared/design-system";

export default function ControlsPage() {
  const { token, user } = useAuth();
  const [controls, setControls] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredControls = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return controls;
    return controls.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.owner?.toLowerCase().includes(q),
    );
  }, [controls, deferredSearch]);

  useEffect(() => {
    if (!token) return;

    api.get<any[]>("/controls", token)
      .then(data => {
        const sorted = [...(data || [])].sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime());
        setControls(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch controls:", err);
        setLoading(false);
      });
  }, [token]);

  return (
    <PageStack>
      <CollectionPageHeader title="Control Library" />

      <CollectionToolbar
        className="w-full"
        leading={
          <div className="relative min-w-0 w-full sm:w-80 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari kontrol..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 bg-card pl-8 text-xs"
            />
          </div>
        }
        actions={
          (!user?.isGlobal && !user?.organizationId) ? null : (
            <Button asChild className="w-full gap-2 sm:w-auto">
              <Link href="/compliance/controls/new">
                <Plus className="size-4" />
                Tambah Kontrol
              </Link>
            </Button>
          )
        }
      />

      {/* Control Cards */}
      <div className="space-y-3">
        {loading ? (
           <div className="py-10 text-center text-sm text-muted-foreground">Memuat data control library...</div>
        ) : filteredControls.length === 0 ? (
           <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada control library yang ditemukan.</div>
        ) : filteredControls.map((control) => {
          const isExpanded = expandedId === control.id;
          const lastTest = control.tests?.[0];
          const effectiveCount = control.tests ? control.tests.filter((t: any) => t.result === "Efektif").length : 0;

          return (
            <Card key={control.id} className="bg-card/80 transition-all">
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
                           <TableHead className="text-[10px] w-28 whitespace-nowrap">Tanggal</TableHead>
                           <TableHead className="text-[10px] whitespace-nowrap">Tester</TableHead>
                           <TableHead className="text-[10px] w-28 whitespace-nowrap">Hasil</TableHead>
                           <TableHead className="text-[10px] whitespace-nowrap">Temuan</TableHead>
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
                             <TableCell colSpan={4} className="h-24">
                               <div className="flex flex-col gap-1 text-left">
                                 <p className="text-sm font-medium text-muted-foreground">Belum ada testing record untuk control ini</p>
                                 <p className="text-xs text-muted-foreground/70">Tambahkan testing record baru untuk memulai pemantauan</p>
                               </div>
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
    </PageStack>
  );
}
