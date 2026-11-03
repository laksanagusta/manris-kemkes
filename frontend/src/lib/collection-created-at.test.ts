import assert from "node:assert/strict";
import test from "node:test";
import { collectionCreatedAt, newestCreatedFirst } from "./collection-created-at.ts";

test("sorts creation time descending before pagination, with stable ties and missing dates last", () => {
 const rows=[{id:"old",createdAt:"2026-01-01T00:00:00Z"},{id:"missing"},{id:"a",created_at:"2026-11-03T09:00:00Z"},{id:"z",createdAt:"2026-11-03T16:00:00+07:00"},{id:"bad",createdAt:"invalid"}];
 const sorted=[...rows].sort(newestCreatedFirst);
 assert.deepEqual(sorted.slice(0,3).map(row=>row.id),["z","a","old"]);
 assert.equal(rows[0].id,"old");
 assert.equal(collectionCreatedAt({CreatedAt:"2026-11-03T00:00:00Z"}),"2026-11-03T00:00:00Z");
 assert.equal(collectionCreatedAt({createdAt:"invalid"}),undefined);
});
