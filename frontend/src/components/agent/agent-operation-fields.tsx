"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { agentNumberBounds } from "@/lib/agent-field-editor";
import { agentFieldChoices } from "@/lib/agent-operation-validation";
import type { AgentOperation } from "@/types/agent";
import { useAuth } from "@/contexts/auth-context";
import { listUsers } from "@/lib/api/users";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import { MitigationProgressForm } from "@/components/shared/design-system/domain/mitigation-progress-form";

const fieldLabels: Record<string, string> = {
  observedProbability: "Kemungkinan teramati", observedImpact: "Dampak teramati", conclusion: "Kesimpulan pemantauan", mitigationProgressSummary: "Ringkasan progres mitigasi", mitigationCompletionPercent: "Persentase penyelesaian mitigasi", values: "Rincian profil yang diperbarui",
  title: "Judul", name: "Nama", description: "Deskripsi", status: "Status", notes: "Catatan", reason: "Alasan", category: "Kategori", organizationId: "Unit", event: "Peristiwa", cause: "Penyebab", impact: "Skor dampak", probability: "Kemungkinan", impactScore: "Skor dampak", action: "Rencana tindakan", pic: "Penanggung jawab", evidenceUrl: "Tautan bukti", reportOutput: "Hasil", reportObstacle: "Hambatan", mitigationId: "Referensi mitigasi", riskIds: "Risiko terkait", assigneeId: "Penanggung jawab", targetDate: "Tanggal target", dueDate: "Tenggat", occurredAt: "Waktu kejadian", riskStatement: "Pernyataan risiko", causes: "Penyebab", impacts: "Dampak", mitigations: "Mitigasi", cycle: "Periode penilaian", owner: "Penanggung jawab", ownerUserId: "Referensi penanggung jawab", riskSource: "Sumber risiko", controllability: "Kemampuan pengendalian", impactDesc: "Uraian dampak", existingControl: "Pengendalian yang ada", controlEffectiveness: "Efektivitas pengendalian", riskPriority: "Prioritas risiko", riskAppetite: "Selera risiko", treatmentOption: "Opsi penanganan", targetProbability: "Target kemungkinan", targetImpact: "Target dampak", nextReviewDate: "Tanggal tinjauan berikutnya", reviewScheduleText: "Jadwal tinjauan", assessmentCycle: "Periode penilaian", reviewType: "Jenis tinjauan", changeReason: "Alasan perubahan", reviewSummary: "Ringkasan tinjauan", frequency: "Frekuensi", recurringInterval: "Interval pelaporan", reportDay: "Hari pelaporan (0=Minggu, 6=Sabtu)", reportDate: "Tanggal pelaporan", executionScheduleText: "Jadwal pelaksanaan", targetCost: "Kebutuhan biaya", mitigationType: "Jenis mitigasi", activityStage: "Tahap kegiatan", expectedOutput: "Hasil yang diharapkan", quantitativeTarget: "Target kuantitatif", supportingUnit: "Unit pendukung", resourcesRequired: "Sumber daya", contingencyPlan: "Rencana kontingensi", potentialObstacle: "Potensi hambatan", isBreakthroughActivity: "Kegiatan terobosan", isExistingControl: "Pengendalian yang sudah ada", impactTypes: "Jenis dampak", otherImpactType: "Dampak lainnya", actualImpact: "Dampak aktual", severity: "Tingkat keparahan", immediateResponse: "Respons segera", postResponseCondition: "Kondisi setelah respons", location: "Lokasi", affectedParties: "Pihak terdampak", suspectedCause: "Dugaan penyebab", disruptionDuration: "Durasi gangguan", extraordinaryReason: "Alasan kejadian luar biasa", ongoingAction: "Tindakan yang berlangsung", financialLoss: "Kerugian keuangan", financialLossKnown: "Kerugian keuangan diketahui", sourceDocumentName: "Dokumen sumber", sourceRefs: "Referensi sumber", extractionKey: "Referensi ekstraksi", code: "Kode", updatedAt: "Terakhir diperbarui", id: "Referensi data", mitigation: "Rincian mitigasi",
};
const choices = agentFieldChoices;
export function agentFieldLabel(key: string): string { return fieldLabels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2"); }
export function AgentOperationFields({ operation, baseId, values, disabled, onChange }: {
  operation: AgentOperation; baseId: string; values: Record<string, unknown>; disabled: boolean;
  onChange: (key: string, value: unknown) => void;
}) {
  if (operation.kind === "report_mitigation_task") {
    return <fieldset disabled={disabled} className="min-w-0 border-0 p-0 pt-4">
      <legend className="sr-only">Laporan pelaksanaan mitigasi</legend>
      <MitigationProgressForm notes={String(values.notes ?? "")} evidenceUrl={String(values.evidenceUrl ?? "")}
        onNotesChange={(value) => onChange("notes", value)} onEvidenceUrlChange={(value) => onChange("evidenceUrl", value)}
        notesId={`${baseId}-${operation.id}-notes`} evidenceId={`${baseId}-${operation.id}-evidenceUrl`} />
    </fieldset>;
  }
  return <div className="space-y-4 pt-4">{Object.entries(values).filter(([key]) => !referenceFields.has(key)).map(([key, value]) => key === "owner" ?
    <AgentAssigneeField key={key} value={values} id={`${baseId}-${operation.id}-owner`} organizationId={operation.organizationId} disabled={disabled} onChange={(next) => { for (const [field, child] of Object.entries(next as Record<string, unknown>)) onChange(field, child); }} /> : <OperationField key={key} field={key} value={value} previous={operation.before?.[key]} original={operation.after[key]} id={`${baseId}-${operation.id}-${key}`}
      disabled={disabled} organizationId={operation.organizationId} preservePlans={operation.kind === "patch_monitoring"} onChange={(next) => onChange(key, next)} />
  )}</div>;
}

const referenceFields = new Set(["id", "mitigationId", "organizationId", "ownerUserId", "treatmentOwnerId", "externalPicId", "assigneeId", "extractionKey"]);
interface FieldProps {
  field: string; value: unknown; original?: unknown; previous?: unknown; id: string; disabled: boolean;
  organizationId?: string; preservePlans?: boolean; onChange: (value: unknown) => void;
}
function OperationField({ field, value, original, previous, id, disabled, organizationId, preservePlans, onChange }: FieldProps) {
  const label = agentFieldLabel(field);
  if (Array.isArray(value)) return <OperationList field={field} value={value} id={id} disabled={disabled} organizationId={organizationId} preservePlans={preservePlans} onChange={onChange} />;
  if (value !== null && typeof value === "object") {
    return <fieldset disabled={disabled} className="min-w-0 space-y-4 border-0 p-0"><legend className="mb-3 text-sm font-medium">{label}</legend>
      {Object.entries(value).filter(([key]) => !referenceFields.has(key)).map(([key, child]) => key === "owner" ?
        <AgentAssigneeField key={key} value={value as Record<string, unknown>} id={`${id}-owner`} organizationId={organizationId} disabled={disabled} onChange={onChange} /> : <OperationField key={key} field={key} value={child} id={`${id}-${key}`} disabled={disabled} organizationId={organizationId} preservePlans={preservePlans}
          onChange={(next) => onChange({ ...value, [key]: next })} />)}
    </fieldset>;
  }
  const options = typeof value === "boolean" ? [["true", "Ya"], ["false", "Tidak"]] : choices[field];
  const bounds = agentNumberBounds[field];
  const numeric = typeof original === "number" || typeof value === "number" || !!bounds;
  const previousText = previous === null ? "—" : typeof previous === "string" || typeof previous === "number" ? String(previous) : typeof previous === "boolean" ? previous ? "Ya" : "Tidak" : undefined;
  const multiline = /description|notes|action|reason|statement|summary|control|response|quote|provision/i.test(field) || String(value ?? "").length > 100;
  return <div className="space-y-1.5"><label htmlFor={id} className="text-xs text-muted-foreground">{label}</label>
    {previousText !== undefined && <p className="whitespace-pre-wrap break-words text-xs text-tertiary-foreground">Sebelumnya: {previousText || "—"}</p>}
    {options ? <Select value={String(value ?? "")} disabled={disabled} onValueChange={(next) => onChange(typeof value === "boolean" ? next === "true" : next)}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent>
        {!!value && !options.some(([key]) => key === String(value)) && <SelectItem value={String(value)}>{String(value)}</SelectItem>}
        {options.map(([key, text]) => <SelectItem key={key} value={key}>{text}</SelectItem>)}
      </SelectContent></Select> : multiline ? <Textarea id={id} value={String(value ?? "")} disabled={disabled} rows={3} onChange={(event) => onChange(event.target.value)} /> :
      <Input id={id} type={numeric ? "number" : field === "dueDate" || field === "nextReviewDate" ? "date" : "text"}
        min={bounds?.min} max={bounds && Number.isFinite(bounds.max) ? bounds.max : undefined} step={bounds?.integer ? 1 : numeric ? "any" : undefined} value={String(value ?? "")} disabled={disabled}
        onChange={(event) => onChange(numeric && event.target.value !== "" ? event.target.valueAsNumber : event.target.value)} />}
  </div>;
}


function OperationList({ field, value, id, disabled, organizationId, preservePlans, onChange }: Omit<FieldProps, "value"> & { value: unknown[] }) {
  const [keys, setKeys] = useState(() => value.map((_, index) => `${id}-initial-${index}`));
  const root = useRef<HTMLFieldSetElement>(null);
  const label = agentFieldLabel(field);
  const add = () => {
    const next = field === "mitigations" ? { action: "", owner: "", frequency: "insidental", mitigationType: "reduce_probability", dueDate: "" }
      : field === "sourceRefs" ? { quote: "", location: "" } : "";
    setKeys((previous) => [...previous, crypto.randomUUID()]); onChange([...value, next]);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-row-index="${value.length}"] input, [data-row-index="${value.length}"] textarea`)?.focus());
  };
  const remove = (index: number) => {
    setKeys((previous) => previous.filter((_, i) => i !== index)); onChange(value.filter((_, i) => i !== index));
    requestAnimationFrame(() => {
      const row = root.current?.querySelector<HTMLElement>(`[data-row-index="${Math.min(index, value.length - 2)}"]`);
      (row?.querySelector<HTMLElement>("input,textarea,button") ?? root.current?.querySelector<HTMLElement>("[data-add-row]"))?.focus();
    });
  };
  return <fieldset ref={root} disabled={disabled} className="min-w-0 space-y-4 border-0 p-0"><legend className="mb-3 text-sm font-medium">{label}</legend>
    {value.map((item, index) => {
      const storedPlan = preservePlans && field === "mitigations" && !!item && typeof item === "object" && "id" in item && !!item.id && item.id !== "00000000-0000-0000-0000-000000000000";
      return <div key={keys[index]} data-row-index={index} className="space-y-3">
        <OperationField field={field === "mitigations" ? `Mitigasi ${index + 1}` : `${label} ${index + 1}`} value={item} id={`${id}-${keys[index]}`} disabled={disabled} organizationId={organizationId} preservePlans={preservePlans}
          onChange={(next) => onChange(value.map((entry, i) => i === index ? next : entry))} />
        {!storedPlan && <Button type="button" variant="ghost" size="sm" disabled={disabled} aria-label={`Hapus ${label} ${index + 1}`} onClick={() => remove(index)}>Hapus</Button>}
      </div>;
    })}
    <Button type="button" variant="outline" size="sm" data-add-row disabled={disabled || value.length >= 100} onClick={add}>Tambah {label.toLowerCase()}</Button>
  </fieldset>;
}

function AgentAssigneeField({ value, id, disabled, organizationId, onChange }: {
  value: Record<string, unknown>; id: string; disabled: boolean; organizationId?: string; onChange: (value: unknown) => void;
}) {
  const { token } = useAuth();
  const loadOptions = useCallback(async ({ q, page, limit }: { q: string; page: number; limit: number }) => {
    if (!token) return { options: [], total: 0, page, limit };
    const users = await listUsers(token, { q, page, limit, organizationId, status: "active" });
    return { ...users, options: users.data.map((user) => ({ id: user.id, name: user.name })) };
  }, [token, organizationId]);
  const ownerId = typeof value.ownerUserId === "string" ? value.ownerUserId : undefined;
  if (!token) return <div className="space-y-1.5"><label htmlFor={id} className="text-xs text-muted-foreground">Penanggung jawab</label><Input id={id} value={String(value.owner ?? "")} disabled={disabled || !!ownerId} onChange={(event) => onChange({ ...value, owner: event.target.value })} /></div>;
  return <div className="space-y-1.5"><p className="text-xs text-muted-foreground">Penanggung jawab</p><RemoteUserPicker
    title="Pilih PIC" description="Pilih penanggung jawab mitigasi dari organisasi tujuan." placeholder="Pilih PIC" emptyMessage="Tidak ada pengguna ditemukan."
    disabled={disabled} presentation="assignee" value={ownerId ? { id: ownerId, name: String(value.owner ?? "") } : null}
    loadOptions={loadOptions} onSelect={(option) => onChange({ ...value, owner: option.name, ownerUserId: option.id })} /></div>;
}
