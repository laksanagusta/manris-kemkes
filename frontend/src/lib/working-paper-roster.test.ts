import { describe, it } from "node:test";
import assert from "node:assert";

const {
  buildInitialRosterDecisions,
  summarizeRosterDecisions,
  validateRosterDecisions,
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
  rosterStatus: "finalized_result" | "existing_draft" | "draft_will_be_created";
}

interface WorkingPaperRosterPreview {
  organizationId: string;
  assessmentCycle: string;
  monitoringCycle: string;
  revision: string;
  entries: WorkingPaperRosterEntry[];
  summary: {
    eligibleCount: number;
    finalizedCount: number;
    existingDraftCount: number;
    newDraftCount: number;
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
    monitoringCycle: overrides.monitoringCycle ?? "2026-Q2",
    monitoringStatus: overrides.monitoringStatus ?? "",
    rosterStatus: overrides.rosterStatus ?? "draft_will_be_created",
  };
}

function makePreview(
  entries: WorkingPaperRosterEntry[],
): WorkingPaperRosterPreview {
  return {
    organizationId: "org-1",
    assessmentCycle: "2026-H1",
    monitoringCycle: "2026-Q2",
    revision: "abc123",
    entries,
    summary: {
      eligibleCount: entries.length,
      finalizedCount: entries.filter(
        (e) => e.rosterStatus === "finalized_result",
      ).length,
      existingDraftCount: entries.filter(
        (e) => e.rosterStatus === "existing_draft",
      ).length,
      newDraftCount: entries.filter(
        (e) => e.rosterStatus === "draft_will_be_created",
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
      { versionGroupId: "group-1", included: true, exclusionReason: "" },
      { versionGroupId: "group-2", included: true, exclusionReason: "" },
    ]);
  });
});

describe("summarizeRosterDecisions", () => {
  it("counts new drafts and exclusions", () => {
    const preview = makePreview([
      makeEntry({
        versionGroupId: "group-1",
        rosterStatus: "finalized_result",
      }),
      makeEntry({
        versionGroupId: "group-2",
        rosterStatus: "draft_will_be_created",
      }),
      makeEntry({
        versionGroupId: "group-3",
        rosterStatus: "existing_draft",
      }),
    ]);

    const decisions = [
      { versionGroupId: "group-1", included: true, exclusionReason: "" },
      {
        versionGroupId: "group-2",
        included: false,
        exclusionReason: "Tidak relevan",
      },
      { versionGroupId: "group-3", included: true, exclusionReason: "" },
    ];

    const summary = summarizeRosterDecisions(preview, decisions);

    assert.strictEqual(summary.eligibleCount, 3);
    assert.strictEqual(summary.includedCount, 2);
    assert.strictEqual(summary.excludedCount, 1);
    assert.strictEqual(summary.finalizedCount, 1);
    assert.strictEqual(summary.existingDraftCount, 1);
    assert.strictEqual(summary.newDraftCount, 0);
  });
});

describe("validateRosterDecisions", () => {
  it("requires exclusion reasons", () => {
    const decisions = [
      { versionGroupId: "group-1", included: true, exclusionReason: "" },
      { versionGroupId: "group-2", included: false, exclusionReason: "" },
      {
        versionGroupId: "group-3",
        included: false,
        exclusionReason: "OK",
      },
    ];

    const errors = validateRosterDecisions(decisions);

    assert.deepStrictEqual(errors, {
      "group-2": "Alasan pengecualian wajib diisi.",
    });
  });
});
