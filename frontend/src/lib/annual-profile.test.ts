import assert from "node:assert/strict";
import test from "node:test";
import {
  annualMemberReadiness,
  annualProfileReadiness,
  filterAnnualCandidates,
  groupAnnualProfiles,
  saveAnnualCandidateBatch,
} from "./annual-profile";
import type {
  AnnualCandidate,
  AnnualMember,
  AnnualProfile,
} from "./api/upr-workflow";

const member: AnnualMember = {
  groupId: "g1",
  riskId: "r1",
  sourceRiskId: null,
  objectiveId: "o1",
  effectiveFrom: "2026-01-01",
  changeReason: "",
  baseline: null,
  code: "R-001",
  title: "Validasi data",
  riskStatus: "final",
  score: 15,
  canRemove: true,
};
const objectives = [{ id: "o1", title: "Data tepat waktu" }];
const profile: AnnualProfile = {
  versions: [],
  selected: null,
  members: [member],
  objectives,
};

test("empty profiles never appear ready to finalize", () => {
  assert.deepEqual(annualProfileReadiness({ ...profile, members: [] }), {
    ready: 0,
    total: 0,
    canFinalize: false,
  });
});

test("profile history groups all years and keeps the final and revision visible together", () => {
  const updatedAt = "2026-11-12T00:00:00Z";
  const rows = groupAnnualProfiles([
    {
      id: "final-1",
      year: 2026,
      version: 1,
      finalizedAt: updatedAt,
      updatedAt,
      riskCount: 2,
    },
    {
      id: "older",
      year: 2025,
      version: 1,
      finalizedAt: updatedAt,
      updatedAt,
      riskCount: 3,
    },
    {
      id: "draft-3",
      year: 2026,
      version: 3,
      finalizedAt: null,
      updatedAt,
      riskCount: 5,
    },
    {
      id: "final-2",
      year: 2026,
      version: 2,
      finalizedAt: updatedAt,
      updatedAt,
      riskCount: 4,
    },
  ]);
  assert.deepEqual(
    rows.map((row) => row.year),
    [2026, 2025],
  );
  assert.equal(rows[0].final?.id, "final-2");
  assert.equal(rows[0].draft?.id, "draft-3");
});

test("batch failures report committed IDs and stop before processing later risks", async () => {
  const candidates = [1, 2, 3].map(
    (index): AnnualCandidate => ({
      id: `r${index}`,
      groupId: `g${index}`,
      code: `R-${index}`,
      title: "Contoh",
      period: "2026-Q1",
      score: 12,
      source: "current_year",
      suggestedObjectiveId: null,
    }),
  );
  const attempted: string[] = [];
  const first = await saveAnnualCandidateBatch(
    candidates,
    async (candidate) => {
      attempted.push(candidate.id);
      if (candidate.id === "r2") throw new Error("Koneksi terputus");
    },
  );
  assert.deepEqual(first, { added: ["r1"], error: "R-2: Koneksi terputus" });
  assert.deepEqual(attempted, ["r1", "r2"]);
  const remaining = candidates.filter((item) => !first.added.includes(item.id));
  assert.deepEqual(
    await saveAnnualCandidateBatch(remaining, async () => undefined),
    { added: ["r2", "r3"] },
  );
});

test("readiness requires a final linked assessment while objectives remain optional", () => {
  assert.equal(annualProfileReadiness(profile).canFinalize, true);
  for (const changed of [
    { riskStatus: "draft" },
    { riskId: null },
  ]) {
    assert.equal(
      annualProfileReadiness({
        ...profile,
        members: [{ ...member, ...changed }],
      }).canFinalize,
      false,
    );
  }
  for (const objectiveId of [null, "removed"]) {
    assert.equal(
      annualProfileReadiness({
        ...profile,
        members: [{ ...member, objectiveId }],
      }).canFinalize,
      true,
    );
  }
  assert.equal(
    annualMemberReadiness(
      { ...member, objectiveId: null, riskStatus: "draft" },
      objectives,
    ).label,
    "Penilaian belum final",
  );
});

test("a frozen baseline stays ready when its original objective is no longer active", () => {
  const baseline = {
    riskId: "r1",
    title: "Validasi data",
    code: "R-001",
    objective: "Sasaran lama",
    score: 15,
    targetScore: 6,
    mitigations: [],
  };
  assert.equal(
    annualMemberReadiness(
      { ...member, baseline, riskStatus: "draft", objectiveId: null },
      [],
    ).ready,
    true,
  );
});

test("pickup excludes members and newer assessments, and the previous profile tab only includes its members", () => {
  const candidate: AnnualCandidate = {
    id: "r2",
    groupId: "g2",
    code: "R-002",
    title: "Validasi laporan",
    period: "2025-Q4",
    score: 12,
    source: "prior_profile",
    suggestedObjectiveId: null,
  };
  const candidates: AnnualCandidate[] = [
    candidate,
    { ...candidate, id: "r3", groupId: "g3", source: "other_active" },
    {
      ...candidate,
      id: "r4",
      groupId: "g4",
      source: "current_year",
      period: "2026-Q1",
    },
    { ...candidate, id: "r5", groupId: "g1" },
    {
      ...candidate,
      id: "r6",
      groupId: "g6",
      source: "prior_profile",
      period: "2026-Q2",
    },
  ];
  candidates.push({ ...candidate, id: "r7", groupId: "g7", period: "2027-Q1" });
  const ids = (source: "active" | "prior") =>
    filterAnnualCandidates(candidates, [member], 2026, source).map(
      (item) => item.id,
    );
  assert.deepEqual(ids("active"), ["r2", "r3", "r4", "r6"]);
  assert.deepEqual(ids("prior"), ["r2", "r6"]);
});
