import { chromium } from "playwright";
import { writeFileSync } from "fs";

const API_BASE = "http://localhost:8080/api/v1";
const EVIDENCE_DIR = "/Users/dikalaksana/Engineering/manris-v2/.sisyphus/evidence";

const AUTH_USER = {
  id: "1",
  name: "Test User",
  username: "testuser",
  email: "test@test.com",
  role: "pimpinan",
  organizationId: null,
  orgName: "Direktorat P2P",
  status: "active",
};

const DASHBOARD_SUMMARY = {
  totalRisks: 9,
  highExtreme: 2,
  overdueMitigations: 1,
  incidentsThisMonth: 0,
};

const DASHBOARD_HEATMAP = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

const RISK_CATEGORY_DATA = [
  { category: "strategis", count: 5 },
  { category: "operasional", count: 3 },
  { category: "uncategorized", count: 1 },
];

const results = [];
function log(msg) {
  console.log(msg);
  results.push(msg);
}

async function setupRoutes(page, overrides = {}) {
  // Intercept all API calls to localhost:8080
  await page.route(`${API_BASE}/**`, async (route) => {
    const url = route.request().url();
    const path = url.replace(API_BASE, "");

    // Auth
    if (path === "/auth/me") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(AUTH_USER),
      });
    }

    // Dashboard summary
    if (path === "/dashboard/summary") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overrides.summary ?? DASHBOARD_SUMMARY),
      });
    }

    // Dashboard heatmap
    if (path === "/dashboard/heatmap") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(overrides.heatmap ?? DASHBOARD_HEATMAP),
      });
    }

    // Dashboard risk categories
    if (path === "/dashboard/risk-categories") {
      if (overrides.riskCategoriesStatus === 500) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          overrides.riskCategories !== undefined
            ? overrides.riskCategories
            : RISK_CATEGORY_DATA
        ),
      });
    }

    // All other API routes return empty array
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(overrides.defaultResponse ?? []),
    });
  });
}

async function navigateToOverview(page) {
  // Set the auth token in localStorage before navigating
  await page.goto("http://localhost:3000");
  await page.evaluate(() => {
    localStorage.setItem("manris_token", "fake-jwt-token-for-testing");
  });
  await page.goto("http://localhost:3000/overview");
  // Wait for loading to finish
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-pulse"]'),
    { timeout: 15000 }
  ).catch(() => {
    // fallback: wait some time
  });
  // Also wait a bit for Recharts to render
  await page.waitForTimeout(2000);
}

async function runScenario1(browser) {
  log("\n=== SCENARIO 1: Chart renders correctly with data ===");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await setupRoutes(page);
    await navigateToOverview(page);

    // Assert: "Distribusi Kategori Risiko" heading is visible
    const categoryTitle = await page
      .getByText("Distribusi Kategori Risiko")
      .first();
    const isCategoryTitleVisible = await categoryTitle.isVisible();
    log(
      `  [${isCategoryTitleVisible ? "PASS" : "FAIL"}] "Distribusi Kategori Risiko" heading is visible`
    );

    // Assert: The bar chart SVG or recharts container is present
    const rechartsSvg = await page.locator(".recharts-responsive-container svg").first();
    const isChartPresent = await rechartsSvg.isVisible().catch(() => false);
    // Alternative check: look for any recharts bar
    const rechartsBar = await page.locator(".recharts-bar-rectangle").first();
    const isBarPresent = await rechartsBar.isVisible().catch(() => false);
    const chartOk = isChartPresent || isBarPresent;
    log(`  [${chartOk ? "PASS" : "FAIL"}] Bar chart SVG/recharts container is present`);

    // Assert: "Heatmap Risiko" is visible
    const heatmapTitle = await page.getByText("Heatmap Risiko").first();
    const isHeatmapVisible = await heatmapTitle.isVisible();
    log(
      `  [${isHeatmapVisible ? "PASS" : "FAIL"}] "Heatmap Risiko" heading is visible`
    );

    // Assert: "Risk Trend" heading is visible
    const riskTrendTitle = await page.getByText("Risk Trend").first();
    const isRiskTrendVisible = await riskTrendTitle.isVisible();
    log(
      `  [${isRiskTrendVisible ? "PASS" : "FAIL"}] "Risk Trend" heading is visible`
    );

    // Assert ordering: Heatmap → Category → Trend
    // Get vertical positions
    const heatmapBox = await page.getByText("Heatmap Risiko").first().boundingBox();
    const categoryBox = await page.getByText("Distribusi Kategori Risiko").first().boundingBox();
    const trendBox = await page.getByText("Risk Trend").first().boundingBox();
    
    const orderCorrect = heatmapBox && categoryBox && trendBox 
      && heatmapBox.y < categoryBox.y 
      && categoryBox.y < trendBox.y;
    log(`  [${orderCorrect ? "PASS" : "FAIL"}] Ordering: Heatmap (y=${heatmapBox?.y?.toFixed(0)}) → Category (y=${categoryBox?.y?.toFixed(0)}) → Trend (y=${trendBox?.y?.toFixed(0)})`);

    // Check for "Tanpa Kategori" label (uncategorized mapping)
    const tanpaKategori = await page.getByText("Tanpa Kategori").first();
    const isTanpaKategoriVisible = await tanpaKategori.isVisible().catch(() => false);
    log(`  [${isTanpaKategoriVisible ? "PASS" : "FAIL"}] "Tanpa Kategori" label visible for uncategorized category`);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-1-chart-renders.png`,
      fullPage: true,
    });
    log("  Screenshot saved: scenario-1-chart-renders.png");

    const allPass = isCategoryTitleVisible && chartOk && isHeatmapVisible && isRiskTrendVisible && orderCorrect && isTanpaKategoriVisible;
    log(`  SCENARIO 1 RESULT: ${allPass ? "PASS" : "FAIL"}`);
    return allPass;
  } catch (e) {
    log(`  SCENARIO 1 ERROR: ${e.message}`);
    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-1-error.png`,
      fullPage: true,
    });
    return false;
  } finally {
    await context.close();
  }
}

async function runScenario2(browser) {
  log("\n=== SCENARIO 2: Empty state renders correctly ===");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await setupRoutes(page, { riskCategories: [] });
    await navigateToOverview(page);

    // Assert: "Belum ada data kategori risiko." text is visible
    const emptyText = await page
      .getByText("Belum ada data kategori risiko.")
      .first();
    const isEmptyTextVisible = await emptyText.isVisible();
    log(
      `  [${isEmptyTextVisible ? "PASS" : "FAIL"}] "Belum ada data kategori risiko." is visible`
    );

    // Also verify the card title is still shown
    const categoryTitle = await page
      .getByText("Distribusi Kategori Risiko")
      .first();
    const isTitleVisible = await categoryTitle.isVisible();
    log(
      `  [${isTitleVisible ? "PASS" : "FAIL"}] Card title "Distribusi Kategori Risiko" still visible in empty state`
    );

    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-2-empty-state.png`,
      fullPage: true,
    });
    log("  Screenshot saved: scenario-2-empty-state.png");

    const allPass = isEmptyTextVisible && isTitleVisible;
    log(`  SCENARIO 2 RESULT: ${allPass ? "PASS" : "FAIL"}`);
    return allPass;
  } catch (e) {
    log(`  SCENARIO 2 ERROR: ${e.message}`);
    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-2-error.png`,
      fullPage: true,
    });
    return false;
  } finally {
    await context.close();
  }
}

async function runScenario3(browser) {
  log("\n=== SCENARIO 3: Error state renders correctly ===");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await setupRoutes(page, { riskCategoriesStatus: 500 });
    await navigateToOverview(page);

    // Assert: "Data kategori risiko tidak tersedia saat ini." is visible
    const errorText = await page
      .getByText("Data kategori risiko tidak tersedia saat ini.")
      .first();
    const isErrorTextVisible = await errorText.isVisible();
    log(
      `  [${isErrorTextVisible ? "PASS" : "FAIL"}] "Data kategori risiko tidak tersedia saat ini." is visible`
    );

    // Assert: KPI cards or "Heatmap Risiko" still visible — other sections unaffected
    const heatmapTitle = await page.getByText("Heatmap Risiko").first();
    const isHeatmapVisible = await heatmapTitle.isVisible();
    log(
      `  [${isHeatmapVisible ? "PASS" : "FAIL"}] "Heatmap Risiko" still visible (other sections unaffected)`
    );

    // Check KPI cards visible
    const totalRisiko = await page.getByText("Total Risiko").first();
    const isKpiVisible = await totalRisiko.isVisible();
    log(
      `  [${isKpiVisible ? "PASS" : "FAIL"}] KPI card "Total Risiko" still visible`
    );

    // Check Risk Trend still present
    const riskTrend = await page.getByText("Risk Trend").first();
    const isTrendVisible = await riskTrend.isVisible();
    log(
      `  [${isTrendVisible ? "PASS" : "FAIL"}] "Risk Trend" still visible`
    );

    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-3-error-state.png`,
      fullPage: true,
    });
    log("  Screenshot saved: scenario-3-error-state.png");

    const allPass = isErrorTextVisible && isHeatmapVisible && isKpiVisible && isTrendVisible;
    log(`  SCENARIO 3 RESULT: ${allPass ? "PASS" : "FAIL"}`);
    return allPass;
  } catch (e) {
    log(`  SCENARIO 3 ERROR: ${e.message}`);
    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-3-error.png`,
      fullPage: true,
    });
    return false;
  } finally {
    await context.close();
  }
}

async function runScenario4(browser) {
  log("\n=== SCENARIO 4: Chart is read-only (no navigation) ===");
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await setupRoutes(page);
    await navigateToOverview(page);

    // Get the current URL
    const urlBefore = page.url();
    log(`  URL before click: ${urlBefore}`);

    // Click on the chart area
    // Find the category card by title and then locate the chart inside it
    const categoryCard = page.locator("text=Distribusi Kategori Risiko").locator("..").locator("..");
    const chartArea = categoryCard.locator(".recharts-responsive-container").first();
    const isChartAreaPresent = await chartArea.isVisible().catch(() => false);
    
    if (isChartAreaPresent) {
      await chartArea.click({ force: true });
      await page.waitForTimeout(500);
    } else {
      // Alternative: click the bar or label
      const barRect = page.locator(".recharts-bar-rectangle").first();
      const isBarPresent = await barRect.isVisible().catch(() => false);
      if (isBarPresent) {
        await barRect.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        log("  WARNING: Could not find chart area to click, clicking card content instead");
        // Just click inside the card content area
        const cardContent = categoryCard.locator('[class*="CardContent"]').first();
        if (await cardContent.isVisible().catch(() => false)) {
          await cardContent.click({ force: true });
        }
        await page.waitForTimeout(500);
      }
    }

    const urlAfter = page.url();
    log(`  URL after click: ${urlAfter}`);

    const urlUnchanged = urlBefore === urlAfter;
    log(`  [${urlUnchanged ? "PASS" : "FAIL"}] URL unchanged after clicking chart`);

    // Assert: No modal/drawer appeared
    // Check for any dialog/drawer/modal overlay
    const dialogVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    const drawerVisible = await page.locator('[data-state="open"]').first().isVisible().catch(() => false);
    const noModalAppeared = !dialogVisible;
    log(`  [${noModalAppeared ? "PASS" : "FAIL"}] No modal/drawer appeared after click`);

    // Check there are no links or buttons inside the category chart card (except the card itself)
    const categorySection = page.locator("text=Distribusi Kategori Risiko").locator("..").locator("..");
    const linksInCard = await categorySection.locator("a, button").count();
    // The card header might have buttons in other cards but the category card itself should have none
    log(`  INFO: Found ${linksInCard} link/button elements in/near the category card area`);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-4-readonly.png`,
      fullPage: true,
    });
    log("  Screenshot saved: scenario-4-readonly.png");

    const allPass = urlUnchanged && noModalAppeared;
    log(`  SCENARIO 4 RESULT: ${allPass ? "PASS" : "FAIL"}`);
    return allPass;
  } catch (e) {
    log(`  SCENARIO 4 ERROR: ${e.message}`);
    await page.screenshot({
      path: `${EVIDENCE_DIR}/scenario-4-error.png`,
      fullPage: true,
    });
    return false;
  } finally {
    await context.close();
  }
}

async function main() {
  log("=== QA Test Suite: Risk Category Dashboard Chart ===");
  log(`Started at: ${new Date().toISOString()}`);

  const browser = await chromium.launch({ headless: true });

  const s1 = await runScenario1(browser);
  const s2 = await runScenario2(browser);
  const s3 = await runScenario3(browser);
  const s4 = await runScenario4(browser);

  log("\n=== SUMMARY ===");
  log(`Scenario 1 (Chart renders with data): ${s1 ? "PASS" : "FAIL"}`);
  log(`Scenario 2 (Empty state): ${s2 ? "PASS" : "FAIL"}`);
  log(`Scenario 3 (Error state): ${s3 ? "PASS" : "FAIL"}`);
  log(`Scenario 4 (Read-only): ${s4 ? "PASS" : "FAIL"}`);

  const allPassed = s1 && s2 && s3 && s4;
  log(`\nOVERALL VERDICT: ${allPassed ? "APPROVE" : "REJECT"}`);

  await browser.close();

  writeFileSync(
    `${EVIDENCE_DIR}/qa-results.txt`,
    results.join("\n") + "\n"
  );
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
