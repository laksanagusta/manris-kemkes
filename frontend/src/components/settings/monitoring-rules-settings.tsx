"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { createMonitoringRule, listMonitoringRules, type CreateMonitoringRuleInput, type MonitoringRule, type MonitoringRuleFrequency } from "@/lib/api/monitoring-rules";
import { createMonitoringRulePeriods, monitoringRuleFrequencyLabels, validateMonitoringRuleInput } from "@/lib/monitoring-rule-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export interface MonitoringRulesPanelProps {
  rules: MonitoringRule[];
  loading: boolean;
  error: string;
  pending: boolean;
  onRetry: () => void;
  onCreate: (input: CreateMonitoringRuleInput) => Promise<boolean>;
}

/** The production settings form also supplies the design-system specimen. */
export function MonitoringRulesPanel({ rules, loading, error, pending, onRetry, onCreate }: MonitoringRulesPanelProps) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(() => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date()));
  const [frequency, setFrequency] = useState<MonitoringRuleFrequency>("quarterly");
  const [periods, setPeriods] = useState(() => createMonitoringRulePeriods(Number(year), "quarterly"));
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState("");
  const submitting = useRef(false);

  function changeYear(value: string) {
    setYear(value);
    const nextYear = Number(value);
    if (Number.isInteger(nextYear) && nextYear >= 1900 && nextYear <= 9998) setPeriods(createMonitoringRulePeriods(nextYear, frequency));
  }

  function changeFrequency(value: MonitoringRuleFrequency) {
    setFrequency(value);
    setPeriods(createMonitoringRulePeriods(Number(year) || new Date().getFullYear(), value));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitting.current) return;
    const input: CreateMonitoringRuleInput = { name: name.trim(), year: Number(year), frequency, active, periods };
    const validation = validateMonitoringRuleInput(input);
    setFormError(validation ?? "");
    if (validation) return;
    submitting.current = true;
    try {
      if (await onCreate(input)) {
        setName("");
        setFormError("");
      }
    } finally {
      submitting.current = false;
    }
  }

  return <div className="space-y-6">
    <Card>
      <CardHeader><CardTitle className="text-balance">Buat aturan periode</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={pending} className="space-y-5">
            <Field><FieldLabel htmlFor="monitoring-rule-name">Nama aturan</FieldLabel><Input id="monitoring-rule-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Pemantauan kuartalan 2027" required /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field><FieldLabel htmlFor="monitoring-rule-year">Tahun profil</FieldLabel><Input id="monitoring-rule-year" type="number" min={1900} max={9998} step={1} value={year} onChange={(event) => changeYear(event.target.value)} required className="tabular-nums" /></Field>
              <Field><FieldLabel htmlFor="monitoring-rule-frequency">Frekuensi</FieldLabel><Select value={frequency} onValueChange={(value) => changeFrequency(value as MonitoringRuleFrequency)} disabled={pending}><SelectTrigger id="monitoring-rule-frequency"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(monitoringRuleFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            </div>
            <p className="text-pretty text-xs text-muted-foreground">Mengubah tahun atau frekuensi mengisi ulang tanggal sesuai kalender. Sesuaikan jadwal di bawah ini; tanggal dapat berlanjut ke tahun berikutnya.</p>
            <fieldset className="space-y-4">
              <legend className="mb-2 text-sm font-medium">Jadwal periode</legend>
              <p id="monitoring-rule-date-help" className="text-pretty text-xs text-muted-foreground">Tanggal buka dan tutup termasuk dalam periode, mengikuti waktu Jakarta (WIB). Jadwal harus berurutan dan tidak tumpang tindih.</p>
              {periods.map((period, index) => <fieldset key={period.ordinal} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)]">
                <legend className="sr-only">{period.label}</legend>
                <div className="text-sm font-medium sm:pt-7" aria-hidden="true">{period.label}</div>
                <Field><FieldLabel htmlFor={`monitoring-rule-open-${index}`}>Tanggal buka</FieldLabel><Input id={`monitoring-rule-open-${index}`} type="date" aria-label={`Tanggal buka ${period.label}`} aria-describedby="monitoring-rule-date-help" min={`${year}-01-01`} max={`${Number(year) + 1}-12-31`} value={period.opensOn} onChange={(event) => setPeriods((current) => current.map((item, position) => position === index ? { ...item, opensOn: event.target.value } : item))} required className="tabular-nums" /></Field>
                <Field><FieldLabel htmlFor={`monitoring-rule-close-${index}`}>Tanggal tutup</FieldLabel><Input id={`monitoring-rule-close-${index}`} type="date" aria-label={`Tanggal tutup ${period.label}`} aria-describedby="monitoring-rule-date-help" min={period.opensOn || `${year}-01-01`} max={`${Number(year) + 1}-12-31`} value={period.closesOn} onChange={(event) => setPeriods((current) => current.map((item, position) => position === index ? { ...item, closesOn: event.target.value } : item))} required className="tabular-nums" /></Field>
              </fieldset>)}
            </fieldset>
            <div className="flex items-center gap-2"><Checkbox id="monitoring-rule-active" checked={active} onCheckedChange={(checked) => setActive(checked === true)} /><FieldLabel htmlFor="monitoring-rule-active">Aktif untuk dipilih pada profil risiko</FieldLabel></div>
          </fieldset>
          {formError && <Alert variant="destructive" role="alert"><AlertDescription>{formError}</AlertDescription></Alert>}
          <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Menyimpan aturan…" : "Simpan aturan"}</Button></div>
        </form>
      </CardContent>
    </Card>
    {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription><div className="mt-2"><Button variant="outline" onClick={onRetry} disabled={loading || pending}>Muat ulang aturan</Button></div></Alert>}
    <section aria-labelledby="monitoring-rules-list-title" className="space-y-3">
      <h3 id="monitoring-rules-list-title" className="text-balance text-sm font-medium">Aturan tersimpan</h3>
      {loading ? <div role="status" aria-label="Memuat aturan periode" className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : !rules.length ? !error && <p className="text-pretty text-sm text-muted-foreground">Belum ada aturan. Isi formulir di atas untuk membuat aturan pertama.</p> : <Card><CardContent className="divide-y divide-border">{rules.map((rule) => <details key={rule.id} className="py-3 first:pt-0 last:pb-0">
        <summary className="cursor-pointer rounded-sm text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"><span className="font-medium">{rule.name}</span><span className="ml-2 inline-flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="tabular-nums">{rule.year} · {monitoringRuleFrequencyLabels[rule.frequency]}</span><Badge variant="secondary">{rule.active ? "Aktif" : "Tidak aktif"}</Badge></span></summary>
        <dl className="mt-3 space-y-2 text-xs tabular-nums">{rule.periods.map((period) => <div key={period.id} className="flex flex-wrap justify-between gap-2"><dt>{period.label}</dt><dd className="text-muted-foreground"><time dateTime={period.opensOn}>{period.opensOn}</time> – <time dateTime={period.closesOn}>{period.closesOn}</time></dd></div>)}</dl>
      </details>)}</CardContent></Card>}
    </section>
  </div>;
}

function AuthenticatedMonitoringRulesSettings({ token }: { token: string }) {
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const creating = useRef(false);
  const requestVersion = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const version = ++requestVersion.current;
    listMonitoringRules(token, controller.signal, true).then((items) => {
      if (version === requestVersion.current && !controller.signal.aborted) { setRules(items); setError(""); }
    }).catch((err: unknown) => {
      if (version === requestVersion.current && !controller.signal.aborted) setError(err instanceof Error ? err.message : "Gagal memuat aturan periode.");
    }).finally(() => {
      if (version === requestVersion.current && !controller.signal.aborted) setLoading(false);
    });
    return () => { controller.abort(); };
  }, [token, revision]);

  async function create(input: CreateMonitoringRuleInput): Promise<boolean> {
    if (creating.current) return false;
    creating.current = true;
    setPending(true);
    try {
      const result = await createMonitoringRule(token, input);
      if (!mounted.current) return false;
      ++requestVersion.current;
      setLoading(true);
      setRules((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setRevision((value) => value + 1);
      setError("");
      toast.success("Aturan periode disimpan.");
      return true;
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Gagal menyimpan aturan periode. Isian Anda tetap tersimpan di formulir.");
      return false;
    } finally {
      creating.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return <MonitoringRulesPanel rules={rules} loading={loading} error={error} pending={pending} onRetry={() => { setLoading(true); setRevision((value) => value + 1); }} onCreate={create} />;
}

export function MonitoringRulesSettings() {
  const { user, token } = useAuth();
  if (user?.role !== "superadmin" || !token) return null;
  return <AuthenticatedMonitoringRulesSettings key={`${user.id}:${token}`} token={token} />;
}
