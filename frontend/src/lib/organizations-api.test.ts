import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent([
      "export async function resolve(specifier, context, next) {",
      '  if (specifier === "@/lib/api") {',
      '    return { url: "data:text/javascript,export const api = {};", shortCircuit: true };',
      "  }",
      "  return next(specifier, context);",
      "}",
    ].join("\n")),
);

const organizationsApi = (await import(
  new URL("./api/organizations", import.meta.url).href
)) as typeof import("./api/organizations");

const { collectAllOrganizations } = organizationsApi;

test("collectAllOrganizations loads all pages up to the reported total", async () => {
  const requestedPages: Array<{ page: number; limit: number }> = [];

  const result = await collectAllOrganizations(async ({ page, limit }) => {
    requestedPages.push({ page, limit });

    if (page === 1) {
      return {
        data: [
          { id: "org-1", name: "Org 1", createdAt: "2026-04-12T00:00:00.000Z" },
          { id: "org-2", name: "Org 2", createdAt: "2026-04-12T00:00:00.000Z" },
        ],
        total: 3,
        page,
        limit,
      };
    }

    return {
      data: [{ id: "org-3", name: "Org 3", createdAt: "2026-04-12T00:00:00.000Z" }],
      total: 3,
      page,
      limit,
    };
  });

  assert.deepEqual(
    requestedPages,
    [
      { page: 1, limit: 100 },
      { page: 2, limit: 100 },
    ],
  );
  assert.deepEqual(result.map((item) => item.id), ["org-1", "org-2", "org-3"]);
});

test("collectAllOrganizations returns an empty list when the first page has no data", async () => {
  const result = await collectAllOrganizations(async ({ page, limit }) => ({
    data: [],
    total: 0,
    page,
    limit,
  }));

  assert.deepEqual(result, []);
});
