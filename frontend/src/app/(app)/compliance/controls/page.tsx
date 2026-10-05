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
  ChevronRight,
  ChevronDown,
  XCircle,
  Calendar,
  User,
} from "@/components/shared/icons";
import {
  CollectionPageHeader,
  CollectionToolbar,
  CollectionEmptyState,
  CollectionSearchField,
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

      <div className="space-y-4">
      <CollectionToolbar
        className="w-full"
        leading={
          <CollectionSearchField
            containerClassName="sm:w-80 sm:flex-none"
            aria-label="Cari kontrol"
            placeholder="Cari kontrol..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
        actions={
          (!user?.isGlobal && !user?.organizationId) ? null : (
            <Button asChild size="default" className="w-full sm:w-auto">
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
           <div className="rounded-lg bg-state-surface px-4 py-10 text-center text-sm text-state-foreground">Memuat data control library...</div>
        ) : filteredControls.length === 0 ? (
           <CollectionEmptyState
             title="Tidak ada control library yang ditemukan."
             description="Coba ubah kata kunci pencarian."
           />
        ) : filteredControls.map((control) => {
          const isExpanded = expandedId === control.id;
          const lastTest = control.tests?.[0];
          const effectiveCount = control.tests ? control.tests.filter((t: any) => t.result === "Efektif").length : 0;

          return (
            <Card key={control.id} className="transition-[background-color,border-color,box-shadow]">
              <CardContent className="">
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
                      <Badge variant="outline" className="">
                        {control.frequency}
                      </Badge>
                      {isReadOnlyForOrg(user, control.organizationId) && (
                        <Badge variant="secondary" className="">
                          RO
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold">{control.name}</h3>
                    <p className="mt-0.5 text-[11px] text-secondary-foreground">{control.description}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-[11px] text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {control.owner}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "",
                        control.effectiveness === "efektif"
                          ? ""
                          : ""
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
                        <Button variant="outline" size="xs" className="">
                          <Plus className="size-2.5" />
                          Tambah Testing
                        </Button>
                      )}
                    </div>
                     <Table>
                       <TableHeader>
                         <TableRow className="hover:bg-transparent">
                           <TableHead className="w-28 whitespace-nowrap">Tanggal</TableHead>
                           <TableHead className="whitespace-nowrap">Tester</TableHead>
                           <TableHead className="w-28 whitespace-nowrap">Hasil</TableHead>
                           <TableHead className="whitespace-nowrap">Temuan</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                        {control.tests && control.tests.length > 0 ? control.tests.map((test: any, i: number) => (
                           <TableRow key={i} className="">
                             {/* render test rows */}
                             <TableCell className="">
                               <span className="flex items-center gap-1">
                                 <Calendar className="size-3" />
                                 {test.date}
                               </span>
                             </TableCell>
                             <TableCell className="">{test.tester}</TableCell>
                             {/* ... */}
                           </TableRow>
                        )) : (
                           <TableRow>
                             <TableCell colSpan={4} className="h-24">
                               <CollectionEmptyState
                                 title="Belum ada testing record untuk control ini"
                                 description="Tambahkan testing record baru untuk memulai pemantauan."
                               />
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
    </PageStack>
  );
}
