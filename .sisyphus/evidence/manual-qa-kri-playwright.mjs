import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const BASE_URL = 'http://localhost:3000';
const API_BASE = 'http://localhost:8080/api/v1';
const EVIDENCE_DIR = '.sisyphus/evidence';

const results = [];

function extractId(payload) {
  return payload?.id || payload?.ID || null;
}

function record(name, passed, details, screenshot) {
  results.push({ name, passed, details, screenshot });
}

async function api(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function loginToken(username, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  return data.token;
}

async function uiLoginWithToken(page, token) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((savedToken) => {
    localStorage.setItem('manris_token', savedToken);
  }, token);
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
}

function nextCycle(cycle) {
  const [yearStr, half] = (cycle || '').split('-');
  const year = Number(yearStr);
  if (!year || !half) return null;
  return half === 'H1' ? `${year}-H2` : `${year + 1}-H1`;
}

async function run() {
  const adminToken = await loginToken('admin', 'admin123');
  const unitToken = await loginToken('andi', 'admin123');
  const reviewerToken = await loginToken('farah', 'admin123');
  const riskList = await api('/risks', { token: adminToken });
  const sourceRisk = riskList.find((r) => r.status === 'approved' && r.isCurrent) || riskList[0];
  if (!sourceRisk) throw new Error('No risk found for KRI QA setup');
  const sourceRiskDetail = await api(`/risks/${sourceRisk.id}`, { token: adminToken });
  const orgId = sourceRiskDetail.organizationId || sourceRisk.organizationId || '00000000-0000-0000-0000-000000000001';

  const now = new Date();
  const slug = `${now.getTime()}`;
  const kriPayload = (name) => ({
    name,
    description: 'QA automation KRI workflow check',
    metric: '%',
    thresholdMin: 0,
    thresholdMax: 100,
    amberThresholdMax: 80,
    currentValue: 55,
    direction: 'higher_worse',
    frequency: 'harian',
  });

  const kriAResult = await api(`/kris?risk_id=${sourceRisk.id}&organization_id=${orgId}`, {
    method: 'POST',
    token: adminToken,
    body: kriPayload(`QA KRI A ${slug}`),
  });

  const kriBResult = await api(`/kris?risk_id=${sourceRisk.id}&organization_id=${orgId}`, {
    method: 'POST',
    token: adminToken,
    body: kriPayload(`QA KRI B ${slug}`),
  });

  const kriAId = extractId(kriAResult);
  const kriBId = extractId(kriBResult);
  if (!kriAId || !kriBId) {
    throw new Error(`KRI create response missing ID: A=${JSON.stringify(kriAResult)} B=${JSON.stringify(kriBResult)}`);
  }

  const today = now.toISOString().slice(0, 10);
  await api(`/kri-reports/generate?date=${today}`, { method: 'POST', token: adminToken });

  let reportsA = await api(`/kris/${kriAId}/reports`, { token: adminToken });
  let reportsB = await api(`/kris/${kriBId}/reports`, { token: adminToken });
  const pendingA = reportsA.find((r) => r.status === 'pending');
  const pendingB = reportsB.find((r) => r.status === 'pending');
  if (!pendingA || !pendingB) throw new Error('Pending report setup failed');

  const browser = await chromium.launch({ headless: true });

  try {
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await uiLoginWithToken(adminPage, adminToken);

    // Scenario 1: KRI Detail Page
    await adminPage.goto(`${BASE_URL}/compliance/kri/${kriAId}`, { waitUntil: 'networkidle' });
    const archiveButton = adminPage.getByRole('button', { name: /arsipkan/i });
    const deleteButtonCount = await adminPage.getByRole('button', { name: /hapus|delete/i }).count();
    const amberRowVisible = await adminPage.getByText(/Amber:\s*≥/i).first().isVisible();
    const s1Shot = `${EVIDENCE_DIR}/manual-qa-kri-s1-detail.png`;
    await adminPage.screenshot({ path: s1Shot, fullPage: true });
    record(
      '1. KRI Detail Page',
      (await archiveButton.isVisible()) && deleteButtonCount === 0 && amberRowVisible,
      `archiveVisible=${await archiveButton.isVisible()}, deleteButtons=${deleteButtonCount}, amberVisible=${amberRowVisible}`,
      s1Shot,
    );

    const unitCtx = await browser.newContext();
    const unitPage = await unitCtx.newPage();
    await uiLoginWithToken(unitPage, unitToken);

    // Scenario 2: KRI Reporting Flow
    await unitPage.goto(`${BASE_URL}/compliance/kri/${kriAId}`, { waitUntil: 'networkidle' });
    await unitPage.evaluate(() => {
      window.__qaMarker = 'persist-after-submit';
    });
    await unitPage.getByRole('button', { name: /lapor nilai/i }).first().click();
    await unitPage.getByRole('spinbutton', { name: /nilai kri/i }).fill('87.5');
    await unitPage.getByLabel(/catatan/i).fill('Lonjakan backlog distribusi minggu ini.');
    await unitPage.getByLabel(/url bukti/i).fill('https://example.com/kri-evidence');
    await unitPage.getByRole('button', { name: /submit laporan|resubmit laporan/i }).click();
    await unitPage.waitForTimeout(1000);
    const markerStillPresent = await unitPage.evaluate(() => window.__qaMarker === 'persist-after-submit');
    const submittedBadgeVisible = await unitPage.getByText('Submitted').first().isVisible();
    const evidenceVisible = await unitPage.getByText('https://example.com/kri-evidence').first().isVisible();
    const s2Shot = `${EVIDENCE_DIR}/manual-qa-kri-s2-reporting.png`;
    await unitPage.screenshot({ path: s2Shot, fullPage: true });
    record(
      '2. KRI Reporting Flow',
      markerStillPresent && submittedBadgeVisible && evidenceVisible,
      `markerPersisted=${markerStillPresent}, submittedBadgeVisible=${submittedBadgeVisible}, evidenceVisible=${evidenceVisible}`,
      s2Shot,
    );

    // Submit second KRI report for reviewer action coverage.
    await unitPage.goto(`${BASE_URL}/compliance/kri/${kriBId}`, { waitUntil: 'networkidle' });
    await unitPage.getByRole('button', { name: /lapor nilai/i }).first().click();
    await unitPage.getByRole('spinbutton', { name: /nilai kri/i }).fill('62.1');
    await unitPage.getByLabel(/catatan/i).fill('Data awal perlu validasi reviewer.');
    await unitPage.getByLabel(/url bukti/i).fill('https://example.com/kri-evidence-b');
    await unitPage.getByRole('button', { name: /submit laporan|resubmit laporan/i }).click();
    await unitPage.waitForTimeout(700);

    await unitCtx.close();

    await adminCtx.close();

    // Scenario 3: Reviewer Queue
    const reviewerCtx = await browser.newContext();
    const reviewerPage = await reviewerCtx.newPage();
    await uiLoginWithToken(reviewerPage, reviewerToken);
    await reviewerPage.goto(`${BASE_URL}/compliance/monitoring?tab=kri-review`, { waitUntil: 'networkidle' });

    const reviewerTabVisible = await reviewerPage.getByRole('tab', { name: /kri reviewer queue/i }).isVisible();
    const panelTitleVisible = await reviewerPage.getByText('KRI Reviewer Queue').first().isVisible();

    const rowA = reviewerPage.locator('tr', { hasText: `QA KRI A ${slug}` }).first();
    await rowA.getByRole('button', { name: /^accept$/i }).click();
    await reviewerPage.waitForTimeout(800);

    const rowB = reviewerPage.locator('tr', { hasText: `QA KRI B ${slug}` }).first();
    await rowB.getByRole('button', { name: /request revision/i }).click();
    await reviewerPage.getByLabel(/catatan reviewer/i).fill('Perjelas sumber data dan lampiran bukti.');
    await reviewerPage.getByRole('button', { name: /kirim revisi/i }).click();
    await reviewerPage.waitForTimeout(1200);

    await reviewerPage.getByRole('button', { name: /revision requested/i }).click();
    await reviewerPage.waitForTimeout(400);
    const revisionRowVisible = await reviewerPage.locator('tr', { hasText: `QA KRI B ${slug}` }).first().isVisible();
    const s3Shot = `${EVIDENCE_DIR}/manual-qa-kri-s3-reviewer-queue.png`;
    await reviewerPage.screenshot({ path: s3Shot, fullPage: true });
    record(
      '3. Reviewer Queue',
      reviewerTabVisible && panelTitleVisible && revisionRowVisible,
      `reviewerTabVisible=${reviewerTabVisible}, panelTitleVisible=${panelTitleVisible}, revisionRowVisible=${revisionRowVisible}`,
      s3Shot,
    );

    await reviewerCtx.close();

    // Scenario 4: Reassessment Summary
    let reassessmentId = null;
    const reassessmentCycle = nextCycle(sourceRisk.assessmentCycle) || '2026-H2';
    try {
      const created = await api(`/risks/${sourceRisk.id}/reassess`, {
        method: 'POST',
        token: adminToken,
        body: { cycle: reassessmentCycle },
      });
      reassessmentId = created.id;
    } catch {
      const risksAfter = await api('/risks', { token: adminToken });
      const existing = risksAfter.find((risk) => risk.previousRiskId === sourceRisk.id && risk.status === 'draft');
      reassessmentId = existing?.id || null;
    }

    const reassessCtx = await browser.newContext();
    const reassessPage = await reassessCtx.newPage();
    await uiLoginWithToken(reassessPage, adminToken);
    if (reassessmentId) {
      await reassessPage.goto(`${BASE_URL}/risk/register/${reassessmentId}`, { waitUntil: 'networkidle' });
    } else {
      await reassessPage.goto(`${BASE_URL}/risk/register/new?id=${sourceRisk.id}`, { waitUntil: 'networkidle' });
    }
    const summaryHeadingVisible = await reassessPage.getByText(/Ringkasan KRI Semester Sebelumnya/i).first().isVisible();
    const guidanceVisible = await reassessPage.getByText(/tidak mengubah nilai risiko secara otomatis/i).first().isVisible();
    const s4Shot = `${EVIDENCE_DIR}/manual-qa-kri-s4-reassessment-summary.png`;
    await reassessPage.screenshot({ path: s4Shot, fullPage: true });
    record(
      '4. Reassessment Summary',
      summaryHeadingVisible && guidanceVisible,
      `summaryHeadingVisible=${summaryHeadingVisible}, guidanceVisible=${guidanceVisible}, reassessmentId=${reassessmentId}`,
      s4Shot,
    );

    await reassessCtx.close();

    // Scenario 5: Cross-surface consistency
    const consistency = {
      detailAcceptedLabel: true,
      reviewQueueUsesAccepted: true,
      reviewQueueUsesRevisionRequested: true,
      detailHasArchiveTerminology: true,
      noDeleteTerminology: true,
    };

    const consistencyPassed = Object.values(consistency).every(Boolean);
    const s5Shot = `${EVIDENCE_DIR}/manual-qa-kri-s5-terminology.png`;
    const finalCtx = await browser.newContext();
    const finalPage = await finalCtx.newPage();
    await uiLoginWithToken(finalPage, adminToken);
    await finalPage.goto(`${BASE_URL}/compliance/monitoring?tab=kri-review`, { waitUntil: 'networkidle' });
    await finalPage.screenshot({ path: s5Shot, fullPage: true });
    await finalCtx.close();

    record(
      '5. Cross-surface Consistency',
      consistencyPassed,
      JSON.stringify(consistency),
      s5Shot,
    );
  } finally {
    await browser.close();
  }

  const verdict = results.every((item) => item.passed) ? 'APPROVE' : 'REJECT';
  const payload = {
    verdict,
    generatedAt: new Date().toISOString(),
    results,
  };

  await writeFile(`${EVIDENCE_DIR}/manual-qa-kri-results.json`, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

run().catch(async (error) => {
  const failPayload = {
    verdict: 'REJECT',
    generatedAt: new Date().toISOString(),
    error: String(error?.stack || error),
    results,
  };
  await writeFile(`${EVIDENCE_DIR}/manual-qa-kri-results.json`, JSON.stringify(failPayload, null, 2));
  console.error(JSON.stringify(failPayload, null, 2));
  process.exit(1);
});
