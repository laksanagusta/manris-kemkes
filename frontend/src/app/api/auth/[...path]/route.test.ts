import assert from "node:assert/strict";
import test from "node:test";

const route = await import(new URL("./route.ts", import.meta.url).href) as typeof import("./route");
const context = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) });
const originalFetch = globalThis.fetch;
const originalKey = process.env.MANRIS_APP_KEY;
const originalURL = process.env.AUTH_SERVICE_URL;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.MANRIS_APP_KEY;
  else process.env.MANRIS_APP_KEY = originalKey;
  if (originalURL === undefined) delete process.env.AUTH_SERVICE_URL;
  else process.env.AUTH_SERVICE_URL = originalURL;
});

test("proxy injects server key and bearer; preserves query and error status without exposing headers", async () => {
  process.env.MANRIS_APP_KEY = "server-test-key";
  process.env.AUTH_SERVICE_URL = "http://localhost:8080/api/v1";
  globalThis.fetch = async (input, options) => {
    assert.equal(String(input), "http://localhost:8080/api/v1/auth/register/organizations?search=Unit");
    const headers = new Headers(options?.headers);
    assert.equal(headers.get("X-App-Key"), "server-test-key");
    assert.equal(headers.get("Authorization"), "Bearer test-token");
    assert.equal(options?.cache, "no-store");
    assert.equal(options?.redirect, "error");
    return Response.json({ error: "Denied" }, { status: 401, headers: { "X-App-Key": "never-forward-this" } });
  };
  const response = await route.GET(new Request("http://localhost:3000/api/auth/register/organizations?search=Unit", {
    headers: { Authorization: "Bearer test-token", "X-App-Key": "browser-spoof" },
  }), context("register/organizations"));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-App-Key"), null);
});

test("proxy rejects missing configuration, cross-origin callers and non-auth destinations", async () => {
  globalThis.fetch = async () => { throw new Error("upstream must not be called"); };
  delete process.env.MANRIS_APP_KEY;
  assert.equal((await route.GET(new Request("http://localhost:3000/api/auth/me"), context("me"))).status, 503);
  process.env.MANRIS_APP_KEY = "server-test-key";
  assert.equal((await route.POST(new Request("http://localhost:3000/api/auth/login", { method: "POST", headers: { origin: "https://other.test" } }), context("login"))).status, 403);
  assert.equal((await route.GET(new Request("http://localhost:3000/api/auth/risks"), context("../risks"))).status, 404);
  assert.equal((await route.GET(new Request("http://localhost:3000/api/auth/login"), context("login"))).status, 404);
});

test("proxy fails closed when configured key belongs to another application", async () => {
  process.env.MANRIS_APP_KEY = "wrong-application-key";
  process.env.AUTH_SERVICE_URL = "http://localhost:8080/api/v1";
  globalThis.fetch = async () => Response.json({ data: { appId: "external" } });
  assert.equal((await route.POST(new Request("http://localhost:3000/api/auth/login", { method: "POST", body: "{}" }), context("login"))).status, 503);
  globalThis.fetch = async () => Response.json({ data: { id: "test" } }, { headers: { "X-Auth-App-Id": "external" } });
  assert.equal((await route.GET(new Request("http://localhost:3000/api/auth/me"), context("me"))).status, 503);
});

test("proxy forwards login JSON, preserves no-content logout, and sanitizes network failures", async () => {
  process.env.MANRIS_APP_KEY = "server-test-key";
  process.env.AUTH_SERVICE_URL = "http://localhost:8080/api/v1";
  globalThis.fetch = async (_input, options) => {
    assert.equal(options?.body, '{"nip":"123","password":"dummy"}');
    return Response.json({ data: { appId: "manris", token: "dummy-token" } });
  };
  const login = await route.POST(new Request("http://localhost:3000/api/auth/login", { method: "POST", body: '{"nip":"123","password":"dummy"}' }), context("login"));
  assert.equal(login.status, 200);
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal((await route.POST(new Request("http://localhost:3000/api/auth/logout", { method: "POST" }), context("logout"))).status, 204);
  globalThis.fetch = async () => { throw new Error("secret connection string"); };
  const unavailable = await route.GET(new Request("http://localhost:3000/api/auth/me"), context("me"));
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.text()).includes("secret"), false);
});

test("proxy allows shared user list and UUID detail with GET only", async () => {
  process.env.MANRIS_APP_KEY = "server-test-key";
  process.env.AUTH_SERVICE_URL = "http://localhost:8080/api/v1";
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    paths.push(new URL(String(input)).pathname);
    return Response.json({ data: [] });
  };
  const id = "00000000-0000-0000-0000-000000000001";
  for (const path of ["users", `users/${id}`]) {
    assert.equal((await route.GET(new Request(`http://localhost:3000/api/auth/${path}`), context(path))).status, 200);
    assert.equal((await route.POST(new Request(`http://localhost:3000/api/auth/${path}`, { method: "POST" }), context(path))).status, 404);
  }
  assert.deepEqual(paths, ["/api/v1/auth/users", `/api/v1/auth/users/${id}`]);
});
