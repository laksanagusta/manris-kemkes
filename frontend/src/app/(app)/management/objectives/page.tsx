"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listRiskObjectives } from "@/lib/api/risk-objectives";
import { listOrganizations } from "@/lib/api/organizations";
import type { RiskObjective } from "@/types/risk-objective";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RiskObjectivesPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<RiskObjective[]>([]);
  const [q, setQ] = useState("");
  const [period, setPeriod] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!token) return;
    listOrganizations(token, { page: 1, limit: 100 }).then((res) => setOrgs(res.data ?? []));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    listRiskObjectives(token, { q, period, organizationId, page: 1, limit: 100 }).then((res) => setItems(res.data ?? []));
  }, [organizationId, period, q, token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sasaran & IKU</h1>
          <p className="text-sm text-muted-foreground">Kelola sasaran organisasi, IKU, target, program, dan kegiatan.</p>
        </div>
        <Button asChild>
          <Link href="/management/objectives/new">Tambah Sasaran</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filter</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input placeholder="Cari sasaran / IKU / program" value={q} onChange={(event) => setQ(event.target.value)} />
          <Input placeholder="Periode, contoh 2026-H1" value={period} onChange={(event) => setPeriod(event.target.value)} />
          <Select value={organizationId || "all"} onValueChange={(value) => setOrganizationId(value === "all" ? "" : value)}>
            <SelectTrigger><SelectValue placeholder="Organisasi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua organisasi</SelectItem>
              {orgs.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {items.map((item) => (
              <Link key={item.id} href={`/management/objectives/${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40">
                <div>
                  <p className="font-medium">{item.sasaran}</p>
                  <p className="text-sm text-muted-foreground">{item.indikatorKinerjaUtama}</p>
                  <p className="text-xs text-muted-foreground">{item.program || "Tanpa program"} · {item.kegiatan || "Tanpa kegiatan"}</p>
                </div>
                <span className="text-sm text-muted-foreground">Buka</span>
              </Link>
            ))}
            {items.length === 0 ? <div className="px-4 py-6 text-sm text-muted-foreground">Belum ada sasaran / IKU.</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
