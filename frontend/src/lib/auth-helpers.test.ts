import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent([
  "export async function resolve(specifier, context, next) {",
  '  if (specifier === "@/contexts/auth-context") {',
  '    return { url: "data:text/javascript,export const User = undefined;", shortCircuit: true };',
  "  }",
  '  if (specifier === "@/lib/api") {',
  '    return { url: "data:text/javascript,export class ApiError extends Error {}", shortCircuit: true };',
  "  }",
  '  if (specifier.startsWith("@/")) {',
  '    return { url: "data:text/javascript,", shortCircuit: true };',
  "  }",
  "  return next(specifier, context);",
  "}",
].join("\n")));

const authHelpers = (await import(
  new URL("./auth-helpers.ts", import.meta.url).href
)) as typeof import("./auth-helpers");

const orgLib = (await import(
  new URL("./organization.ts", import.meta.url).href
)) as typeof import("./organization");

const { canWriteInOrg, canReadOrg, isReadOnlyForOrg } = authHelpers;
const { filterToAccessibleOrgs } = orgLib;

type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  organizationId: string | null;
  orgName: string;
  status: string;
  accessibleOrgIds: string[];
  isGlobal: boolean;
};

type Organization = {
  id: string;
  name: string;
  parent_id?: string;
  created_at: string;
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    name: "Test User",
    username: "testuser",
    email: "test@example.com",
    role: "unit",
    organizationId: "org-A",
    orgName: "Org A",
    status: "active",
    accessibleOrgIds: ["org-A"],
    isGlobal: false,
    ...overrides,
  };
}

function makeOrg(id: string, name: string): Organization {
  return { id, name, created_at: "2026-01-01T00:00:00.000Z" };
}

test("canWriteInOrg returns false for null user", () => {
  assert.equal(canWriteInOrg(null, "org-A"), false);
});

test("canWriteInOrg returns true for global user", () => {
  const user = makeUser({ isGlobal: true });
  assert.equal(canWriteInOrg(user, "org-X"), true);
});

test("canWriteInOrg returns true for own org", () => {
  const user = makeUser({ organizationId: "org-A" });
  assert.equal(canWriteInOrg(user, "org-A"), true);
});

test("canWriteInOrg returns false for descendant org", () => {
  const user = makeUser({
    organizationId: "org-A",
    accessibleOrgIds: ["org-A", "org-B"],
  });
  assert.equal(canWriteInOrg(user, "org-B"), false);
});

test("canReadOrg returns false for null user", () => {
  assert.equal(canReadOrg(null, "org-A"), false);
});

test("canReadOrg returns true for global user", () => {
  const user = makeUser({ isGlobal: true });
  assert.equal(canReadOrg(user, "org-X"), true);
});

test("canReadOrg returns true for accessible org", () => {
  const user = makeUser({ accessibleOrgIds: ["org-A", "org-B"] });
  assert.equal(canReadOrg(user, "org-B"), true);
});

test("canReadOrg returns false for inaccessible org", () => {
  const user = makeUser({ accessibleOrgIds: ["org-A"] });
  assert.equal(canReadOrg(user, "org-C"), false);
});

test("isReadOnlyForOrg returns false for null user", () => {
  assert.equal(isReadOnlyForOrg(null, "org-A"), false);
});

test("isReadOnlyForOrg returns false for global user", () => {
  const user = makeUser({ isGlobal: true });
  assert.equal(isReadOnlyForOrg(user, "org-X"), false);
});

test("isReadOnlyForOrg returns true for descendant org", () => {
  const user = makeUser({
    organizationId: "org-A",
    accessibleOrgIds: ["org-A", "org-B"],
  });
  assert.equal(isReadOnlyForOrg(user, "org-B"), true);
});

test("isReadOnlyForOrg returns false for own org", () => {
  const user = makeUser({
    organizationId: "org-A",
    accessibleOrgIds: ["org-A"],
  });
  assert.equal(isReadOnlyForOrg(user, "org-A"), false);
});

test("filterToAccessibleOrgs keeps only accessible orgs", () => {
  const orgs = [makeOrg("org-A", "A"), makeOrg("org-B", "B"), makeOrg("org-C", "C")];
  const result = filterToAccessibleOrgs(orgs, ["org-A", "org-C"]);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, "org-A");
  assert.equal(result[1].id, "org-C");
});

test("filterToAccessibleOrgs returns empty for no accessible orgs", () => {
  const orgs = [makeOrg("org-A", "A"), makeOrg("org-B", "B")];
  const result = filterToAccessibleOrgs(orgs, ["org-X"]);
  assert.equal(result.length, 0);
});

test("filterToAccessibleOrgs returns all when all accessible", () => {
  const orgs = [makeOrg("org-A", "A"), makeOrg("org-B", "B")];
  const result = filterToAccessibleOrgs(orgs, ["org-A", "org-B"]);
  assert.equal(result.length, 2);
});
