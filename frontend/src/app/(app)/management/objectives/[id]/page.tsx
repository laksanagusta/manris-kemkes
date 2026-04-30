"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { createRiskObjective, deleteRiskObjective, getRiskObjective, updateRiskObjective } from "@/lib/api/risk-objectives";
import { listOrganizations } from "@/lib/api/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";

export default function RiskObjectiveDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const objectiveId = params?.id;
  const isNew = objectiveId === "new";
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    organizationId: "",
    period: "",
    tujuan: "",
    sasaran: "",
    indikatorKinerjaUtama: "",
    target: "",
    program: "",
    kegiatan: "",
    processBusiness: "",
  });

  useEffect(() => {
    if (!token) return;
    listOrganizations(token, { page: 1, limit: 100 }).then((res) => setOrgs(res.data ?? []));
  }, [token]);

  useEffect(() => {
    if (!token || !objectiveId || isNew) return;
    getRiskObjective(token, objectiveId).then((item) => {
      setForm({
        organizationId: item.organizationId,
        period: item.period,
        tujuan: item.tujuan,
        sasaran: item.sasaran,
        indikatorKinerjaUtama: item.indikatorKinerjaUtama,
        target: item.target,
        program: item.program,
        kegiatan: item.kegiatan,
        processBusiness: item.processBusiness,
      });
    });
  }, [isNew, objectiveId, token]);

  const title = useMemo(() => isNew ? "Tambah Sasaran & IKU" : "Detail Sasaran & IKU", [isNew]);

  async function handleSave() {
    if (!token) return;
    if (isNew) {
      const created = await createRiskObjective(token, form);
      router.replace(`/management/objectives/${created.id}`);
      return;
    }
    await updateRiskObjective(token, objectiveId, form);
  }

  async function handleDelete() {
    if (!token || isNew) return;
    await deleteRiskObjective(token, objectiveId);
    router.push("/management/objectives");
  }

  return (
    <FormPage>
      <FormHeader title={title} description="Simpan sasaran organisasi dan IKU sebagai basis identifikasi risiko." onBack={() => router.push("/management/objectives")} actions={<div className="flex gap-2"><Button variant="outline" onClick={handleDelete} disabled={isNew}>Hapus</Button><Button onClick={handleSave}>Simpan</Button></div>} />
      <FormSection title="Identitas Sasaran">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Organisasi</Label><select className="h-9 rounded-md border px-3 text-sm" value={form.organizationId} onChange={(e) => setForm((current) => ({ ...current, organizationId: e.target.value }))}><option value="">Pilih organisasi</option>{orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></div>
          <div className="space-y-1.5"><Label>Periode</Label><Input value={form.period} onChange={(e) => setForm((current) => ({ ...current, period: e.target.value }))} placeholder="2026-H1" /></div>
        </div>
        <div className="space-y-1.5"><Label>Tujuan</Label><Textarea value={form.tujuan} onChange={(e) => setForm((current) => ({ ...current, tujuan: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label>Sasaran</Label><Textarea value={form.sasaran} onChange={(e) => setForm((current) => ({ ...current, sasaran: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label>Indikator Kinerja Utama</Label><Textarea value={form.indikatorKinerjaUtama} onChange={(e) => setForm((current) => ({ ...current, indikatorKinerjaUtama: e.target.value }))} /></div>
      </FormSection>
      <FormSection title="Target & Program">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Target</Label><Textarea value={form.target} onChange={(e) => setForm((current) => ({ ...current, target: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Program</Label><Textarea value={form.program} onChange={(e) => setForm((current) => ({ ...current, program: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Kegiatan</Label><Textarea value={form.kegiatan} onChange={(e) => setForm((current) => ({ ...current, kegiatan: e.target.value }))} /></div>
          <div className="space-y-1.5"><Label>Proses Bisnis</Label><Textarea value={form.processBusiness} onChange={(e) => setForm((current) => ({ ...current, processBusiness: e.target.value }))} /></div>
        </div>
      </FormSection>
    </FormPage>
  );
}
