import assert from "node:assert/strict";
import test from "node:test";

const {
  mergeApprovalHistories,
  normalizeApprovalHistoryItems,
} = await import(new URL("./risk-activity-history.ts", import.meta.url).href);

test("normalizeApprovalHistoryItems maps mixed API casing into timeline-safe approval history", () => {
  const items = normalizeApprovalHistoryItems([
    {
      ID: "approval-1",
      Action: "submitted",
      ActorID: "actor-1",
      ActorName: "Unit A",
      ActorRole: "unit",
      Comments: "Initial submission",
      CreatedAt: "2026-04-01T08:00:00.000Z",
    },
    {
      id: "approval-2",
      action: "approved",
      actorId: "actor-2",
      actorName: "Reviewer B",
      actorRole: "reviewer",
      comments: "Approved for cycle",
      createdAt: "2026-04-03T09:00:00.000Z",
    },
  ]);

  assert.deepEqual(items, [
    {
      id: "approval-1",
      action: "submitted",
      actorId: "actor-1",
      actorName: "Unit A",
      actorRole: "unit",
      comments: "Initial submission",
      createdAt: "2026-04-01T08:00:00.000Z",
    },
    {
      id: "approval-2",
      action: "approved",
      actorId: "actor-2",
      actorName: "Reviewer B",
      actorRole: "reviewer",
      comments: "Approved for cycle",
      createdAt: "2026-04-03T09:00:00.000Z",
    },
  ]);
});

test("mergeApprovalHistories dedupes duplicate entries and sorts newest first", () => {
  const merged = mergeApprovalHistories(
    [
      {
        id: "approval-1",
        action: "submitted",
        actorId: "actor-1",
        actorName: "Unit A",
        actorRole: "unit",
        comments: "Initial submission",
        createdAt: "2026-04-01T08:00:00.000Z",
      },
      {
        id: "approval-2",
        action: "approved",
        actorId: "actor-2",
        actorName: "Reviewer B",
        actorRole: "reviewer",
        comments: "Approved for cycle",
        createdAt: "2026-04-03T09:00:00.000Z",
      },
    ],
    [
      {
        id: "approval-2",
        action: "approved",
        actorId: "actor-2",
        actorName: "Reviewer B",
        actorRole: "reviewer",
        comments: "Approved for cycle",
        createdAt: "2026-04-03T09:00:00.000Z",
      },
      {
        id: "approval-3",
        action: "returned",
        actorId: "actor-3",
        actorName: "Pimpinan C",
        actorRole: "pimpinan",
        comments: "Need clarification",
        createdAt: "2026-04-02T12:00:00.000Z",
      },
    ],
  );

  assert.deepEqual(
    merged.map((item: { id: string }) => item.id),
    ["approval-2", "approval-3", "approval-1"],
  );
});

test("mergeApprovalHistories removes semantic duplicates from risk and assessment lookups", () => {
  const merged = mergeApprovalHistories(
    [
      {
        id: "risk-submitted",
        action: "submitted",
        actorId: "actor-1",
        actorName: "Unit A",
        actorRole: "unit",
        comments: "Submitted for approval",
        createdAt: "2026-04-01T08:00:00.000Z",
      },
    ],
    [
      {
        id: "assessment-submitted",
        action: "submitted",
        actorId: "actor-1",
        actorName: "Unit A",
        actorRole: "unit",
        comments: "Submitted for approval",
        createdAt: "2026-04-01T08:00:00.000Z",
      },
    ],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.comments, "Submitted for approval");
});
