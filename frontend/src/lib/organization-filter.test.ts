import assert from "node:assert/strict";
import test from "node:test";
import { hasOrganizationChildren, visibleOrganizationFilterFields } from "./organization-filter";
import type { TableFilterField } from "@/components/shared/design-system/collections/dynamic-table-filter-state";

const parent = { organizationId: "parent", accessibleOrgIds: ["parent", "child", "grandchild"], isGlobal: false };
const leaf = { organizationId: "leaf", accessibleOrgIds: ["leaf"], isGlobal: false };

test("organization filter follows the account hierarchy, including when no records match", () => {
  assert.equal(hasOrganizationChildren(parent), true);
  assert.equal(hasOrganizationChildren(leaf), false);
  assert.equal(hasOrganizationChildren(null), false);
  assert.equal(hasOrganizationChildren({ ...parent, organizationId: null }), false);
  assert.equal(hasOrganizationChildren({ ...leaf, accessibleOrgIds: [] }), false);
});

test("global access does not imply that an account organization has children", () => {
  const global = { ...parent, accessibleOrgIds: [], isGlobal: true };
  assert.equal(hasOrganizationChildren(global, [{ id: "unrelated", parentId: "another" }]), false);
  assert.equal(hasOrganizationChildren(global, [{ id: "child", parentId: "parent" }]), true);
  assert.equal(hasOrganizationChildren({ ...global, organizationId: null }, [{ id: "child", parentId: "parent" }]), false);
});

test("leaf organizations omit active and required organization chips with every label", () => {
  const fields: TableFilterField[] = [
    { id: "status", label: "Status", value: "draft", onChange() {} },
    ...["Organisasi", "Unit", "Satker", "Unit pengirim"].map((label) => ({
      id: label, label, value: "child", required: true, organizationScope: true, onChange() {},
    })),
  ];
  assert.deepEqual(visibleOrganizationFilterFields(fields, false).map(({ id }) => id), ["status"]);
  assert.deepEqual(visibleOrganizationFilterFields(fields, true), fields);
});
