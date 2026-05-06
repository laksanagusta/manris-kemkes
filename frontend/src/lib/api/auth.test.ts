import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

const calls: Array<{ path: string; body: unknown }> = [];
globalThis.__authApiCalls = calls;

register(
  "data:text/javascript," +
    encodeURIComponent([
      "export async function resolve(specifier, context, next) {",
      '  if (specifier === "@/lib/api") {',
      "    return {",
      '      url: "data:text/javascript,export const api = { post: async (path, body) => { globalThis.__authApiCalls.push({ path, body }); return { message: \\"ok\\" }; } };",',
      "      shortCircuit: true,",
      "    };",
      "  }",
      "  return next(specifier, context);",
      "}",
    ].join("\n")),
);

const authApi = (await import(new URL("./auth.ts", import.meta.url).href)) as typeof import("./auth");

test("registerUser sends confirmPassword with the registration payload", async () => {
  await authApi.registerUser({
    name: "Siti Rahma",
    email: "siti@kemenkes.go.id",
    phoneNumber: "081234567890",
    password: "TempPass123!",
    confirmPassword: "TempPass123!",
    organizationId: "org-1",
    nip: "199001012020122001",
    jabatan: "Staf",
    pangkat: "III/a",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.path, "/auth/register");
  assert.deepEqual(calls[0]?.body, {
    name: "Siti Rahma",
    email: "siti@kemenkes.go.id",
    phoneNumber: "081234567890",
    password: "TempPass123!",
    confirmPassword: "TempPass123!",
    organizationId: "org-1",
    nip: "199001012020122001",
    jabatan: "Staf",
    pangkat: "III/a",
  });
});
