import type {
  QuarterlyReportOverview,
  QuarterlyReport,
  QuarterlyRisk,
  QuarterlyTask,
} from "../types/quarterly-report";

export type Movement = "up" | "down" | "stable" | "new";
export type TaskState =
  | "reported"
  | "pending"
  | "overdue"
  | "not_reported"
  | "skipped";
export const movementLabels: Record<Movement, string> = {
  up: "Memburuk",
  down: "Membaik",
  stable: "Tetap",
  new: "Baru",
};
export const taskStateLabels: Record<TaskState, string> = {
  reported: "Terlapor",
  pending: "Belum terlapor",
  overdue: "Melewati tenggat",
  not_reported: "Tidak dilaporkan",
  skipped: "Dilewati",
};
export const conditionLabels = {
  recovered: "Pulih",
  controlled: "Terkendali",
  ongoing: "Masih berlangsung",
  worsening: "Memburuk",
  unknown: "Belum diketahui",
};
export const severityLabels = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  extreme: "Sangat tinggi",
};

export function currentReportCycle(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return `${year}-Q${Math.ceil(month / 3)}`;
}

export function riskPopulationLabel(cycle: string, date = new Date()) {
  return cycle >= currentReportCycle(date)
    ? "Risiko aktif saat ini · Final"
    : "Risiko aktif akhir periode · Final";
}
export function shiftReportCycle(cycle: string, delta: number) {
  const match = /^(\d{4})-Q([1-4])$/.exec(cycle);
  if (!match) throw new Error("Periode tidak valid");
  const index = Number(match[1]) * 4 + Number(match[2]) - 1 + delta;
  return `${Math.floor(index / 4)}-Q${(index % 4) + 1}`;
}
export const completedReportCycle = (date = new Date()) =>
  shiftReportCycle(currentReportCycle(date), -1);
export function percentage(
  numerator: number,
  denominator: number,
): number | null {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}
export function formatReportPercent(value: number | null) {
  return value === null
    ? "—"
    : `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
}
export function formatReportNumber(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
        value,
      );
}
export function formatReportDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
export function profileNilai(risk: QuarterlyRisk): number | null {
  if (positive(risk.nilai)) return risk.nilai;
  if (
    positive(risk.probability) &&
    positive(risk.impact) &&
    positive(risk.weight)
  )
    return Math.round(risk.probability * risk.impact * risk.weight * 100) / 100;
  return positive(risk.inherentScore) ? risk.inherentScore : null;
}
function targetNilai(risk: QuarterlyRisk): number | null {
  if (
    !positive(risk.targetProbability) ||
    risk.targetProbability > 5 ||
    !Number.isInteger(risk.targetProbability) ||
    !positive(risk.targetImpact) ||
    risk.targetImpact > 5 ||
    !Number.isInteger(risk.targetImpact) ||
    !positive(risk.targetWeight)
  )
    return null;
  return positive(risk.targetNilai)
    ? risk.targetNilai
    : Math.round(
        risk.targetProbability * risk.targetImpact * risk.targetWeight * 100,
      ) / 100;
}
export function reportTaskState(
  task: QuarterlyTask,
  cycle: string,
  generatedAt: string,
): TaskState {
  const noteLength = new TextEncoder().encode(task.notes?.trim() ?? "").length;
  if (
    task.status === "done" &&
    task.reportedAt &&
    Number.isFinite(Date.parse(task.reportedAt)) &&
    noteLength >= 10 &&
    noteLength <= 1000
  )
    return "reported";
  if (task.status === "not_reported" || task.status === "skipped")
    return task.status;
  // Attribution remains in cycle; overdue reporting follows the current Jakarta day.
  void cycle;
  const cutoff = Date.parse(generatedAt);
  const calendarDate = (timestamp: number) => {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(timestamp));
    return ["year", "month", "day"]
      .map((key) => parts.find((part) => part.type === key)?.value)
      .join("-");
  };
  const deadline = /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
    ? task.dueDate
    : Number.isFinite(Date.parse(task.dueDate))
      ? calendarDate(Date.parse(task.dueDate))
      : "";
  return deadline && deadline < calendarDate(cutoff) ? "overdue" : "pending";
}
export interface ReportRiskRow {
  risk: QuarterlyRisk;
  profile: number | null;
  previousProfile: number | null;
  observed: number | null;
  target: number | null;
  movement: Movement;
  aboveAppetite: boolean;
  final: boolean;
  targetState: "achieved" | "missed" | "unavailable";
  overdueTasks: number;
  attention: string[];
}
export interface ReportTaskRow {
  task: QuarterlyTask;
  state: TaskState;
}
function riskRows(
  risks: QuarterlyRisk[],
  previous: QuarterlyRisk[],
  tasks: ReportTaskRow[],
  cycle: string,
): ReportRiskRow[] {
  const previousMap = new Map(
    previous.map((risk) => [risk.versionGroupId || risk.id, risk]),
  );
  return risks.map((risk) => {
    const before = previousMap.get(risk.versionGroupId || risk.id);
    const profile = profileNilai(risk);
    const previousProfile = before ? profileNilai(before) : null;
    const movement: Movement = !before
      ? "new"
      : profile === null || previousProfile === null
        ? "stable"
        : Math.round(profile) > Math.round(previousProfile)
          ? "up"
          : Math.round(profile) < Math.round(previousProfile)
            ? "down"
            : "stable";
    const final =
      risk.monitoringStatus === "final" &&
      risk.monitoringAssessmentCycle === cycle &&
      positive(risk.monitoringObservedNilai);
    const observed = final ? risk.monitoringObservedNilai! : null;
    const target = targetNilai(risk);
    const targetState =
      observed === null || target === null
        ? "unavailable"
        : observed <= target
          ? "achieved"
          : "missed";
    const overdueTasks = tasks.filter(
      ({ task, state }) =>
        (task.versionGroupId === (risk.versionGroupId || risk.id) ||
          task.riskId === risk.id) &&
        state === "overdue",
    ).length;
    const aboveAppetite = profile !== null && Math.round(profile) >= 10;
    const attention = [
      movement === "up" ? "Risiko memburuk" : "",
      targetState === "missed" ? "Belum mencapai target" : "",
      !final ? "Pemantauan belum final" : "",
      overdueTasks ? `${overdueTasks} laporan mitigasi melewati tenggat` : "",
    ].filter(Boolean);
    return {
      risk,
      profile,
      previousProfile,
      observed,
      target,
      movement,
      aboveAppetite,
      final,
      targetState,
      overdueTasks,
      attention,
    };
  });
}
export function eventHasRiskLinks(event: QuarterlyReport["events"][number]) {
  return event.hasLinkedRisks ?? Boolean(event.linkedRisks?.length);
}
function summarize(
  rows: ReportRiskRow[],
  tasks: ReportTaskRow[],
  events: QuarterlyReport["events"],
) {
  const eligible = rows.filter(
    (row) => row.targetState !== "unavailable",
  ).length;
  const achieved = rows.filter((row) => row.targetState === "achieved").length;
  const final = rows.filter((row) => row.final).length;
  const above = rows.filter((row) => row.aboveAppetite).length;
  const reported = tasks.filter((row) => row.state === "reported").length;
  const known = events.filter(
    (event) =>
      event.financialLossKnown === true &&
      typeof event.financialLoss === "number" &&
      Number.isFinite(event.financialLoss) &&
      event.financialLoss >= 0,
  );
  return {
    total: rows.length,
    appetite: {
      above,
      total: rows.length,
      rate: percentage(above, rows.length),
    },
    target: {
      achieved,
      eligible,
      unavailable: rows.length - eligible,
      rate: percentage(achieved, eligible),
    },
    monitoring: {
      final,
      total: rows.length,
      rate: percentage(final, rows.length),
    },
    mitigation: {
      reported,
      total: tasks.length,
      rate: percentage(reported, tasks.length),
      overdue: tasks.filter((row) => row.state === "overdue").length,
    },
    events: {
      total: events.length,
      knownLoss: known.reduce(
        (total, event) => total + event.financialLoss!,
        0,
      ),
      knownLossCount: known.length,
      unknownLoss: events.length - known.length,
      unlinked: events.filter((event) => !eventHasRiskLinks(event)).length,
    },
    targetsAvailable: rows.filter((row) => row.target !== null).length,
    evidenceAvailable: tasks.filter(
      ({ task, state }) =>
        state === "reported" && Boolean(task.evidenceUrl?.trim()),
    ).length,
  };
}
export type ReportSummary = ReturnType<typeof summarize>;
export type QuarterlyReportRiskData = Pick<
  QuarterlyReport,
  "cycle" | "generatedAt" | "risks" | "previousRisks" | "tasks"
>;

export function buildQuarterlyRiskRows(report: QuarterlyReportRiskData) {
  const tasks = report.tasks.map((task) => ({
    task,
    state: reportTaskState(task, report.cycle, report.generatedAt),
  }));
  return riskRows(report.risks, report.previousRisks, tasks, report.cycle);
}

export function buildQuarterlyAnalysis(report: QuarterlyReport) {
  const tasks = report.tasks.map((task) => ({
    task,
    state: reportTaskState(task, report.cycle, report.generatedAt),
  }));
  const previousTasks = (report.previousTasks ?? []).map((task) => ({
    task,
    state: reportTaskState(task, report.comparisonCycle, report.generatedAt),
  }));
  const rows = riskRows(
    report.risks,
    report.previousRisks,
    tasks,
    report.cycle,
  );
  const previousRows = riskRows(
    report.previousRisks,
    [],
    previousTasks,
    report.comparisonCycle,
  );
  const events = Array.from(
    new Map(report.events.map((event) => [event.id, event])).values(),
  );
  const summary = summarize(rows, tasks, events);
  const previousSummary = summarize(previousRows, previousTasks, []);
  const currentGroups = new Set(
    report.risks.map((risk) => risk.versionGroupId || risk.id),
  );
  const movement = {
    up: 0,
    down: 0,
    stable: 0,
    new: 0,
    absent: report.previousRisks.filter(
      (risk) => !currentGroups.has(risk.versionGroupId || risk.id),
    ).length,
  };
  rows.forEach((row) => movement[row.movement]++);
  const units = report.organizations
    .map((unit) => {
      const unitRows = rows.filter(
        (row) => row.risk.organizationId === unit.id,
      );
      const unitTasks = tasks.filter(
        ({ task }) => task.organizationId === unit.id,
      );
      const unitEvents = events.filter(
        (event) => event.organizationId === unit.id,
      );
      return {
        ...unit,
        rows: unitRows,
        tasks: unitTasks,
        events: unitEvents,
        hasData: unitRows.length + unitTasks.length + unitEvents.length > 0,
        summary: summarize(unitRows, unitTasks, unitEvents),
      };
    })
    .sort(
      (a, b) =>
        b.rows.filter((row) => row.attention.length).length -
          a.rows.filter((row) => row.attention.length).length ||
        a.name.localeCompare(b.name, "id"),
    );
  return { summary, previousSummary, rows, tasks, events, movement, units };
}
export type QuarterlyAnalysis = ReturnType<typeof buildQuarterlyAnalysis>;

export function buildQuarterlyOverview(
  report: QuarterlyReport,
): QuarterlyReportOverview {
  const analysis = buildQuarterlyAnalysis(report);
  const taskCounts = {
    reported: 0,
    pending: 0,
    overdue: 0,
    not_reported: 0,
    skipped: 0,
    total: analysis.tasks.length,
  };
  analysis.tasks.forEach(({ state }) => {
    taskCounts[state] += 1;
  });
  const severityCounts = { low: 0, medium: 0, high: 0, extreme: 0 };
  analysis.events.forEach((event) => {
    if (event.severity in severityCounts) {
      severityCounts[event.severity as keyof typeof severityCounts] += 1;
    }
  });
  const recentEvents = [...analysis.events]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      code: event.code,
      description: event.description,
      occurredAt: event.occurredAt,
      organizationName: event.organizationName ?? "",
      postResponseCondition: event.postResponseCondition,
      severity: event.severity,
    }));
  return {
    cycle: report.cycle,
    comparisonCycle: report.comparisonCycle,
    generatedAt: report.generatedAt,
    dataUpdatedAt: report.dataUpdatedAt,
    snapshotHash: report.snapshotHash,
    warnings: report.warnings,
    summary: analysis.summary,
    previousSummary: analysis.previousSummary,
    movement: analysis.movement,
    hasRisks: analysis.rows.length > 0,
    taskCounts,
    recentEvents,
    severityCounts,
    units: analysis.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      hasData: unit.hasData,
      attentionCount: unit.rows.filter((row) => row.attention.length > 0).length,
      summary: unit.summary,
    })),
  };
}

/** Internal operational summary; this is neither a KMK composite score nor TMPMR. */
export function buildRiskManagementCondition(report: QuarterlyReport, activeProfiles: QuarterlyRisk[], previousProfiles: QuarterlyRisk[]) {
  // Archive markers also include risks later restored; snapshots define activity.
  const risks = activeProfiles;
  const ids = new Set(risks.map((risk) => risk.id));
  const groups = new Set(risks.map((risk) => risk.versionGroupId || risk.id));
  const tasks = report.tasks.filter((task) =>
    ids.has(task.riskId) || groups.has(task.versionGroupId),
  );
  const analysis = buildQuarterlyAnalysis({ ...report, risks, previousRisks: previousProfiles, tasks });
  const priorByGroup = new Map(previousProfiles.map((risk) => [risk.versionGroupId || risk.id, risk]));
  const movement = { ...analysis.movement, up: 0, down: 0, stable: 0, unavailable: 0 };
  for (const row of analysis.rows) {
    const previous = priorByGroup.get(row.risk.versionGroupId || row.risk.id);
    if (!previous) continue;
    const before = profileNilai(previous);
    if (row.profile === null || before === null) movement.unavailable++;
    else if (Math.round(row.profile) > Math.round(before)) movement.up++;
    else if (Math.round(row.profile) < Math.round(before)) movement.down++;
    else movement.stable++;
  }
  const assessed = analysis.rows.filter((row) => row.profile !== null);
  const main = assessed.filter((row) => row.aboveAppetite);
  const planned = main.filter(({ risk }) =>
    (risk.mitigations ?? (risk.mitigation ? [risk.mitigation] : [])).some(
      (plan) => !plan.isExistingControl && Boolean(plan.action?.trim()),
    ),
  ).length;
  const high = assessed.filter((row) => Math.round(row.profile!) >= 15).length;
  const extreme = assessed.filter((row) => Math.round(row.profile!) >= 20).length;
  const missingPlans = main.length - planned;
  const missedTargets = analysis.summary.target.eligible - analysis.summary.target.achieved;
  const overdue = analysis.summary.mitigation.overdue;
  const needsAttention = main.length > 0 || missingPlans > 0 || overdue > 0 ||
    missedTargets > 0 || movement.up > 0;
  const incomplete = assessed.length < risks.length ||
    analysis.summary.monitoring.final < risks.length ||
    analysis.summary.target.unavailable > 0 || report.warnings.length > 0;
  const status = !risks.length ? "empty" : needsAttention ? "attention" :
    incomplete ? "incomplete" : "within";
  return {
    status,
    total: risks.length,
    high,
    extreme,
    above: main.length,
    missingPlans,
    missedTargets,
    overdue,
    unassessed: risks.length - assessed.length,
    summary: analysis.summary,
    movement,
    metrics: [
      { label: "Dalam area penerimaan", numerator: assessed.length - main.length,
        denominator: assessed.length, detail: `${risks.length - assessed.length} profil belum dapat dinilai`,
        rule: "Profil dengan besaran risiko di bawah 10 ÷ seluruh profil yang memiliki skor valid. Berdasarkan rentang KMK: sangat rendah 1–4 dan rendah 5–9." },
      { label: "Cakupan rencana mitigasi", numerator: planned, denominator: main.length,
        detail: main.length ? `${missingPlans} risiko utama belum memiliki rencana` : "Tidak ada risiko utama yang perlu mitigasi",
        rule: "Risiko utama dengan tindakan mitigasi yang terisi ÷ seluruh risiko utama (skor 10–25). Pengendalian yang sudah ada tidak dihitung sebagai rencana baru; kelengkapan ini belum membuktikan efektivitas." },
      { label: "Mitigasi terlapor", numerator: analysis.summary.mitigation.reported,
        denominator: tasks.length, detail: tasks.length ? `${overdue} laporan melewati tenggat` : "Belum ada tugas mitigasi pada periode ini",
        rule: "Tugas dengan laporan valid ÷ seluruh tugas mitigasi periode ini. Tugas yang dilewati tetap masuk penyebut. Pelaporan tidak berarti pelaksanaan selesai; keterlambatan mengacu pada tenggat laporan." },
      { label: "Pemantauan Final", numerator: analysis.summary.monitoring.final,
        denominator: risks.length, detail: `${risks.length - analysis.summary.monitoring.final} risiko belum dipantau secara Final`,
        rule: "Risiko dengan hasil pemantauan Final yang valid pada kuartal ini ÷ seluruh risiko aktif. Profil Final dan pemantauan Final adalah dua hal berbeda." },
      { label: "Target residual tercapai", numerator: analysis.summary.target.achieved,
        denominator: analysis.summary.target.eligible,
        detail: `${analysis.summary.target.unavailable} risiko belum dapat dinilai`,
        rule: "Hasil pemantauan Final yang mencapai target residual ÷ risiko dengan target valid dan hasil pemantauan Final pada kuartal ini. Ini capaian sementara selama kuartal berjalan, bukan hasil akhir tahun." },
    ],
  };
}

export function buildRiskConditionChartData(
  report: QuarterlyReport,
  activeProfiles: QuarterlyRisk[],
  previousProfiles: QuarterlyRisk[],
) {
  const condition = buildRiskManagementCondition(report, activeProfiles, previousProfiles);
  const composition = (period: string, risks: QuarterlyRisk[]) => {
    const counts = { period, veryLow: 0, low: 0, medium: 0, high: 0, extreme: 0, unknown: 0 };
    for (const risk of risks) {
      const score = profileNilai(risk);
      if (score === null) counts.unknown++;
      else {
        const rounded = Math.round(score);
        const key = rounded >= 20 ? "extreme" : rounded >= 15 ? "high" : rounded >= 10 ? "medium" : rounded >= 5 ? "low" : "veryLow";
        counts[key]++;
      }
    }
    return counts;
  };
  return {
    composition: [composition(report.comparisonCycle, previousProfiles), composition(report.cycle, activeProfiles)],
    indicators: condition.metrics.map((metric) => ({
      ...metric,
      value: percentage(metric.numerator, metric.denominator),
    })),
    movement: [
      { label: "Naik", value: condition.movement.up },
      { label: "Turun", value: condition.movement.down },
      { label: "Tetap", value: condition.movement.stable },
      { label: "Baru", value: condition.movement.new },
      { label: "Keluar cakupan", value: condition.movement.absent },
      { label: "Belum dibandingkan", value: condition.movement.unavailable },
    ],
  };
}
