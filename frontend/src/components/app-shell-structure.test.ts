import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shellSource = readFileSync(
  new URL("./app-shell.tsx", import.meta.url),
  "utf8",
);
const sidebarSource = readFileSync(
  new URL("./app-sidebar.tsx", import.meta.url),
  "utf8",
);

test("uses the Efferd floating and padded shell geometry", () => {
  assert.match(sidebarSource, /variant="floating"/);
  assert.match(
    shellSource,
    /<SidebarInset className="bg-white p-4 md:p-6">/,
  );
  assert.match(
    shellSource,
    /<main className="flex flex-1 flex-col gap-4">\s*\{children\}\s*<\/main>/,
  );
});

test("uses a white application canvas and larger wordmark", () => {
  assert.match(
    shellSource,
    /<SidebarInset className="bg-white p-4 md:p-6">/,
  );
  assert.match(
    sidebarSource,
    /className="text-lg font-semibold tracking-tight text-sidebar-foreground group-data-\[collapsible=icon\]:hidden"/,
  );
  assert.match(
    sidebarSource,
    /"\*:data-\[slot=sidebar-inner\]:bg-muted\/60"/,
  );
});

test("adds a primary create-risk action below the wordmark", () => {
  assert.match(sidebarSource, /href="\/risk\/register\/new"/);
  assert.match(sidebarSource, /tooltip="Tambah Risiko"/);
  assert.match(sidebarSource, /<Plus \/>/);
  assert.match(sidebarSource, /<span>Tambah Risiko<\/span>/);
  assert.match(
    sidebarSource,
    /h-9 corner-xl-smooth justify-center bg-primary font-medium/,
  );
  assert.match(sidebarSource, /"--primary": "#00b9ad"/);
  assert.match(sidebarSource, /corner-xl-smooth/);
  assert.match(sidebarSource, /font-medium text-white/);
});

test("uses blended gray navigation highlights", () => {
  assert.match(
    sidebarSource,
    /hover:bg-muted-foreground\/10 active:bg-muted-foreground\/10 data-active:bg-muted-foreground\/10/,
  );
});

test("preserves Manris shell behavior", () => {
  assert.match(shellSource, /api\s*\.get<\{ Count: number \}>/);
  assert.match(shellSource, /api\s*\.get<\{ count: number \}>/);
  assert.match(shellSource, /<AppSidebar inboxBadge=/);
  assert.match(sidebarSource, /useAuth\(\)/);
  assert.match(sidebarSource, /user\?\.role === "superadmin"/);
  assert.match(sidebarSource, /isAIFeaturesDisabled\(\)/);
  assert.doesNotMatch(sidebarSource, /Efferd/);
  assert.doesNotMatch(sidebarSource, /Add product/);
});
