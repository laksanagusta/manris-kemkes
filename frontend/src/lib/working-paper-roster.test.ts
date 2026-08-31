import { describe, it } from "node:test";
import assert from "node:assert";

const {
  buildInitialRosterDecisions,
  summarizeRosterDecisions,
} = await import(
  new URL("./working-paper-roster.ts", import.meta.url).href
);

interface WorkingPaperRosterEntry {
  versionGroupId: string;
  code: string;
  title: string;
  organizationId: string;
  sourceRiskId: string;
  sourceVersionNumber: number;
  resultRiskId?: string;
  resultVersionNumber?: number;
  monitoringId?: string;
  monitoringCycle: string;
  monitoringStatus: string;
  rosterStatus: "not_started" | "in_progress" | "finalized";
}

interface WorkingPaperRosterPreview {
  organizationId: string;
  assessmentCycle: string;
  monitoringCycle: string;
  revision: string;
  entries: WorkingPaperRosterEntry[];
  summary: {
    eligibleCount: number;
    notStartedCount: number;
    inProgressCount: number;
    finalizedCount: number;
  };
}

function makeEntry(
  overrides: Partial<WorkingPaperRosterEntry>,
): WorkingPaperRosterEntry {
  return {
    versionGroupId: overrides.versionGroupId ?? "group-1",
    code: overrides.code ?? "R-001",
    title: overrides.title ?? "Test Risk",
    organizationId: overrides.organizationId ?? "org-1",
    sourceRiskId: overrides.sourceRiskId ?? "risk-1",
    sourceVersionNumber: overrides.sourceVersionNumber ?? 1,
    monitoringCycle: overrides.monitoringCycle ?? "2026-H1",
    monitoringStatus: overrides.monitoringStatus ?? "",
    rosterStatus: overrides.rosterStatus ?? "not_started",
  };
}

function makePreview(
  entries: WorkingPaperRosterEntry[],
): WorkingPaperRosterPreview {
  return {
    organizationId: "org-1",
    assessmentCycle: "2026-H1",
    monitoringCycle: "2026-H1",
    revision: "abc123",
    entries,
    summary: {
      eligibleCount: entries.length,
      notStartedCount: entries.filter(
        (e) => e.rosterStatus === "not_started",
      ).length,
      inProgressCount: entries.filter(
        (e) => e.rosterStatus === "in_progress",
      ).length,
      finalizedCount: entries.filter(
        (e) => e.rosterStatus === "finalized",
      ).length,
    },
  };
}

describe("buildInitialRosterDecisions", () => {
  it("includes every preview entry", () => {
    const preview = makePreview([
      makeEntry({ versionGroupId: "group-1" }),
      makeEntry({ versionGroupId: "group-2" }),
    ]);

    const decisions = buildInitialRosterDecisions(preview);

    assert.deepStrictEqual(decisions, [
      { versionGroupId: "group-1", included: true },
      { versionGroupId: "group-2", included: true },
    ]);
  });
});

describe("summarizeRosterDecisions", () => {
  it("counts monitoring progress and exclusions", () => {
    const preview = makePreview([
      makeEntry({
        versionGroupId: "group-1",
        rosterStatus: "finalized",
      }),
      makeEntry({
        versionGroupId: "group-2",
        rosterStatus: "not_started",
      }),
      makeEntry({
        versionGroupId: "group-3",
        rosterStatus: "in_progress",
      }),
    ]);

    const decisions = [
      { versionGroupId: "group-1", included: true },
      {
        versionGroupId: "group-2",
        included: false,
      },
      { versionGroupId: "group-3", included: true },
    ];

    const summary = summarizeRosterDecisions(preview, decisions);

    assert.strictEqual(summary.eligibleCount, 3);
    assert.strictEqual(summary.includedCount, 2);
    assert.strictEqual(summary.excludedCount, 1);
    assert.strictEqual(summary.finalizedCount, 1);
    assert.strictEqual(summary.inProgressCount, 1);
    assert.strictEqual(summary.notStartedCount, 0);
  });
});
