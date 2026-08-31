import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ELEVATION =
  "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30";
const CARD_ELEVATION = "border-shadow";
const MODAL_ELEVATION =
  "smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30";
const sourceRoot = fileURLToPath(new URL("../..", import.meta.url));
const globalsSource = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);
const colorTokensSource = readFileSync(
  new URL("../shared/design-system/data/color-tokens.ts", import.meta.url),
  "utf8",
);

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return listTypeScriptFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

function directSurfaceToken(token: string) {
  if (token.startsWith("[") || token.startsWith("*") || token.startsWith("**")) {
    return null;
  }

  const parts = token.split(":");
  return parts.at(-1) ?? token;
}

function isConflictingSurfaceToken(token: string) {
  const directToken = directSurfaceToken(token);
  if (!directToken) return false;

  if (
    (directToken === "border" || directToken.startsWith("border-")) &&
    !/(?:^|-)0$/.test(directToken)
  ) {
    return true;
  }
  if (directToken.startsWith("ring-")) return true;
  if (
    directToken.startsWith("shadow-") &&
    directToken !== "shadow-black"
  ) {
    return true;
  }

  return false;
}

test("shared floating primitives and default cards use their shared elevations", () => {
  const cardSource = readFileSync(
    new URL("./card.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(cardSource.includes(CARD_ELEVATION));

  for (const file of [
    "combobox.tsx",
    "dropdown-menu.tsx",
    "popover.tsx",
    "select.tsx",
    "sonner.tsx",
    "tooltip.tsx",
  ]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(ELEVATION), `${file} must use ${ELEVATION}`);
  }

  for (const file of ["alert-dialog.tsx", "dialog.tsx", "sheet.tsx"]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.ok(
      source.includes(MODAL_ELEVATION),
      `${file} must use ${MODAL_ELEVATION}`,
    );
    assert.doesNotMatch(source, /smooth-shadow-ring-xs/);
  }

  const accordionFormSection = readFileSync(
    new URL(
      "../shared/design-system/layout/accordion-form-section.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    accordionFormSection,
    /not-last:border-b-0 bg-card smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/,
  );
});

test("all neutral component boundaries inherit the Vercel-strength token", () => {
  const cardSource = readFileSync(
    new URL("./card.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(cardSource, /elevation/);
  assert.match(
    cardSource,
    /border-shadow/,
  );
  assert.match(globalsSource, /--surface-border: #e3e3e3/);
  assert.match(globalsSource, /--field-border: #ebebeb/);
  assert.match(
    globalsSource,
    /--shadow-custom: 0px 0px 0px 1px #0000000f, 0px 1px 2px -1px #0000000f, 0px 2px 4px 0px #0000000a;/,
  );
  assert.match(globalsSource, /--border: var\(--surface-border\)/);
  assert.match(globalsSource, /--input: var\(--field-border\)/);
  assert.match(globalsSource, /--sidebar-border: var\(--surface-border\)/);
  assert.match(
    globalsSource,
    /\.dark\s*\{[^}]*--surface-border: rgb\(255 255 255 \/ 12%\)/s,
  );
  assert.match(
    globalsSource,
    /\.border-shadow \{\s*box-shadow: var\(--shadow-custom\);\s*\}/s,
  );
  assert.match(
    globalsSource,
    /\.surface-hairline \{\s*border: 0;\s*box-shadow: var\(--shadow-custom\);\s*\}/,
  );
  assert.match(
    colorTokensSource,
    /name: "component-border", value: "var\(--component-border\)"/,
  );
  assert.match(
    colorTokensSource,
    /name: "surface-border", value: "var\(--surface-border\)"/,
  );
  assert.match(
    colorTokensSource,
    /name: "field-border", value: "var\(--field-border\)"/,
  );
});

test("Card surfaces use the shared default border shadow", () => {
  const dashboardCardSource = readFileSync(
    new URL("../dashboard-card.tsx", import.meta.url),
    "utf8",
  );
  const dashboardKpiSource = readFileSync(
    new URL(
      "../shared/design-system/layout/dashboard-kpi-card.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const kpiCardSource = readFileSync(new URL("./kpi-card.tsx", import.meta.url), "utf8");
  const riskAnalysisSource = readFileSync(
    new URL("../risk/risk-analysis-tab.tsx", import.meta.url),
    "utf8",
  );
  const overviewSources = [
    "../../app/(app)/overview/_components/risk-heatmap.tsx",
    "../../app/(app)/overview/_components/risk-movement-snapshot.tsx",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

  assert.doesNotMatch(dashboardCardSource, /elevation/);

  for (const source of [dashboardKpiSource, kpiCardSource]) {
    assert.match(source, /surface-hairline/);
    assert.doesNotMatch(source, /smooth-shadow-ring-xs/);
  }

  assert.match(
    dashboardKpiSource,
    /font-sans text-sm font-semibold leading-5 text-muted-foreground/,
  );
  assert.doesNotMatch(dashboardKpiSource, /text-\[10px\].*uppercase/);

  for (const source of [riskAnalysisSource, ...overviewSources]) {
    const cardTags = source.match(/<Card\b[\s\S]*?>/g) ?? [];
    assert.ok(cardTags.length > 0);
    for (const tag of cardTags) {
      assert.doesNotMatch(tag, /elevation/);
    }
    assert.doesNotMatch(source, /smooth-shadow-ring-xs/);
  }
});

test("report chart primitives use the surface border token", () => {
  const standardCardSource = readFileSync(
    new URL("../shared/design-system/layout/standard-card.tsx", import.meta.url),
    "utf8",
  );
  const reportLinkGridSource = readFileSync(
    new URL("../shared/design-system/reports/report-link-grid.tsx", import.meta.url),
    "utf8",
  );
  const reportEmptyStateSource = readFileSync(
    new URL("../shared/design-system/reports/report-empty-state.tsx", import.meta.url),
    "utf8",
  );
  const reportPageSource = readFileSync(
    new URL("../../app/(app)/reports/page.tsx", import.meta.url),
    "utf8",
  );
  const overviewChartSources = [
    "../../app/(app)/overview/_components/unit-total-risk-score-chart.tsx",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
  const reportChartSources = [
    "../../app/(app)/reports/_components/critical-risk-rate-trend.tsx",
    "../../app/(app)/reports/_components/inherent-residual-trend.tsx",
    "../../app/(app)/reports/_components/risk-category-pie-chart.tsx",
    "../../app/(app)/reports/_components/risk-category-distribution-card.tsx",
    "../../app/(app)/reports/_components/risk-movement-by-org.tsx",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

  assert.match(standardCardSource, /<Card\s+className=/);
  assert.match(reportLinkGridSource, /surface-hairline/);
  assert.match(reportEmptyStateSource, /border-surface-border/);
  assert.doesNotMatch(reportLinkGridSource, /smooth-shadow-ring-xs/);
  assert.match(reportPageSource, /border-surface-border/);

  for (const source of overviewChartSources) {
    assert.doesNotMatch(source, /smooth-shadow-ring-xs/);
  }

  for (const source of reportChartSources) {
    assert.match(source, /border-surface-border/);
    assert.doesNotMatch(source, /smooth-shadow-ring-xs/);
  }
});

test("risk form does not globally disable elevated surface shadows", () => {
  assert.doesNotMatch(
    globalsSource,
    /\.risk-form-filter-controls[^{}]*(?:\[data-slot="card"\]|\[data-slot="accordion-item"\])[^{}]*\{[\s\S]*?box-shadow:\s*none/,
  );
});

test("modal overlays use the shared frosted scrim", () => {
  for (const file of ["alert-dialog.tsx", "dialog.tsx", "sheet.tsx"]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /frosted-scrim/);
    assert.doesNotMatch(source, /bg-black\/10/);
    assert.match(source, /motion-reduce:animate-none/);
    assert.match(source, /motion-reduce:transition-none/);
  }

  const scrimBlock = globalsSource.match(
    /\.frosted-scrim \{[\s\S]*?\n\}/,
  )?.[0] ?? "";
  assert.match(scrimBlock, /backdrop-filter:\s*blur\(4px\) saturate\(110%\)/);
  assert.match(globalsSource, /--background\) 64%/);
});

test("shared field surfaces use the dedicated field border token", () => {
  for (const file of [
    "input.tsx",
    "textarea.tsx",
    "search-input.tsx",
    "input-group.tsx",
    "combobox.tsx",
  ]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /border-input/);
    assert.doesNotMatch(source, /border-border/);
    assert.match(
      source,
      /(?:focus:border-primary|focus-visible:border-primary|focus-within:border-primary|:focus\]:border-primary|:focus-visible\]:border-primary)/,
    );
    assert.match(
      source,
      /(?:focus:ring-0|focus-visible:ring-0|focus-within:ring-0|:focus\]:ring-0|:focus-visible\]:ring-0)/,
    );
  }

  const selectSource = readFileSync(
    new URL("./select.tsx", import.meta.url),
    "utf8",
  );
  assert.match(selectSource, /border-input/);
  assert.doesNotMatch(selectSource, /border-border/);
  assert.doesNotMatch(
    selectSource,
    /(?:focus:border-black|focus-visible:border-black|dark:focus:border-white|dark:focus-visible:border-white)/,
  );
  assert.match(selectSource, /focus:ring-0/);
  assert.match(selectSource, /focus-visible:ring-0/);
});

test("select and dropdown options expose a visible keyboard focus indicator", () => {
  const selectSource = readFileSync(
    new URL("./select.tsx", import.meta.url),
    "utf8",
  );
  const dropdownSource = readFileSync(
    new URL("./dropdown-menu.tsx", import.meta.url),
    "utf8",
  );

  for (const source of [selectSource, dropdownSource]) {
    assert.match(source, /focus-visible:outline-2/);
    assert.match(source, /focus-visible:outline-foreground/);
  }
});

test("risk form geometry overrides preserve the shared active field state", () => {
  assert.match(
    globalsSource,
    /\.risk-form-filter-controls \[data-slot="input"\]:focus,[\s\S]*?border-color: var\(--primary\);[\s\S]*?box-shadow: none;/,
  );
  assert.match(
    globalsSource,
    /\.risk-form-filter-controls \[data-slot="textarea"\]:focus-visible/,
  );
  assert.doesNotMatch(
    globalsSource,
    /\.risk-form-filter-controls \[data-slot="select-trigger"\]:(?:focus|focus-visible)/,
  );
});

test("all PopoverContent surfaces use the canonical rounded-xl radius", () => {
  const popoverSource = readFileSync(
    new URL("./popover.tsx", import.meta.url),
    "utf8",
  );
  assert.match(popoverSource, /data-slot="popover-content"[\s\S]*rounded-xl/);
  assert.doesNotMatch(popoverSource, /rounded-(?:2xl|3xl)/);

  for (const file of listTypeScriptFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/<PopoverContent\b[^>]*>/g)) {
      assert.doesNotMatch(
        match[0],
        /rounded-(?:sm|md|lg|2xl|3xl)/,
        `${file} overrides PopoverContent with a non-xl radius`,
      );
    }
  }
});

test("feature pages compose visible fields from shared primitives", () => {
  const nativeFieldImplementations = new Set([
    "/components/ui/input.tsx",
    "/components/ui/search-input.tsx",
    "/components/ui/textarea.tsx",
  ]);

  for (const file of listTypeScriptFiles(sourceRoot)) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;

    const source = readFileSync(file, "utf8");
    const nativeFields = [
      ...source.matchAll(/<(input|textarea|select)\b[\s\S]*?>/g),
    ];

    for (const match of nativeFields) {
      const tag = match[0];
      const isSharedImplementation = [...nativeFieldImplementations].some(
        (suffix) => file.endsWith(suffix),
      );
      const isIntentionalNativeControl = /type=["'](?:file|range)["']/.test(
        tag,
      );

      assert.ok(
        isSharedImplementation || isIntentionalNativeControl,
        `${file} contains a raw visible field; use a shared field primitive instead: ${tag.slice(0, 120)}`,
      );
    }
  }
});

test("Card consumers do not override the canonical elevation", () => {
  for (const file of listTypeScriptFiles(sourceRoot)) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;

    const source = readFileSync(file, "utf8");
    const cardTags = source.match(/<Card\b[\s\S]*?>/g) ?? [];

    for (const tag of cardTags) {
      assert.doesNotMatch(
        tag,
        /elevation\s*=/,
        `${file} must use the default Card border shadow`,
      );
      const classFragments = [...tag.matchAll(/"([^"]*)"/g)].map(
        (match) => match[1],
      );
      const conflicts = classFragments
        .flatMap((fragment) => fragment.split(/\s+/))
        .filter(isConflictingSurfaceToken);

      assert.deepEqual(
        conflicts,
        [],
        `${file} overrides Card elevation with: ${conflicts.join(", ")}`,
      );
    }
  }
});

test("smooth elevated surfaces do not stack a hard border, ring, or second shadow", () => {
  for (const file of listTypeScriptFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    const classFragments = [...source.matchAll(/"([^"]*)"/g)]
      .map((match) => match[1])
      .filter((className) => className.includes("smooth-shadow-ring-xs"));

    for (const className of classFragments) {
      const conflicts = className
        .split(/\s+/)
        .filter(isConflictingSurfaceToken);

      assert.deepEqual(
        conflicts,
        [],
        `${file} stacks another edge on ${ELEVATION}: ${conflicts.join(", ")}`,
      );
    }
  }
});
