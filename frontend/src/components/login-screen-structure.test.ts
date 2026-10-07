import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./login-screen.tsx", import.meta.url), "utf8");

test("uses the split-screen login layout with a brand panel", () => {
  assert.doesNotMatch(source, /from "next\/image"/);
  assert.doesNotMatch(source, /<Card(?:\s|>)/);
  assert.doesNotMatch(source, /logo\.svg/);
  assert.match(source, /<aside className="hidden w-\[38%\][\s\S]*?bg-neutral-900/);
  assert.match(source, /Masuk ke Manrisk/);
  assert.match(source, /Isi NIP dan password untuk melanjutkan\./);
  assert.match(source, /<form onSubmit=\{handleSubmit\} className="mt-8 flex flex-col gap-5">/);
});

test("keeps the NIP and password fields functional", () => {
  assert.match(source, /id="nip"[\s\S]*?autoComplete="username"/);
  assert.match(source, /id="password"[\s\S]*?autoComplete="current-password"/);
  assert.match(source, /aria-label=\{showPassword \? "Sembunyikan password" : "Tampilkan password"\}/);
  assert.match(source, /<Button type="submit" className="h-12 w-full rounded-lg"/);
  assert.match(source, /<Link href="\/register"[\s\S]*?>\s*Daftar\s*<\/Link>/);
});

test("keeps brand navigation and help affordances", () => {
  assert.doesNotMatch(source, /Kembali ke beranda/);
  assert.match(source, /<Link href="\/docs"[\s\S]*?>\s*Docs\s*<\/Link>/);
  assert.match(source, /Kendala masuk\? Hubungi administrator\./);
});

test("aligns the form top with the brand headline", () => {
  assert.match(source, /<div aria-hidden="true" className="hidden h-7 md:block" \/>/);
  assert.match(source, /<div className="md:mt-10">/);
});
