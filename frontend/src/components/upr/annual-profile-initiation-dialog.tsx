"use client";

import { createDisplayDateFormatter } from "@/lib/display-date";
import { riskCategoryLabels } from "@/lib/risk";
import { SearchableDropdownPicker } from "@/components/shared/searchable-dropdown-picker";
import { FieldHeading } from "@/components/ui/field";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "@/components/shared/icons";
import { CollectionSearchField } from "@/components/shared/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { getAnnualProfileRuleSelection, groupAnnualProfiles, isAnnualProfileYear } from "@/lib/annual-profile";
import type {
  AnnualPickupRisk,
  AnnualProfileListVersion,
} from "@/lib/api/upr-workflow";
import { WorkflowError, WorkflowTable, workflowError } from "./workflow-ui";

import type { MonitoringRule } from "@/lib/api/monitoring-rules";

const assessmentDateFormatter = createDisplayDateFormatter("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

type PickupResult = { key: string; risks: AnnualPickupRisk[]; error?: string };

export function AnnualProfileInitiationDialog({
  defaultYear,
  versions,
  loadPickup,
  loadRules,
  create,
  openProfile,
  close,
  restoreFocus,
}: {
  defaultYear: number;
  versions: AnnualProfileListVersion[];
  loadPickup: (
    year: number,
    source: string | null,
  ) => Promise<AnnualPickupRisk[]>;
  loadRules?: (search?: string, signal?: AbortSignal) => Promise<MonitoringRule[]>;
  create: (
    year: number,
    source: string | null,
    riskIds: string[],
    monitoringRuleId?: string,
  ) => Promise<void>;
  openProfile: (year: number, version: string) => void;
  close: () => void;
  restoreFocus: () => void;
}) {
  const [rulesResult, setRulesResult] = useState<{ rules: MonitoringRule[]; error?: string } | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleSearch, setRuleSearch] = useState("");
  const [chosenRule, setChosenRule] = useState<MonitoringRule | null>(null);
  const [ruleResults, setRuleResults] = useState<{ rules: MonitoringRule[]; error?: string } | null>(null);
  const [ruleId, setRuleId] = useState("");
  const [rulesRetry, setRulesRetry] = useState(0);
  const [mode, setMode] = useState("register");
  const [sourceId, setSourceId] = useState("");
  const [result, setResult] = useState<PickupResult | null>(null);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const { selectedRule } = getAnnualProfileRuleSelection(
    [...(rulesResult?.rules ?? []), ...(chosenRule ? [chosenRule] : [])],
    defaultYear,
    ruleId,
  );
  const year = selectedRule?.year ?? defaultYear;
  const validYear = isAnnualProfileYear(year) && (!loadRules || Boolean(selectedRule));
  useEffect(() => {
    if (!loadRules) return;
    let active = true;
    loadRules().then(rules => { if (active) setRulesResult({rules}); }, error => { if(active) setRulesResult({rules:[],error:workflowError(error)}); });
    return () => { active = false; };
  }, [loadRules, rulesRetry]);
  useEffect(() => {
    if (!loadRules || !ruleOpen) return;
    const controller = new AbortController();
    setRuleResults(null);
    const timer = setTimeout(() => {
      loadRules(ruleSearch.trim(), controller.signal).then(
        rules => { if (!controller.signal.aborted) setRuleResults({ rules }); },
        error => { if (!controller.signal.aborted) setRuleResults({ rules: [], error: workflowError(error) }); },
      );
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [loadRules, ruleOpen, ruleSearch]);
  const existing = validYear
    ? groupAnnualProfiles(versions).find((item) => item.year === year)
    : undefined;
  const sources = versions
    .filter((version) => version.year < year && version.finalizedAt)
    .sort((a, b) => b.year - a.year || b.version - a.version);
  const source =
    mode === "profile"
      ? sources.find((version) => version.id === sourceId)
      : undefined;
  const sourceProfileId = source?.id ?? null;
  const canLoad =
    validYear && !existing && (mode === "register" || Boolean(source));
  const requestKey = `${year}:${sourceProfileId ?? "register"}:${retry}`;
  const preview = result?.key === requestKey && canLoad ? result : null;
  const available = preview?.risks ?? [];
  const eligible = available.filter(
    (item): item is AnnualPickupRisk & { id: string } =>
      Boolean(item.id && !item.unavailable),
  );
  const selectedIds = new Set(selected);
  const picked = eligible.filter((item) => selectedIds.has(item.id));
  const query = search.trim().toLocaleLowerCase("id");
  const visible = available.filter((item) =>
    `${item.code} ${item.title}`.toLocaleLowerCase("id").includes(query),
  );

  useEffect(() => {
    if (!canLoad) return;
    let cancelled = false;
    loadPickup(year, sourceProfileId).then(
      (risks) => {
        if (!cancelled) setResult({ key: requestKey, risks });
      },
      (cause) => {
        if (!cancelled)
          setResult({
            key: requestKey,
            risks: [],
            error: workflowError(cause),
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [canLoad, loadPickup, requestKey, sourceProfileId, year]);

  function resetSelection() {
    setSearch("");
    setSelected([]);
    setResult(null);
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canLoad || !picked.length || (loadRules && !selectedRule) || submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    setError("");
    try {
      await create(
        year,
        sourceProfileId,
        picked.map((item) => item.id),
        selectedRule?.id,
      );
    } catch (cause) {
      setError(workflowError(cause));
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitLock.current) close();
      }}
    >
      <DialogContent
        className="flex max-h-[min(90dvh,52rem)] flex-col gap-4 overflow-hidden [--dialog-width:var(--container-5xl)]"
        showCloseButton={!pending}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <DialogHeader className="shrink-0 pr-10">
          <DialogTitle>Tambah profil risiko tahunan</DialogTitle>
          <DialogDescription>
            Pilih rules pemantauan dan risiko awal. Setelah draf dibuat, selesaikan
            penilaian di detail profil dan tautkan sasaran bila relevan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 space-y-6 overflow-y-auto px-1 py-1">
            <div className="grid w-full gap-6">
              {loadRules && (
                <div className="w-full space-y-2">
                  <FieldHeading>
                    <Label htmlFor="initiate-profile-rule">Rules pemantauan</Label>
                    {rulesResult && !rulesResult.error && (
                      <p id="initiate-profile-rule-help" className="text-xs leading-4 text-muted-foreground">
                        {(rulesResult?.rules.length ?? 0)
                          ? "Jadwal ini berlaku untuk pemantauan, kertas kerja, dan evaluasi profil."
                          : "Belum ada rules pemantauan aktif. Superadmin perlu membuatnya di Pengaturan."}
                      </p>
                    )}
                  </FieldHeading>
                  <SearchableDropdownPicker<MonitoringRule>
                    id="initiate-profile-rule"
                    title="Rules pemantauan"
                    description="Cari rules aktif berdasarkan nama atau tahun. Menampilkan lima rules terbaru."
                    placeholder="Pilih rules pemantauan"
                    value={selectedRule?.id ?? ""}
                    selectedOption={selectedRule}
                    options={ruleResults?.rules ?? []}
                    getOptionValue={rule => rule.id}
                    renderValue={rule => `${rule.year} · ${rule.name}`}
                    renderOption={rule => `${rule.year} · ${rule.name}`}
                    onSelect={rule => {
                      setChosenRule(rule);
                      setRuleId(rule.id);
                      if (rule.year !== year) { setSourceId(""); resetSelection(); }
                    }}
                    open={ruleOpen}
                    onOpenChange={open => { setRuleOpen(open); if (!open) setRuleSearch(""); }}
                    search={ruleSearch}
                    onSearchChange={value => { setRuleSearch(value); setRuleResults(null); }}
                    searchPlaceholder="Cari nama atau tahun…"
                    emptyMessage="Tidak ada rules yang cocok."
                    loading={!ruleResults}
                    errorMessage={ruleResults?.error}
                    disabled={pending || !rulesResult || Boolean(rulesResult.error)}
                    focusSearchOnOpen
                  />
                  {!rulesResult ? (
                    <p role="status" className="text-xs text-muted-foreground">Memuat rules…</p>
                  ) : rulesResult.error ? (
                    <WorkflowError message={rulesResult.error} retry={() => { setRulesResult(null); setRulesRetry((n) => n + 1); }} />
                  ) : null}
                </div>
              )}
              <div className="w-full space-y-2">
                <FieldHeading>
                  <Label htmlFor="initiate-profile-year">Tahun profil</Label>
                </FieldHeading>
                <Input
                  id="initiate-profile-year"
                  value={validYear ? String(year) : ""}
                  placeholder={loadRules ? "Mengikuti rules pemantauan" : undefined}
                  readOnly
                  disabled={pending}
                  className="tabular-nums"
                />
                {existing && (
                  <Alert
                    role="note"
                    className="mt-4! rounded-lg border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                  >
                    <AlertTriangle
                      aria-hidden="true"
                      className="size-3.5 text-amber-700 dark:text-amber-300"
                    />
                    <AlertDescription className="text-xs leading-4 text-amber-900 dark:text-amber-100">
                      {existing.draft
                        ? `Tahun ${year} sudah punya draf versi ${existing.draft.version}.`
                        : `Tahun ${year} sudah punya profil final. Buka detail untuk membuat revisi.`}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              {validYear && !existing && (
                <div className="space-y-2">
                  <Label htmlFor="initiate-profile-source">Sumber risiko</Label>
                  <Select
                    value={mode}
                    disabled={pending}
                    onValueChange={(value) => {
                      setMode(value);
                      setSourceId("");
                      resetSelection();
                    }}
                  >
                    <SelectTrigger
                      id="initiate-profile-source"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="register">
                        Risiko aktif di Register
                      </SelectItem>
                      <SelectItem value="profile">
                        Ambil dari profil final
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {!existing && validYear && mode === "profile" && (
              <div className="space-y-2">
                <FieldHeading>
                  <Label htmlFor="initiate-source-version">Profil sumber</Label>
                  {!sources.length && (
                    <p className="leading-4 text-sm text-muted-foreground">
                      Belum ada profil final sebelum {year}. Gunakan risiko aktif
                      di Register.
                    </p>
                  )}
                </FieldHeading>
                <Select
                  value={sourceId}
                  disabled={pending || !sources.length}
                  onValueChange={(value) => {
                    setSourceId(value);
                    resetSelection();
                  }}
                >
                  <SelectTrigger
                    id="initiate-source-version"
                    className="w-full"
                  >
                    <SelectValue placeholder="Pilih tahun dan versi profil" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((version) => (
                      <SelectItem key={version.id} value={version.id}>
                        {version.year} · Versi {version.version} Final
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {canLoad && !preview && (
              <p role="status" className="text-sm text-muted-foreground">
                Memuat daftar risiko…
              </p>
            )}
            {preview?.error && (
              <WorkflowError
                message={preview.error}
                retry={() => setRetry((value) => value + 1)}
              />
            )}
            {preview && !preview.error && (
              <div className="space-y-3">
                <CollectionSearchField
                  aria-label="Cari risiko untuk profil"
                  placeholder="Cari kode atau nama risiko"
                  value={search}
                  disabled={pending}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {available.length > 0 ? (
                  <WorkflowTable
                    columns={[
                      {
                        label: "Pilih semua risiko",
                        className: "w-12 min-w-12 max-w-12 px-0 text-center",
                        header: (
                          <Checkbox
                            aria-label="Pilih semua risiko yang tersedia"
                            title="Pilih semua risiko yang tersedia"
                            checked={
                              picked.length === eligible.length &&
                              eligible.length > 0
                                ? true
                                : picked.length > 0
                                  ? "indeterminate"
                                  : false
                            }
                            disabled={pending || eligible.length === 0}
                            onCheckedChange={(checked) =>
                              setSelected(
                                checked === true
                                  ? eligible.map((item) => item.id)
                                  : [],
                              )
                            }
                          />
                        ),
                      },
                      "Risiko",
                      "Penilaian terakhir",
                      "Kategori",
                    ]}
                    hiddenOnMobile={["Penilaian terakhir", "Kategori"]}
                  >
                    {visible.map((risk, index) => {
                      const id = risk.id;
                      const date = risk.assessmentDate ? new Date(risk.assessmentDate) : null;
                      const assessment = date && !Number.isNaN(date.getTime())
                        ? assessmentDateFormatter.format(date)
                        : "—";
                      const category = riskCategoryLabels[risk.category as keyof typeof riskCategoryLabels] || risk.category || "—";
                      return (
                        <TableRow
                          key={id ?? `${risk.code}:${risk.title}:${index}`}
                        >
                          <TableCell className="w-12 min-w-12 max-w-12 px-0 text-center">
                            {id && !risk.unavailable && (
                              <Checkbox
                                className="mx-auto"
                                aria-label={`Pilih ${risk.code} ${risk.title}`}
                                checked={selectedIds.has(id)}
                                disabled={pending}
                                onCheckedChange={(checked) =>
                                  setSelected((current) =>
                                    checked === true
                                      ? [...current, id]
                                      : current.filter((item) => item !== id),
                                  )
                                }
                              />
                            )}
                          </TableCell>
                          <TableCell className="ps-0 whitespace-normal sm:min-w-40">
                            <span className="text-xs text-muted-foreground">
                              {risk.code}
                            </span>
                            <p className="font-medium">{risk.title}</p>
                            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground sm:hidden">
                              {assessment && (
                                <p className="tabular-nums">{assessment}</p>
                              )}
                              <p>{category}</p>
                            </div>
                            {risk.unavailable && <p className="mt-1 text-xs text-muted-foreground">{risk.unavailable}</p>}
                          </TableCell>
                          <TableCell className="hidden tabular-nums sm:table-cell">
                            <time dateTime={risk.assessmentDate ?? undefined}>{assessment}</time>
                          </TableCell>
                          <TableCell className="hidden min-w-36 whitespace-normal sm:table-cell">
                            {category}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!visible.length && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-6 text-center text-muted-foreground"
                        >
                          Tidak ada risiko yang cocok dengan pencarian.
                        </TableCell>
                      </TableRow>
                    )}
                  </WorkflowTable>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {source
                      ? "Profil sumber ini tidak memuat risiko."
                      : "Belum ada risiko final aktif di Register."}
                  </p>
                )}
              </div>
            )}
            {error && (
              <WorkflowError
                message={error}
                retry={
                  !existing
                    ? () => {
                        setError("");
                        setRetry((value) => value + 1);
                      }
                    : undefined
                }
              />
            )}
          </div>
          <DialogFooter className="shrink-0 border-t pt-4 sm:items-center">
            {canLoad && preview && !preview.error && (
              <span
                role="status"
                className="text-sm text-muted-foreground tabular-nums sm:mr-auto"
              >
                {picked.length} risiko dipilih
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={close}
            >
              Batal
            </Button>
            {existing ? (
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  const target = existing.draft ?? existing.final;
                  if (target) openProfile(year, target.id);
                }}
              >
                {existing.draft ? "Lanjutkan draf" : "Buka profil final"}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={pending || !canLoad || !picked.length || (Boolean(loadRules) && !selectedRule)}
              >
                {pending ? "Membuat draft…" : "Buat draft"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
