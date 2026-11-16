import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const login = readFileSync(new URL("./login-screen.tsx", import.meta.url), "utf8");
const register = readFileSync(new URL("./register-screen.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./auth-card.tsx", import.meta.url), "utf8");

test("shares the Manrisk auth card with a dedicated footer", () => {
  assert.match(card, /<CardHeader[\s\S]*?<ManriskMark[\s\S]*?<h1/);
  assert.match(card, /<CardContent>\{children\}<\/CardContent>/);
  assert.match(card, /<CardFooter[\s\S]*?\{footer\}/);
  assert.match(login, /<AuthCard[\s\S]*?title="Masuk ke Manrisk"/);
  assert.match(register, /<AuthCard[\s\S]*?title=\{[^\n]*"Buat akun baru"/);
});

test("keeps the labelled NIP and password fields connected to Manrisk login", () => {
  assert.match(login, /<FieldLabel htmlFor="nip">/);
  assert.match(login, /id="nip"[\s\S]*?autoComplete="username"/);
  assert.match(login, /<FieldLabel htmlFor="password">/);
  assert.match(login, /id="password"[\s\S]*?autoComplete="current-password"/);
  assert.match(login, /aria-pressed=\{showPassword\}/);
  assert.match(login, /<form onSubmit=\{handleSubmit\}/);
  assert.match(login, /await login\(nip, password\)/);
  assert.match(login, /router\.replace\(result\.redirectTo\)/);
});

test("keeps navigation and help in the auth footers", () => {
  assert.match(login, /footer=\{[\s\S]*?<Link href="\/register"/);
  assert.match(login, /<Link href="\/docs"/);
  assert.match(login, /href="\/forgot-password"[\s\S]*?Lupa password\?/);
  assert.match(register, /footer=\{[\s\S]*?<Link href="\/login"/);
});
