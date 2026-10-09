import assert from "node:assert/strict";
import test from "node:test";

const { api, API_BASE } = await import(new URL("./api.ts", import.meta.url).href) as typeof import("./api");

test("browser auth requests use the same-origin proxy; business APIs retain their configured base URL", async () => {
  const previous = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input, options) => {
    urls.push(String(input));
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-token");
    assert.equal(new Headers(options?.headers).get("X-App-Key"), null);
    return Response.json({ data: {} });
  };
  try {
    await api.get("/auth/me", "test-token");
    await api.get("/auth/register/organizations?search=Unit", "test-token");
    await api.get("/users", "test-token");
    assert.deepEqual(urls, ["/api/auth/me", "/api/auth/register/organizations?search=Unit", `${API_BASE}/users`]);
  } finally {
    globalThis.fetch = previous;
  }
});
