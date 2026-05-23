import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSelectableReportOrganizations,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "./report-scope.ts";

test("needsExplicitReportOrgSelection is false when the user has an organization", () => {
  assert.equal(
    needsExplicitReportOrgSelection({
      isGlobal: false,
      organizationId: "org-own",
      accessibleOrgIds: ["org-own", "org-child"],
    }),
    false,
  );
});

test("needsExplicitReportOrgSelection is true when a non-global user has no organization", () => {
  assert.equal(
    needsExplicitReportOrgSelection({
      isGlobal: false,
      organizationId: null,
      accessibleOrgIds: ["org-child"],
    }),
    true,
  );
});

test("resolveDefaultReportOrgId returns own org when no explicit selection is needed", () => {
  assert.equal(
    resolveDefaultReportOrgId({
      isGlobal: false,
      organizationId: "org-own",
      accessibleOrgIds: ["org-own"],
    }),
    "org-own",
  );
});

test("resolveDefaultReportOrgId still returns own org when multiple orgs are accessible", () => {
  assert.equal(
    resolveDefaultReportOrgId({
      isGlobal: false,
      organizationId: "org-own",
      accessibleOrgIds: ["org-own", "org-child"],
    }),
    "org-own",
  );
});

test("buildSelectableReportOrganizations keeps only accessible orgs", () => {
  const result = buildSelectableReportOrganizations(
    {
      isGlobal: false,
      organizationId: "org-own",
      accessibleOrgIds: ["org-own", "org-child"],
    },
    [
      { id: "org-own", name: "Own", createdAt: "" },
      { id: "org-child", name: "Child", createdAt: "" },
      { id: "org-other", name: "Other", createdAt: "" },
    ],
  );

  assert.deepEqual(
    result.map((item) => item.id),
    ["org-own", "org-child"],
  );
});
