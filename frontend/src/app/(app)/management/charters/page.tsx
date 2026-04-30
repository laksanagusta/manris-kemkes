"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listRiskCharters } from "@/lib/api/risk-charters";
import { listOrganizations } from "@/lib/api/organizations";
import type { RiskCharter } from "@/types/risk-charter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RiskChartersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<RiskCharter[]>([]);
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!token) return;
    listOrganizations(token, { page: 1, limit: 100 }).then((res) => setOrgs(res.data ?? []));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    listRiskCharters(token, { period, status, organizationId, page: 1, limit: 100 }).then((res) => setItems(res.data ?? []));
  }, [organizationId, period, status, token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Piagam MR</h1>
          <p className="text-sm text-muted-foreground">Kelola konteks dan piagam penerapan manajemen risiko.</p>
        </div>
        <Button asChild>
          <Link href="/management/charters/new">Buat Piagam</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input placeholder="Periode, contoh 2026-H1" value={period} onChange={(event) => setPeriod(event.target.value)} />
          <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
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
              <Link key={item.id} href={`/management/charters/${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40">
                <div>
                  <p className="font-medium">{item.riskOwnerName}</p>
                  <p className="text-sm text-muted-foreground">{item.period} · {item.uprLevel} · {item.status}</p>
                </div>
                <span className="text-sm text-muted-foreground">Buka</span>
              </Link>
            ))}
            {items.length === 0 ? <div className="px-4 py-6 text-sm text-muted-foreground">Belum ada piagam.</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
