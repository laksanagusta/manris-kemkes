import assert from "node:assert/strict";
import test from "node:test";

const riskRegisterUserPickerLib = await import(
  new URL("./risk-register-user-picker.ts", import.meta.url).href,
).catch(() => ({}));

type UserPickerOption = {
  id: string;
  name: string;
  role?: string;
  subtitle?: string;
};

function getAppendUniqueUserOptions(): (
  current: UserPickerOption[],
  nextPage: UserPickerOption[],
) => UserPickerOption[] {
  const appendUniqueUserOptions = (
    riskRegisterUserPickerLib as { appendUniqueUserOptions?: unknown }
  ).appendUniqueUserOptions;

  assert.equal(
    typeof appendUniqueUserOptions,
    "function",
    "Expected risk-register-user-picker.ts to export appendUniqueUserOptions",
  );

  return appendUniqueUserOptions as (
    current: UserPickerOption[],
    nextPage: UserPickerOption[],
  ) => UserPickerOption[];
}

function getMergeRemoteUserPickerOptions(): (params: {
  current: UserPickerOption[];
  nextPage: UserPickerOption[];
  page: number;
  selected: UserPickerOption | null;
}) => UserPickerOption[] {
  const mergeRemoteUserPickerOptions = (
    riskRegisterUserPickerLib as {
      mergeRemoteUserPickerOptions?: unknown;
    }
  ).mergeRemoteUserPickerOptions;

  assert.equal(
    typeof mergeRemoteUserPickerOptions,
    "function",
    "Expected risk-register-user-picker.ts to export mergeRemoteUserPickerOptions",
  );

  return mergeRemoteUserPickerOptions as (params: {
    current: UserPickerOption[];
    nextPage: UserPickerOption[];
    page: number;
    selected: UserPickerOption | null;
  }) => UserPickerOption[];
}

function getFilterApproverOptions(): (
  options: UserPickerOption[],
  params: { reviewerId?: string; selectedApproverIds?: string[] },
) => UserPickerOption[] {
  const filterApproverOptions = (
    riskRegisterUserPickerLib as { filterApproverOptions?: unknown }
  ).filterApproverOptions;

  assert.equal(
    typeof filterApproverOptions,
    "function",
    "Expected risk-register-user-picker.ts to export filterApproverOptions",
  );

  return filterApproverOptions as (
    options: UserPickerOption[],
    params: { reviewerId?: string; selectedApproverIds?: string[] },
  ) => UserPickerOption[];
}

function getNextUserPickerActiveIndex(): (params: {
  currentIndex: number;
  total: number;
  direction: 1 | -1;
}) => number {
  const getNextUserPickerActiveIndex = (
    riskRegisterUserPickerLib as {
      getNextUserPickerActiveIndex?: unknown;
    }
  ).getNextUserPickerActiveIndex;

  assert.equal(
    typeof getNextUserPickerActiveIndex,
    "function",
    "Expected risk-register-user-picker.ts to export getNextUserPickerActiveIndex",
  );

  return getNextUserPickerActiveIndex as (params: {
    currentIndex: number;
    total: number;
    direction: 1 | -1;
  }) => number;
}

test("appendUniqueUserOptions dedupes repeated users across pages", () => {
  const options = getAppendUniqueUserOptions()(
    [
      { id: "user-1", name: "Reviewer Satu", role: "reviewer" },
      { id: "user-2", name: "Pimpinan Satu", role: "pimpinan" },
    ],
    [
      { id: "user-2", name: "Pimpinan Satu (duplikat)", role: "pimpinan" },
      { id: "user-3", name: "Super Admin", role: "superadmin" },
    ],
  );

  assert.deepEqual(options, [
    { id: "user-1", name: "Reviewer Satu", role: "reviewer" },
    { id: "user-2", name: "Pimpinan Satu", role: "pimpinan" },
    { id: "user-3", name: "Super Admin", role: "superadmin" },
  ]);
});

test("mergeRemoteUserPickerOptions resets to selected value plus first page results", () => {
  const options = getMergeRemoteUserPickerOptions()({
    current: [
      { id: "stale-1", name: "User Lama", role: "unit" },
      { id: "stale-2", name: "User Lama Kedua", role: "pimpinan" },
    ],
    nextPage: [
      { id: "reviewer-2", name: "Reviewer Dua", role: "reviewer" },
      { id: "reviewer-3", name: "Reviewer Tiga", role: "reviewer" },
    ],
    page: 1,
    selected: {
      id: "reviewer-1",
      name: "Reviewer Saat Ini",
      role: "reviewer",
      subtitle: "Reviewer",
    },
  });

  assert.deepEqual(options, [
    {
      id: "reviewer-1",
      name: "Reviewer Saat Ini",
      role: "reviewer",
      subtitle: "Reviewer",
    },
    { id: "reviewer-2", name: "Reviewer Dua", role: "reviewer" },
    { id: "reviewer-3", name: "Reviewer Tiga", role: "reviewer" },
  ]);
});

test("mergeRemoteUserPickerOptions dedupes selected user and repeated later pages", () => {
  const options = getMergeRemoteUserPickerOptions()({
    current: [
      {
        id: "approver-1",
        name: "Approver Pertama",
        role: "pimpinan",
        subtitle: "Pimpinan",
      },
      { id: "approver-2", name: "Approver Kedua", role: "unit" },
    ],
    nextPage: [
      {
        id: "approver-1",
        name: "Approver Pertama (duplikat)",
        role: "pimpinan",
      },
      { id: "approver-3", name: "Approver Ketiga", role: "superadmin" },
    ],
    page: 2,
    selected: {
      id: "approver-1",
      name: "Approver Pertama",
      role: "pimpinan",
      subtitle: "Pimpinan",
    },
  });

  assert.deepEqual(options, [
    {
      id: "approver-1",
      name: "Approver Pertama",
      role: "pimpinan",
      subtitle: "Pimpinan",
    },
    { id: "approver-2", name: "Approver Kedua", role: "unit" },
    { id: "approver-3", name: "Approver Ketiga", role: "superadmin" },
  ]);
});

test("filterApproverOptions removes reviewer-role users from approver results", () => {
  const options = getFilterApproverOptions()(
    [
      { id: "reviewer-1", name: "Reviewer", role: "reviewer" },
      { id: "approver-1", name: "Pimpinan", role: "pimpinan" },
      { id: "approver-2", name: "Super Admin", role: "superadmin" },
    ],
    {},
  );

  assert.deepEqual(options, [
    { id: "approver-1", name: "Pimpinan", role: "pimpinan" },
    { id: "approver-2", name: "Super Admin", role: "superadmin" },
  ]);
});

test("filterApproverOptions removes the current reviewer and already selected approvers", () => {
  const options = getFilterApproverOptions()(
    [
      { id: "reviewer-1", name: "Reviewer Saat Ini", role: "pimpinan" },
      { id: "approver-1", name: "Approver Pertama", role: "pimpinan" },
      { id: "approver-2", name: "Approver Kedua", role: "superadmin" },
      { id: "approver-3", name: "Approver Ketiga", role: "unit" },
    ],
    {
      reviewerId: "reviewer-1",
      selectedApproverIds: ["approver-1", "approver-2"],
    },
  );

  assert.deepEqual(options, [
    { id: "approver-3", name: "Approver Ketiga", role: "unit" },
  ]);
});

test("getNextUserPickerActiveIndex moves keyboard focus within bounds", () => {
  const getNextIndex = getNextUserPickerActiveIndex();

  assert.equal(
    getNextIndex({ currentIndex: -1, total: 3, direction: 1 }),
    0,
  );
  assert.equal(
    getNextIndex({ currentIndex: 0, total: 3, direction: 1 }),
    1,
  );
  assert.equal(
    getNextIndex({ currentIndex: 2, total: 3, direction: 1 }),
    2,
  );
  assert.equal(
    getNextIndex({ currentIndex: 2, total: 3, direction: -1 }),
    1,
  );
  assert.equal(
    getNextIndex({ currentIndex: 0, total: 3, direction: -1 }),
    0,
  );
});

test("getNextUserPickerActiveIndex returns -1 when no options exist", () => {
  const getNextIndex = getNextUserPickerActiveIndex();

  assert.equal(
    getNextIndex({ currentIndex: -1, total: 0, direction: 1 }),
    -1,
  );
});
