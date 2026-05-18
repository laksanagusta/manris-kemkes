import assert from "node:assert/strict";
import test from "node:test";

const approvalLineLib = await import(
  new URL("./risk-approval-line", import.meta.url).href
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

type ApprovalLineRow = {
  rowId: string;
  id: string;
  name: string;
  role?: string;
  subtitle?: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
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

function getCreateApprovalLineRow(): (
  member?: Partial<ApprovalLineRow>,
  rowId?: string,
) => ApprovalLineRow {
  const createApprovalLineRow = (
    approvalLineLib as { createApprovalLineRow?: unknown }
  ).createApprovalLineRow;

  assert.equal(
    typeof createApprovalLineRow,
    "function",
    "Expected risk-approval-line.ts to export createApprovalLineRow",
  );

  return createApprovalLineRow as (
    member?: Partial<ApprovalLineRow>,
    rowId?: string,
  ) => ApprovalLineRow;
}

function getMoveApprovalLineRows(): (
  rows: ApprovalLineRow[],
  fromIndex: number,
  toIndex: number,
) => ApprovalLineRow[] {
  const moveApprovalLineRows = (
    approvalLineLib as { moveApprovalLineRows?: unknown }
  ).moveApprovalLineRows;

  assert.equal(
    typeof moveApprovalLineRows,
    "function",
    "Expected risk-approval-line.ts to export moveApprovalLineRows",
  );

  return moveApprovalLineRows as (
    rows: ApprovalLineRow[],
    fromIndex: number,
    toIndex: number,
  ) => ApprovalLineRow[];
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

test("createApprovalLineRow keeps stable row ids and optional metadata", () => {
  const row = getCreateApprovalLineRow()(
    {
      id: "approver-1",
      name: "Approver Satu",
      role: "pimpinan",
      subtitle: "Pimpinan",
      nip: "19870101",
      jabatan: "Direktur",
      pangkat: "Pembina",
    },
    "row-1",
  );

  assert.deepEqual(row, {
    rowId: "row-1",
    id: "approver-1",
    name: "Approver Satu",
    role: "pimpinan",
    subtitle: "Pimpinan",
    nip: "19870101",
    jabatan: "Direktur",
    pangkat: "Pembina",
  });
});

test("moveApprovalLineRows reorders rows without mutating the source array", () => {
  const rows: ApprovalLineRow[] = [
    { rowId: "row-1", id: "approver-1", name: "Approver Satu" },
    { rowId: "row-2", id: "approver-2", name: "Approver Dua" },
    { rowId: "row-3", id: "approver-3", name: "Approver Tiga" },
  ];

  const moved = getMoveApprovalLineRows()(rows, 2, 0);

  assert.deepEqual(
    moved.map((row) => row.rowId),
    ["row-3", "row-1", "row-2"],
  );
  assert.deepEqual(
    rows.map((row) => row.rowId),
    ["row-1", "row-2", "row-3"],
  );
});
