import assert from "node:assert/strict";
import test from "node:test";

const approvalLineLib = await import(
  new URL("./risk-approval-line.ts", import.meta.url).href
);

type ApprovalLineMember = {
  id: string;
  name: string;
  type?: string;
  role?: string;
};

type ApprovalLineResolution = {
  reviewerId: string;
  approvalLine: ApprovalLineMember[];
};

function getResolver(): (
  draftApprovalLine: ApprovalLineMember[] | null | undefined,
  reviewedBy?: string | null,
) => ApprovalLineResolution {
  const resolver = (
    approvalLineLib as { resolveDraftApprovalLine?: unknown }
  ).resolveDraftApprovalLine;

  assert.equal(
    typeof resolver,
    "function",
    "Expected risk-approval-line.ts to export resolveDraftApprovalLine",
  );

  return resolver as (
    draftApprovalLine: ApprovalLineMember[] | null | undefined,
    reviewedBy?: string | null,
  ) => ApprovalLineResolution;
}

test("resolveDraftApprovalLine keeps typed reviewer and approvers unchanged", () => {
  const resolved = getResolver()(
    [
      { id: "reviewer-1", name: "Reviewer Satu", type: "review" },
      { id: "approver-1", name: "Approver Satu", type: "approval" },
      { id: "approver-2", name: "Approver Dua", type: "approval" },
    ],
    null,
  );

  assert.equal(resolved.reviewerId, "reviewer-1");
  assert.deepEqual(resolved.approvalLine, [
    { id: "approver-1", name: "Approver Satu", type: "approval" },
    { id: "approver-2", name: "Approver Dua", type: "approval" },
  ]);
});

test("resolveDraftApprovalLine uses reviewedBy to separate legacy untyped members", () => {
  const resolved = getResolver()(
    [
      { id: "approver-1", name: "Approver Satu" },
      { id: "reviewer-1", name: "Reviewer Satu" },
      { id: "approver-2", name: "Approver Dua" },
    ],
    "reviewer-1",
  );

  assert.equal(resolved.reviewerId, "reviewer-1");
  assert.deepEqual(resolved.approvalLine, [
    { id: "approver-1", name: "Approver Satu" },
    { id: "approver-2", name: "Approver Dua" },
  ]);
});

test("resolveDraftApprovalLine falls back to the first legacy member as reviewer", () => {
  const resolved = getResolver()(
    [
      { id: "reviewer-1", name: "Reviewer Satu" },
      { id: "approver-1", name: "Approver Satu" },
      { id: "approver-2", name: "Approver Dua" },
    ],
    null,
  );

  assert.equal(resolved.reviewerId, "reviewer-1");
  assert.deepEqual(resolved.approvalLine, [
    { id: "approver-1", name: "Approver Satu" },
    { id: "approver-2", name: "Approver Dua" },
  ]);
});
