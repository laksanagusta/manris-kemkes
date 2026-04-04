/**
 * F3 Manual QA — Playwright Verification
 * Risk Category Dashboard Chart on /overview page
 */
import { chromium } from '/private/tmp/pwqa/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = __dirname;
const BASE_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:8080/api/v1';

const results = [];

function log(msg) {
  console.log(`[QA] ${msg}`);
  results.push(msg);
}

function logResult(scenario, test, passed) {
  const status = passed ? 'PASS' : 'FAIL';
  const msg = `  ${status}: ${test}`;
  console.log(`[QA] ${msg}`);
  results.push(msg);
  return passed;
}

// Standard mock data for dashboard endpoints
const MOCK_SUMMARY = { totalRisks: 12, highExtreme: 4, overdueMitigations: 2, incidentsThisMonth: 1 };
const MOCK_HEATMAP = [[1,0,0,0,0],[0,2,1,0,0],[0,0,3,1,0],[0,0,0,2,1],[0,0,0,0,1]];
const MOCK_AUTH_ME = { id: '1', username: 'superadmin', role: 'super_admin', fullName: 'Super Admin' };

async function setupPageWithMocks(browser, riskCategoryMock) {
  const context = await browser.newContext();
  const page = await context.newPage();

  let routeHits = [];

  // Intercept ALL requests to the API
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const path = url.replace(/.*\/api\/v1/, '').split('?')[0];
    routeHits.push(path);

    const mockMap = {
      '/dashboard/summary': { status: 200, body: MOCK_SUMMARY },
      '/dashboard/heatmap': { status: 200, body: MOCK_HEATMAP },
      '/risks/trend': { status: 200, body: [] },
      '/dashboard/action-pressure': { status: 200, body: [] },
      '/dashboard/executive-alerts': { status: 200, body: [] },
      '/auth/me': { status: 200, body: MOCK_AUTH_ME },
    };

    // Risk categories mock
    if (path === '/dashboard/risk-categories') {
      await route.fulfill({
        status: riskCategoryMock.status,
        contentType: 'application/json',
        body: JSON.stringify(riskCategoryMock.status >= 400 ? { error: 'Internal Server Error' } : riskCategoryMock.data),
      });
      return;
    }

    // Standard mocks
    for (const [mockPath, mockData] of Object.entries(mockMap)) {
      if (path === mockPath || path.startsWith(mockPath)) {
        await route.fulfill({
          status: mockData.status,
          contentType: 'application/json',
          body: JSON.stringify(mockData.body),
        });
        return;
      }
    }

    // Unmatched — fulfill with empty success to avoid breaking
    console.log(`  [MOCK] Unmatched route: ${path} (${url})`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    });
  });

  // Set token in localStorage BEFORE navigating to overview
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('manris_token', 'fake_qa_token_for_testing');
  });

  // Navigate to overview and wait for API calls
  await page.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for the loading text to disappear  
  try {
    await page.waitForFunction(() => {
      return !document.body.textContent.includes('Memuat dashboard...');
    }, { timeout: 15000 });
  } catch (e) {
    log(`  WARNING: Loading did not clear within 15s. Route hits: ${routeHits.join(', ')}`);
  }

  // Give Recharts time to render
  await page.waitForTimeout(2000);

  return { page, context, routeHits };
}

async function runScenario1(browser) {
  log('\n=== SCENARIO 1: Chart renders with data ===');
  let allPassed = true;

  const { page, context, routeHits } = await setupPageWithMocks(browser, {
    status: 200,
    data: [
      { category: 'strategis', count: 5 },
      { category: 'operasional', count: 3 },
      { category: 'uncategorized', count: 1 },
    ],
  });

  try {
    log(`  Route hits: ${routeHits.join(', ')}`);

    // Check if still loading
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Memuat dashboard')) {
      log('  WARNING: Page still shows loading state. Attempting reload...');
      await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(3000);
    }

    // 1. Assert: "Distribusi Kategori Risiko" heading visible
    const headingVisible = await page.getByText('Distribusi Kategori Risiko').first().isVisible().catch(() => false);
    allPassed &= logResult('S1', '"Distribusi Kategori Risiko" heading visible', headingVisible);

    // 2. Assert: "Tanpa Kategori" label visible (uncategorized mapping)
    const tanpaKategoriVisible = await page.getByText('Tanpa Kategori').first().isVisible().catch(() => false);
    allPassed &= logResult('S1', '"Tanpa Kategori" label visible (uncategorized mapping)', tanpaKategoriVisible);

    // 3. Assert: Chart SVG exists (Recharts generates svg.recharts-surface)
    const svgExists = await page.locator('svg.recharts-surface').first().isVisible().catch(() => false);
    allPassed &= logResult('S1', 'Chart SVG exists (recharts-surface)', svgExists);

    // Check for bar rectangle paths
    const barCount = await page.locator('.recharts-bar-rectangle').count().catch(() => 0);
    allPassed &= logResult('S1', `Bar elements exist in chart (count: ${barCount})`, barCount > 0);

    // 4. Assert: "Heatmap Risiko" heading still visible
    const heatmapVisible = await page.getByText('Heatmap Risiko').first().isVisible().catch(() => false);
    allPassed &= logResult('S1', '"Heatmap Risiko" heading still visible', heatmapVisible);

    // 5. Assert: "Risk Trend" heading still visible
    const riskTrendVisible = await page.getByText('Risk Trend').first().isVisible().catch(() => false);
    allPassed &= logResult('S1', '"Risk Trend" heading still visible', riskTrendVisible);

    // 6. Verify DOM order: Heatmap < Distribusi Kategori < Risk Trend
    const positions = await page.evaluate(() => {
      const allText = document.body.innerText;
      const heatmapIdx = allText.indexOf('Heatmap Risiko');
      const distribusiIdx = allText.indexOf('Distribusi Kategori Risiko');
      const trendIdx = allText.indexOf('Risk Trend');
      return { heatmapIdx, distribusiIdx, trendIdx };
    });
    const orderCorrect = positions.heatmapIdx >= 0 && positions.distribusiIdx >= 0 && positions.trendIdx >= 0 &&
      positions.heatmapIdx < positions.distribusiIdx && positions.distribusiIdx < positions.trendIdx;
    allPassed &= logResult('S1', `DOM order: Heatmap(${positions.heatmapIdx}) < Distribusi(${positions.distribusiIdx}) < Trend(${positions.trendIdx})`, orderCorrect);

    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario1-chart-with-data.png'), fullPage: true });
    log('  Screenshot saved: f3-scenario1-chart-with-data.png');

  } catch (err) {
    log(`  ERROR in scenario 1: ${err.message}`);
    allPassed = false;
    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario1-error.png'), fullPage: true }).catch(() => {});
  }

  await context.close();
  return !!allPassed;
}

async function runScenario2(browser) {
  log('\n=== SCENARIO 2: Empty state ===');
  let allPassed = true;

  const { page, context } = await setupPageWithMocks(browser, {
    status: 200,
    data: [],
  });

  try {
    // 1. Assert: Empty message visible
    const emptyMsgVisible = await page.getByText('Belum ada data kategori risiko.').first().isVisible().catch(() => false);
    allPassed &= logResult('S2', '"Belum ada data kategori risiko." visible', emptyMsgVisible);

    // 2. Assert: No chart SVG inside the category card
    const categoryCardHasSvg = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('div'));
      for (const el of headings) {
        if (el.textContent && el.textContent.includes('Distribusi Kategori Risiko') && !el.textContent.includes('Risk Trend')) {
          const card = el.closest('[class*="card"]') || el.parentElement?.parentElement?.parentElement;
          if (card) {
            return card.querySelector('svg.recharts-surface') !== null;
          }
        }
      }
      return false;
    });
    allPassed &= logResult('S2', 'No chart SVG in category card', !categoryCardHasSvg);

    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario2-empty-state.png'), fullPage: true });
    log('  Screenshot saved: f3-scenario2-empty-state.png');

  } catch (err) {
    log(`  ERROR in scenario 2: ${err.message}`);
    allPassed = false;
    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario2-error.png'), fullPage: true }).catch(() => {});
  }

  await context.close();
  return !!allPassed;
}

async function runScenario3(browser) {
  log('\n=== SCENARIO 3: Error state ===');
  let allPassed = true;

  const { page, context } = await setupPageWithMocks(browser, {
    status: 500,
    data: null,
  });

  try {
    // 1. Assert: Error message visible
    const errorMsgVisible = await page.getByText('Data kategori risiko tidak tersedia saat ini.').first().isVisible().catch(() => false);
    allPassed &= logResult('S3', '"Data kategori risiko tidak tersedia saat ini." visible', errorMsgVisible);

    // 2. Assert: Heatmap still visible (dashboard not broken)
    const heatmapVisible = await page.getByText('Heatmap Risiko').first().isVisible().catch(() => false);
    allPassed &= logResult('S3', '"Heatmap Risiko" still visible (dashboard not broken)', heatmapVisible);

    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario3-error-state.png'), fullPage: true });
    log('  Screenshot saved: f3-scenario3-error-state.png');

  } catch (err) {
    log(`  ERROR in scenario 3: ${err.message}`);
    allPassed = false;
    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario3-error.png'), fullPage: true }).catch(() => {});
  }

  await context.close();
  return !!allPassed;
}

async function runScenario4(browser) {
  log('\n=== SCENARIO 4: Read-only (no navigation on click) ===');
  let allPassed = true;

  const { page, context } = await setupPageWithMocks(browser, {
    status: 200,
    data: [
      { category: 'strategis', count: 5 },
      { category: 'operasional', count: 3 },
      { category: 'keuangan', count: 2 },
    ],
  });

  try {
    // Record current URL
    const urlBefore = page.url();
    log(`  URL before click: ${urlBefore}`);

    // Click on the bar chart area using coordinates relative to heading
    const heading = page.getByText('Distribusi Kategori Risiko').first();
    await heading.scrollIntoViewIfNeeded();
    const box = await heading.boundingBox();
    if (box) {
      // Click below the heading where the chart bars should be
      await page.mouse.click(box.x + 200, box.y + 100);
      log('  Clicked via coordinates on chart area (spot 1)');
      await page.mouse.click(box.x + 300, box.y + 60);
      log('  Clicked via coordinates on chart area (spot 2)');
    } else {
      log('  WARNING: Could not get heading bounding box');
    }

    await page.waitForTimeout(1000);

    // Assert: URL unchanged
    const urlAfter = page.url();
    const urlUnchanged = urlBefore === urlAfter;
    allPassed &= logResult('S4', `URL unchanged after click (${urlAfter})`, urlUnchanged);

    // Assert: No modal/drawer appeared
    const modalAppeared = await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"], [data-state="open"], .modal, .drawer');
      return dialogs.length > 0;
    });
    allPassed &= logResult('S4', 'No modal/drawer appeared', !modalAppeared);

    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario4-readonly.png'), fullPage: true });
    log('  Screenshot saved: f3-scenario4-readonly.png');

  } catch (err) {
    log(`  ERROR in scenario 4: ${err.message}`);
    allPassed = false;
    await page.screenshot({ path: join(EVIDENCE_DIR, 'f3-scenario4-error.png'), fullPage: true }).catch(() => {});
  }

  await context.close();
  return !!allPassed;
}

// ====== MAIN ======
async function main() {
  log('F3 Manual QA — Playwright Verification');
  log(`Started at: ${new Date().toISOString()}`);
  log(`Target: ${BASE_URL}/overview`);

  const browser = await chromium.launch({ headless: true });

  const s1 = await runScenario1(browser);
  const s2 = await runScenario2(browser);
  const s3 = await runScenario3(browser);
  const s4 = await runScenario4(browser);

  await browser.close();

  const allPass = s1 && s2 && s3 && s4;
  const verdict = allPass ? 'APPROVE' : 'REJECT';

  const summary = `
========================================
F3 MANUAL QA VERDICT: ${verdict}

Scenario 1 (chart with data): ${s1 ? 'PASS' : 'FAIL'}
Scenario 2 (empty state): ${s2 ? 'PASS' : 'FAIL'}
Scenario 3 (error state): ${s3 ? 'PASS' : 'FAIL'}
Scenario 4 (read-only): ${s4 ? 'PASS' : 'FAIL'}

Issues found: ${allPass ? 'None' : 'See test output above'}
========================================`;

  log(summary);

  writeFileSync(join(EVIDENCE_DIR, 'f3-qa-results.txt'), results.join('\n'), 'utf-8');
  console.log('\nResults written to f3-qa-results.txt');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  writeFileSync(join(EVIDENCE_DIR, 'f3-qa-results.txt'), `FATAL ERROR: ${err.message}\n${err.stack}`, 'utf-8');
  process.exit(1);
});
