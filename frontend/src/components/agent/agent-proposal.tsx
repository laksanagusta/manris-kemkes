"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Loader2 } from "@/components/shared/icons";
import { agentDate, includedAgentOperations, safeAgentHref } from "@/lib/agent-helpers";
import { agentOperationLabels, agentOperationReviewValues, agentOperationValidationError } from "@/lib/agent-operation-validation";
import { agentFieldValueError } from "@/lib/agent-field-editor";
import { AgentOperationFields } from "./agent-operation-fields";
import type { AgentOperation, AgentProposal as Proposal } from "@/types/agent";

const kinds = agentOperationLabels;
const statuses: Record<Proposal["status"], string> = { proposed: "Perlu tinjauan", applying: "Sedang menerapkan", applied: "Diterapkan", rejected: "Ditolak", stale: "Perlu disusun ulang", failed: "Gagal diterapkan" };
interface Props { proposal: Proposal; busy?: boolean; disabled?: boolean; onApply?: (operations: AgentOperation[]) => Promise<void>; onReject?: () => Promise<void> }
export function AgentProposal({ proposal, busy, disabled, onApply, onReject }: Props) {
  const baseId = useId();
  const [included, setIncluded] = useState(() => Object.fromEntries(proposal.operations.map((item) => [item.id, item.included])));
  const [values, setValues] = useState(() => Object.fromEntries(proposal.operations.map((item) => [item.id, structuredClone(agentOperationReviewValues(item))])));
  const [error, setError] = useState("");
  const editable = proposal.status === "proposed" && !disabled && !busy;
  const count = proposal.operations.filter((item) => included[item.id]).length;
  const supported = proposal.operations.every((item) => kinds[item.kind]);
  const legacyReport = proposal.operations.some((item) => included[item.id] && item.kind === "report_mitigation_task" && Object.keys(item.after).some((key) => key !== "notes" && key !== "evidenceUrl"));
  const apply = async () => {
    setError("");
    try {
      const operations = proposal.operations.map((item) => ({ ...item, included: !!included[item.id], after: included[item.id] ? values[item.id] : item.after }));
      if (!includedAgentOperations(operations)) throw new Error("Pilih setidaknya satu perubahan untuk diterapkan.");
      for (const operation of operations) {
        const invalid = operation.included ? agentFieldValueError(operation.after, proposal.operations.find((item) => item.id === operation.id)?.after) ?? agentOperationValidationError(operation) : null;
        if (invalid) throw new Error(`${invalid} Periksa “${operation.title}”.`);
      }
      await onApply?.(operations);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan belum berhasil diterapkan."); }
  };
  return <section className="agent-proposal" aria-label={proposal.title} aria-busy={busy || proposal.status === "applying" || undefined}>
    <div className="agent-proposal-heading"><div><h3>{proposal.title}</h3></div><Badge variant="secondary">{statuses[proposal.status]}</Badge></div>
    {proposal.operations.map((item) => <div className="agent-operation" key={item.id} data-excluded={!included[item.id]}>
      <div className="flex items-start gap-3"><Checkbox id={`${baseId}-${item.id}`} checked={included[item.id]} disabled={!editable} onCheckedChange={(checked) => setIncluded((previous) => ({ ...previous, [item.id]: checked === true }))} aria-label={`Sertakan ${item.title}`} /><div className="min-w-0 flex-1"><label htmlFor={`${baseId}-${item.id}`} className="agent-operation-title">{item.title}</label><p className="text-xs text-muted-foreground">{kinds[item.kind] ?? "Operasi belum didukung"}</p>{item.reason && <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>}</div></div>
      <details className="agent-operation-details"><summary>Tinjau dan edit rincian</summary>
        <AgentOperationFields operation={item} baseId={baseId} values={values[item.id]} disabled={!editable || !included[item.id]} onChange={(key, value) => setValues((previous) => ({ ...previous, [item.id]: { ...previous[item.id], [key]: value } }))} />
      </details>
    </div>)}
    {proposal.status === "proposed" && <footer className="agent-proposal-footer">{legacyReport && <p className="text-destructive">Laporan ini memakai field lama. Minta Agent menyusun ulang dengan Catatan Pelaksanaan dan Link Bukti.</p>}{!supported && <p className="text-destructive">Paket berisi operasi yang belum dapat ditinjau pada versi aplikasi ini.</p>}<div className="flex flex-wrap items-center justify-end gap-2"><Button variant="outline" disabled={!editable || !onReject} onClick={async () => { setError(""); try { await onReject?.(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Paket belum berhasil ditolak."); } }}>Batal</Button><Button disabled={!editable || !count || !supported || legacyReport || !onApply} onClick={apply}>{busy && <Loader2 className="animate-spin" aria-hidden="true" />}Terapkan</Button></div></footer>}
    {proposal.status === "applied" && <div className="agent-receipt"><p className="flex items-center gap-2"><CheckCircle2 className="size-4" aria-hidden="true" />Perubahan berhasil diterapkan{proposal.appliedAt ? ` · ${agentDate(proposal.appliedAt)}` : ""}</p><ul>{(proposal.receipt ?? []).map((item) => <li key={item.operationId}>{safeAgentHref(item.href) ? <Link className="agent-source-link" href={safeAgentHref(item.href)!}>{item.title}</Link> : item.title}</li>)}</ul></div>}
    {proposal.status === "stale" && <p className="agent-proposal-notice">Kondisi atau instruksi telah berubah. Minta Agent menyusun paket baru, lalu tinjau kembali.</p>}
    {proposal.status === "rejected" && <p className="agent-proposal-notice">Paket ditolak. Tidak ada perubahan dari paket ini yang diterapkan.</p>}
    {proposal.status === "failed" && <p className="agent-proposal-notice">Penerapan gagal. Periksa hasil pekerjaan dan minta paket baru.</p>}
    {error && <p className="agent-proposal-notice text-destructive" role="alert">{error}</p>}
  </section>;
}
