"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { createMonitoringRule, deleteMonitoringRule, updateMonitoringRule, listMonitoringRules, type CreateMonitoringRuleInput, type MonitoringRule, type MonitoringRuleFrequency } from "@/lib/api/monitoring-rules";
import { createMonitoringRulePeriods, monitoringRuleFrequencyLabels, validateMonitoringRuleInput } from "@/lib/monitoring-rule-form";
import { AlertCircle } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export interface MonitoringRulesPanelProps {
  headerAction: HTMLDivElement | null;
  rules: MonitoringRule[];
  loading: boolean;
  error: string;
  pending: boolean;
  onRetry: () => void;
  onCreate: (input: CreateMonitoringRuleInput) => Promise<boolean>;
  onUpdate: (id: string, input: CreateMonitoringRuleInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

/** The production settings form also supplies the design-system specimen. */
export function MonitoringRulesPanel({ headerAction, rules, loading, error, pending, onRetry, onCreate, onUpdate, onDelete }: MonitoringRulesPanelProps) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(() => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date()));
  const [frequency, setFrequency] = useState<MonitoringRuleFrequency>("quarterly");
  const [periods, setPeriods] = useState(() => createMonitoringRulePeriods(Number(year), "quarterly"));
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState("");
  const submitting = useRef(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringRule | null>(null);
  const [deleting, setDeleting] = useState<MonitoringRule | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const conflict = rules.find((rule) => rule.active && rule.year === Number(year) && rule.id !== editing?.id);

  function edit(rule: MonitoringRule, trigger: HTMLButtonElement) {
    returnFocusRef.current = trigger;
    setEditing(rule);
    setName(rule.name);
    setYear(String(rule.year));
    setFrequency(rule.frequency);
    setPeriods(rule.periods.map((period) => ({ ...period })));
    setActive(rule.active);
    setFormError("");
    setFormOpen(true);
  }

  function reset() {
    const currentYear = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
    setEditing(null);
    setName("");
    setYear(currentYear);
    setFrequency("quarterly");
    setActive(true);
    setPeriods(createMonitoringRulePeriods(Number(currentYear), "quarterly"));
    setFormError("");
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    const trigger = returnFocusRef.current;
    if (trigger?.isConnected) trigger.focus();
    else createButtonRef.current?.focus();
  }

  async function confirmDelete() {
    if (!deleting || pending || submitting.current) return;
    submitting.current = true;
    try {
      if (await onDelete(deleting.id)) {
        setDeleting(null);
      }
    } finally { submitting.current = false; }
  }

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
    if (input.active && conflict) {
      toast.error(`Tahun ${year} sudah memiliki aturan aktif: ${conflict.name}. Nonaktifkan aturan tersebut terlebih dahulu atau simpan aturan ini sebagai tidak aktif.`);
      return;
    }
    submitting.current = true;
    try {
      if (await (editing ? onUpdate(editing.id, input) : onCreate(input))) {
        setFormOpen(false);
      }
    } finally {
      submitting.current = false;
    }
  }

  return <div className="space-y-6">
    <Dialog open={formOpen} onOpenChange={(open) => { if (!pending) setFormOpen(open); }}>
      {headerAction && createPortal(
        <DialogTrigger asChild>
          <Button
            ref={createButtonRef}
            onClick={(event) => {
              returnFocusRef.current = event.currentTarget;
              reset();
            }}
            disabled={pending}
          >
            Buat aturan periode
          </Button>
        </DialogTrigger>,
        headerAction,
      )}
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0" showCloseButton={!pending} onOpenAutoFocus={(event) => {
        event.preventDefault();
        formRef.current?.querySelector<HTMLElement>(editing?.inUse ? "#monitoring-rule-active" : "#monitoring-rule-name")?.focus();
      }} onCloseAutoFocus={restoreFocus}>
        <DialogHeader className="shrink-0"><DialogTitle>{editing ? (editing.inUse ? "Ubah status aturan" : "Edit aturan periode") : "Buat aturan periode"}</DialogTitle><DialogDescription>{editing ? "Sesuaikan aturan dan ketersediaannya untuk profil baru." : "Tetapkan tahun, frekuensi, dan jadwal pengisian profil risiko."}</DialogDescription></DialogHeader>
        <form ref={formRef} onSubmit={submit} className="flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5">
          {editing?.inUse && <p className="text-pretty text-sm text-muted-foreground">Aturan sudah dipakai profil. Nama, tahun, frekuensi, dan jadwal dikunci; hanya status aktif yang dapat diubah.</p>}
          <fieldset disabled={pending || editing?.inUse} className="space-y-5">
            <Field><FieldLabel htmlFor="monitoring-rule-name">Nama aturan</FieldLabel><Input id="monitoring-rule-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Pemantauan kuartalan 2027" required /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field><FieldLabel htmlFor="monitoring-rule-year">Tahun profil</FieldLabel><Input id="monitoring-rule-year" type="number" min={1900} max={9998} step={1} value={year} onChange={(event) => changeYear(event.target.value)} required className="tabular-nums" /></Field>
              <Field><FieldLabel htmlFor="monitoring-rule-frequency">Frekuensi</FieldLabel><Select value={frequency} onValueChange={(value) => changeFrequency(value as MonitoringRuleFrequency)} disabled={pending || editing?.inUse}><SelectTrigger id="monitoring-rule-frequency"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(monitoringRuleFrequencyLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
            </div>
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
          </fieldset>
          <Alert variant="info" role="note" className="rounded-md px-3 py-2">
            <AlertCircle aria-hidden="true" />
            <AlertDescription className="text-pretty text-xs">
              Hanya satu aturan aktif per tahun. Aturan aktif tersedia untuk profil baru. Profil lama tetap memakai aturan yang sudah dipilih.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-2"><Checkbox id="monitoring-rule-active" disabled={pending} checked={active} onCheckedChange={(checked) => setActive(checked === true)} /><FieldLabel htmlFor="monitoring-rule-active">Aktif untuk dipilih pada profil risiko</FieldLabel></div>
          {conflict && <p className="text-pretty text-xs text-muted-foreground">Aturan aktif tahun {year}: {conflict.name}. Nonaktifkan aturan tersebut terlebih dahulu untuk mengaktifkan aturan ini.</p>}
          {formError && <Alert variant="destructive" role="alert"><AlertDescription>{formError}</AlertDescription></Alert>}
          {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
          </div>
          <DialogFooter className="shrink-0"><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={pending}>Batal</Button><Button type="submit" disabled={pending}>{pending ? "Menyimpan aturan…" : editing ? "Simpan perubahan" : "Simpan aturan"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription><div className="mt-2"><Button variant="outline" onClick={onRetry} disabled={loading || pending}>Muat ulang aturan</Button></div></Alert>}
    <section aria-labelledby="monitoring-rules-list-title" className="space-y-3">
      <h3 id="monitoring-rules-list-title" className="text-balance text-sm font-medium">Aturan tersimpan</h3>
      {loading ? (
        <div role="status" aria-label="Memuat aturan periode" className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : rules.length ? (
        <Card>
          <CardContent>
            <ul className="divide-y divide-border">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-1">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      className="block max-w-full cursor-pointer rounded-sm text-start text-sm font-medium wrap-anywhere hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline"
                      onClick={(event) => edit(rule, event.currentTarget)}
                      disabled={pending}
                    >
                      {rule.name}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">{rule.year} · {monitoringRuleFrequencyLabels[rule.frequency]}</span>
                      <Badge variant="secondary">{rule.active ? "Aktif" : "Tidak aktif"}</Badge>
                    </div>
                    {rule.inUse && (
                      <p id={`rule-locked-${rule.id}`} className="text-xs text-muted-foreground">Sudah dipakai profil. Hanya status aktif yang dapat diubah.</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    onClick={(event) => {
                      returnFocusRef.current = event.currentTarget;
                      setDeleting(rule);
                    }}
                    disabled={pending || rule.inUse}
                    aria-describedby={rule.inUse ? `rule-locked-${rule.id}` : undefined}
                  >
                    Hapus<span className="sr-only"> {rule.name}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : !error && (
        <p className="text-pretty text-sm text-muted-foreground">Belum ada aturan. Pilih Buat aturan periode untuk memulai.</p>
      )}
    </section>
    <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}>
      <AlertDialogContent onCloseAutoFocus={restoreFocus}>
        <AlertDialogHeader><AlertDialogTitle>Hapus aturan periode?</AlertDialogTitle><AlertDialogDescription>Aturan “{deleting?.name}” tahun {deleting?.year} akan dihapus beserta jadwalnya. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
        {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
        <AlertDialogFooter><AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={pending} onClick={(event) => { event.preventDefault(); void confirmDelete(); }}>{pending ? "Menghapus aturan…" : "Hapus aturan"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function AuthenticatedMonitoringRulesSettings({ token, headerAction }: { token: string; headerAction: HTMLDivElement | null }) {
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

  async function mutate(action: () => Promise<MonitoringRule | void>, message: string): Promise<boolean> {
    if (creating.current) return false;
    creating.current = true;
    setPending(true);
    try {
      await action();
      if (!mounted.current) return false;
      ++requestVersion.current;
      setLoading(true);
      setRevision((value) => value + 1);
      setError("");
      toast.success(message);
      return true;
    } catch (err) {
      if (mounted.current) {
        if (err instanceof ApiError && err.type === "https://api.manris.com/errors/active-rule-conflict") {
          setError("");
          toast.error(err.message);
        } else {
          setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan. Silakan coba lagi.");
        }
      }
      return false;
    } finally {
      creating.current = false;
      if (mounted.current) setPending(false);
    }
  }

  return <MonitoringRulesPanel headerAction={headerAction} rules={rules} loading={loading} error={error} pending={pending} onRetry={() => { setLoading(true); setRevision((value) => value + 1); }}
    onCreate={(input) => mutate(() => createMonitoringRule(token, input), "Aturan periode disimpan.")}
    onUpdate={(id, input) => mutate(() => updateMonitoringRule(token, id, input), "Aturan periode diperbarui.")}
    onDelete={(id) => mutate(() => deleteMonitoringRule(token, id), "Aturan periode dihapus.")} />;
}

export function MonitoringRulesSettings({ headerAction }: { headerAction: HTMLDivElement | null }) {
  const { user, token } = useAuth();
  if (user?.role !== "superadmin" || !token) return null;
  return <AuthenticatedMonitoringRulesSettings key={`${user.id}:${token}`} token={token} headerAction={headerAction} />;
}
