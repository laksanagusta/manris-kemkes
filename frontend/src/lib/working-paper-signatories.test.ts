import assert from "node:assert/strict";
import test from "node:test";

let workingPaperSignatoriesLib: unknown = null;
let workingPaperSignatoriesImportError: unknown = null;

try {
  workingPaperSignatoriesLib = await import(
    new URL("./working-paper-signatories.ts", import.meta.url).href,
  );
} catch (error) {
  workingPaperSignatoriesImportError = error;
}

type WorkingPaperSignatoryDraft = {
  user_id: string;
  signer_name: string;
  signer_jabatan: string;
  signer_pangkat: string;
  signer_nip?: string;
};

function getCreateEmptyWorkingPaperSignatory(): () => WorkingPaperSignatoryDraft {
  assert.equal(
    workingPaperSignatoriesImportError,
    null,
    "Expected working-paper-signatories.ts to exist",
  );

  const createEmptyWorkingPaperSignatory = (
    workingPaperSignatoriesLib as {
      createEmptyWorkingPaperSignatory?: unknown;
    }
  ).createEmptyWorkingPaperSignatory;

  assert.equal(
    typeof createEmptyWorkingPaperSignatory,
    "function",
    "Expected working-paper-signatories.ts to export createEmptyWorkingPaperSignatory",
  );

  return createEmptyWorkingPaperSignatory as () => WorkingPaperSignatoryDraft;
}

function getMoveWorkingPaperSignatories(): (
  signatories: WorkingPaperSignatoryDraft[],
  fromIndex: number,
  toIndex: number,
) => WorkingPaperSignatoryDraft[] {
  assert.equal(
    workingPaperSignatoriesImportError,
    null,
    "Expected working-paper-signatories.ts to exist",
  );

  const moveWorkingPaperSignatories = (
    workingPaperSignatoriesLib as {
      moveWorkingPaperSignatories?: unknown;
    }
  ).moveWorkingPaperSignatories;

  assert.equal(
    typeof moveWorkingPaperSignatories,
    "function",
    "Expected working-paper-signatories.ts to export moveWorkingPaperSignatories",
  );

  return moveWorkingPaperSignatories as (
    signatories: WorkingPaperSignatoryDraft[],
    fromIndex: number,
    toIndex: number,
  ) => WorkingPaperSignatoryDraft[];
}

test("createEmptyWorkingPaperSignatory returns a blank signer draft", () => {
  assert.deepEqual(getCreateEmptyWorkingPaperSignatory()(), {
    user_id: "",
    signer_name: "",
    signer_jabatan: "",
    signer_pangkat: "",
    signer_nip: "",
  });
});

test("moveWorkingPaperSignatories reorders rows without mutating the source array", () => {
  const signatories: WorkingPaperSignatoryDraft[] = [
    {
      user_id: "user-1",
      signer_name: "Signer 1",
      signer_jabatan: "Jabatan 1",
      signer_pangkat: "Pangkat 1",
      signer_nip: "111",
    },
    {
      user_id: "user-2",
      signer_name: "Signer 2",
      signer_jabatan: "Jabatan 2",
      signer_pangkat: "Pangkat 2",
      signer_nip: "222",
    },
    {
      user_id: "user-3",
      signer_name: "Signer 3",
      signer_jabatan: "Jabatan 3",
      signer_pangkat: "Pangkat 3",
      signer_nip: "333",
    },
  ];

  const moved = getMoveWorkingPaperSignatories()(signatories, 2, 0);

  assert.deepEqual(
    moved.map((signatory) => signatory.user_id),
    ["user-3", "user-1", "user-2"],
  );
  assert.deepEqual(
    signatories.map((signatory) => signatory.user_id),
    ["user-1", "user-2", "user-3"],
  );
});
