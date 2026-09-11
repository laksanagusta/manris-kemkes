import assert from "node:assert/strict";
import test from "node:test";

const { paginationItems } = (await import(
  new URL("./collection-pagination-items.ts", import.meta.url).href
)) as typeof import("./collection-pagination-items");
const { shouldShowCollectionPagination } = (await import(
  new URL("./collection-pagination-visibility.ts", import.meta.url).href
)) as typeof import("./collection-pagination-visibility");

test("pagination keeps a stable five-page window", () => {
  assert.deepEqual(paginationItems(1, 8), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginationItems(4, 8), [2, 3, 4, 5, 6]);
  assert.deepEqual(paginationItems(8, 8), [4, 5, 6, 7, 8]);
  assert.deepEqual(paginationItems(2, 3), [1, 2, 3]);
});

test("pagination footer is hidden for ten items or fewer", () => {
  assert.equal(shouldShowCollectionPagination(0), false);
  assert.equal(shouldShowCollectionPagination(10), false);
  assert.equal(shouldShowCollectionPagination(11), true);
});
