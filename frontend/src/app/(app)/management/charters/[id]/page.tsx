"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createRiskCharter, getRiskCharter, updateRiskCharter } from "@/lib/api/risk-charters";
import { listOrganizations } from "@/lib/api/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";

const EMPTY_STRUCTURE = JSON.stringify([{ title: "Ketua UPR", name: "" }], null, 2);

export default function RiskCharterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const charterId = params?.id;
  const isNew = charterId === "new";
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    organizationId: "",
    uprLevel: "upr_t1",
    period: "",
    riskOwnerName: "",
    riskTeamName: "",
    scope: "",
    legalBasis: "",
    internalContext: "",
    externalContext: "",
    stakeholderSummary: "",
    uprStructure: EMPTY_STRUCTURE,
    status: "draft",
  });

  useEffect(() => {
    if (!token) return;
    listOrganizations(token, { page: 1, limit: 100 }).then((res) => setOrgs(res.data ?? []));
  }, [token]);

  useEffect(() => {
    if (!token || !charterId || isNew) return;
    getRiskCharter(token, charterId).then((charter) => {
      setForm({
        organizationId: charter.organizationId,
        uprLevel: charter.uprLevel,
        period: charter.period,
        riskOwnerName: charter.riskOwnerName,
        riskTeamName: charter.riskTeamName,
        scope: charter.scope,
        legalBasis: charter.legalBasis,
        internalContext: charter.internalContext,
        externalContext: charter.externalContext,
        stakeholderSummary: charter.stakeholderSummary,
        uprStructure: JSON.stringify(charter.uprStructure ?? [], null, 2),
        status: charter.status,
      });
    });
  }, [charterId, isNew, token]);

  const title = useMemo(() => isNew ? "Buat Piagam MR" : "Detail Piagam MR", [isNew]);

  async function handleSave() {
    if (!token) return;
    const payload = {
      ...form,
      uprStructure: JSON.parse(form.uprStructure || "[]"),
    };
    if (isNew) {
      const created = await createRiskCharter(token, payload);
      router.replace(`/management/charters/${created.id}`);
      return;
    }
    await updateRiskCharter(token, charterId, payload);
  }

  return (
    <FormPage>
      <FormHeader title={title} description="Dokumentasikan konteks dan struktur UPR sesuai KMK." onBack={() => router.push("/management/charters")} actions={<Button onClick={handleSave}>Simpan</Button>} />
      <FormSection title="Identitas Piagam">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5"><Label>Organisasi</Label><select className="h-9 rounded-md border px-3 text-sm" value={form.organizationId} onChange={(e) => setForm((current) => ({ ...current, organizationId: e.target.value }))}><option value="">Pilih organisasi</option>{orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
          <div className="space-y-1.5"><Label>UPR Level</Label><select className="h-9 rounded-md border px-3 text-sm" value={form.uprLevel} onChange={(e) => setForm((current) => ({ ...current, uprLevel: e.target.value }))}><option value="eksekutif">Eksekutif</option><option value="upr_t1">UPR T.I</option><option value="upr_t2">UPR T.II</option></select></div>
          <div className="space-y-1.5"><Label>Periode</Label><Input value={form.period} onChange={(e) => setForm((current) => ({ ...current, period: e.target.value }))} placeholder="2026-H1" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Nama Pemilik Risiko</Label><Input value={form.riskOwnerName} onChange={(e) => setForm((current) => ({ ...current, riskOwnerName: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Nama Tim Pengelola Risiko</Label><Input value={form.riskTeamName} onChange={(e) => setForm((current) => ({ ...current, riskTeamName: e.target.value }))} /></div>
        </div>
      </FormSection>
      <FormSection title="Konteks & Ruang Lingkup">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Ruang Lingkup</Label><Textarea value={form.scope} onChange={(e) => setForm((current) => ({ ...current, scope: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Dasar Hukum</Label><Textarea value={form.legalBasis} onChange={(e) => setForm((current) => ({ ...current, legalBasis: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Konteks Internal</Label><Textarea value={form.internalContext} onChange={(e) => setForm((current) => ({ ...current, internalContext: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Konteks Eksternal</Label><Textarea value={form.externalContext} onChange={(e) => setForm((current) => ({ ...current, externalContext: e.target.value }))} /></div>
        </div>
      </FormSection>
      <FormSection title="Stakeholder & Struktur UPR">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Ringkasan Stakeholder</Label><Textarea value={form.stakeholderSummary} onChange={(e) => setForm((current) => ({ ...current, stakeholderSummary: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Struktur UPR (JSON)</Label><Textarea value={form.uprStructure} onChange={(e) => setForm((current) => ({ ...current, uprStructure: e.target.value }))} className="min-h-48 font-mono text-xs" /></div>
        </div>
      </FormSection>
    </FormPage>
  );
}
