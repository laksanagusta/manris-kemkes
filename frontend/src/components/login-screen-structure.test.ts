import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./login-screen.tsx", import.meta.url), "utf8");

test("keeps the login surface free of the card wrapper and logo", () => {
  assert.doesNotMatch(source, /from "next\/image"/);
  assert.doesNotMatch(source, /<Card(?:\s|>)/);
  assert.doesNotMatch(source, /logo\.svg/);
  assert.match(source, /<h1 className="text-\[20px\] leading-5 font-medium tracking-tight text-balance">/);
  assert.match(
    source,
    /<span className="font-logo text-\[20px\] leading-5 font-semibold lowercase tracking-\[-0\.4px\] text-foreground">\s*Manris\s*<\/span>/,
  );
  assert.match(source, /<form onSubmit=\{handleSubmit\} className="flex flex-col gap-4">/);
  assert.doesNotMatch(source, /ArrowRight/);
  assert.match(source, /className="!h-10 w-full rounded-full"/);
  assert.match(source, /<div className="flex items-center justify-center">/);
  assert.match(
    source,
    /<span className="mx-2 inline-flex items-center leading-none text-muted-foreground\/40">\s*•\s*<\/span>/,
  );
});
