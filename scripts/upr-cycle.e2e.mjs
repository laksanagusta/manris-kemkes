// Run with a disposable, migrated database and local Manrisk API/UI servers.
// The server uses MANRIS_SIMULATED_NOW=2026-07-17T10:00:00+07:00 and direct risk finalization.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash, randomInt, randomUUID } from "node:crypto";

const { chromium } = await import(
  process.env.MANRISK_E2E_PLAYWRIGHT || "playwright"
);

const db = process.env.MANRISK_E2E_DATABASE_URL;
assert(
  db,
  "Set MANRISK_E2E_DATABASE_URL to a migrated disposable local PostgreSQL database.",
);
const database = new URL(db);
assert(
  ["127.0.0.1", "localhost"].includes(database.hostname) &&
    /^\/manrisk_upr_/.test(database.pathname),
  "Refusing to seed a non-test database.",
);
const origin = process.env.MANRISK_E2E_ORIGIN || "http://127.0.0.1:13083";
const api = process.env.MANRISK_E2E_API || "http://127.0.0.1:18083/api/v1";
for (const address of [origin, api]) {
  assert(
    ["127.0.0.1", "localhost"].includes(new URL(address).hostname),
    "Use local test servers.",
  );
}
const key =
  process.env.MANRISK_APP_KEY ||
  "auth_app_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const password = "ManriskUprTest2026!";
const hash = execFileSync("htpasswd", ["-bnBC", "4", "fixture", password], {
  encoding: "utf8",
})
  .trim()
  .split(":")[1];
const suffix = String(randomInt(100000, 999999));
const ids = Object.fromEntries(
  [
    "parent",
    "unit",
    "other",
    "sender",
    "receiver",
    "outsider",
    "planning",
    "goal",
    "objective",
    "emptyObjective",
    "nextPlanning",
    "nextGoal",
    "nextObjective",
    "risk",
    "skipped",
    "riskGroup",
    "skippedGroup",
    "kk1",
    "kk2",
    "kkReplacement",
    "evaluation",
    "template",
  ].map((name) => [name, randomUUID()]),
);
const nip = (index) => `200001012025${index}${suffix.slice(1)}`;
const baseCode = `R-A-${suffix}`;
const skippedCode = `R-C-${suffix}`;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const {
  parent,
  unit,
  other,
  sender,
  receiver,
  outsider,
  planning,
  goal,
  objective,
  emptyObjective,
  nextPlanning,
  nextGoal,
  nextObjective,
  risk,
  skipped,
  riskGroup,
  skippedGroup,
  kk1,
  kk2,
  kkReplacement,
  evaluation,
  template,
} = ids;

function sql(statement) {
  return execFileSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", db], {
    input: statement,
    encoding: "utf8",
  }).trim();
}

async function request(path, token, body, method, expected = 200) {
  const response = await fetch(api + path, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  assert.equal(
    response.status,
    expected,
    `${method || (body === undefined ? "GET" : "POST")} ${path}: ${text}`,
  );
  return text ? JSON.parse(text).data : null;
}

async function login(index) {
  const response = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ nip: nip(index), password }),
  });
  const text = await response.text();
  assert.equal(response.status, 200, `Login fixture ${index}: ${text}`);
  return JSON.parse(text).data.token;
}

async function pageFor(browser, token) {
  const context = await browser.newContext();
  await context.addInitScript((session) => {
    localStorage.setItem("manris_token", session);
  }, token);
  const page = await context.newPage();
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  return page;
}

const riskData = (id, probability, title = "Validasi data terlambat") => ({
  id,
  title,
  description: "Gangguan validasi memengaruhi capaian layanan.",
  category: "operasional",
  organizationId: unit,
  status: "final",
  probability,
  impact: 4,
  cause: ["Keterlambatan input"],
  impactDesc: ["Jadwal layanan bergeser"],
  riskSource: "internal",
  controllability: "C",
  existingControl: "Cek bulanan",
  controlEffectiveness: "Efektif",
  treatmentOption: "mitigasi",
  targetProbability: 1,
  targetImpact: 3,
  assessmentCycle: "2026-Q3",
  changeReason: "Penilaian risiko untuk profil tahunan.",
  mitigations: [
    {
      action: "Tinjau jadwal dan kapasitas",
      owner: "Tim uji",
      frequency: "insidental",
    },
  ],
});

const checks = [];
const check = (step) => {
  checks.push(step);
  process.stdout.write(`PASS ${step}\n`);
};
const storageSecret = createHash("sha256").update(key).digest("hex");
sql(`
BEGIN;
INSERT INTO auth_applications(id,name,key_hash) VALUES ('manris','Manris',${quote(storageSecret)})
ON CONFLICT(id) DO UPDATE SET key_hash=EXCLUDED.key_hash;
INSERT INTO organizations(id,name,parent_id,upr_level) VALUES
('${parent}','UPR-T.I Uji ${suffix}',NULL,'upr_t1'),
('${unit}','UPR-T.II Uji ${suffix}','${parent}','upr_t2'),
('${other}','UPR Lain ${suffix}',NULL,'upr_t1');
INSERT INTO users(id,name,username,email,password_hash,role,organization_id,status,nip) VALUES
('${sender}','Pengirim Uji','upr-a-${suffix}','upr-a-${suffix}@example.test',${quote(hash)},'unit','${unit}','active','${nip(1)}'),
('${receiver}','Penerima Uji','upr-b-${suffix}','upr-b-${suffix}@example.test',${quote(hash)},'reviewer','${parent}','active','${nip(2)}'),
('${outsider}','Anggota Lain','upr-c-${suffix}','upr-c-${suffix}@example.test',${quote(hash)},'unit','${other}','active','${nip(3)}');
INSERT INTO planning(id,organization_id,period,title,status) VALUES
('${planning}','${unit}','2026','Rencana Uji 2026','active'),('${nextPlanning}','${unit}','2027','Rencana Uji 2027','active');
INSERT INTO planning_goals(id,organization_id,period,title,status,planning_id) VALUES
('${goal}','${unit}','2026','Tujuan Uji','active','${planning}'),('${nextGoal}','${unit}','2027','Tujuan Uji 2027','active','${nextPlanning}');
INSERT INTO planning_objectives(id,goal_id,title) VALUES
('${objective}','${goal}','Validasi data tepat waktu'),('${emptyObjective}','${goal}','Sasaran tanpa risiko'),
('${nextObjective}','${nextGoal}','Sasaran tahun berikutnya');
INSERT INTO risks(id,code,title,description,status,category,organization_id,created_by,version_group_id,
  is_current,is_cycle_current,assessment_cycle,probability,impact,weight,nilai,target_probability,target_impact,
  target_nilai,existing_control,control_effectiveness,treatment_option,cause,impact_description,effective_from,finalized_at,created_at) VALUES
('${risk}','${baseCode}','Validasi data terlambat','Gangguan validasi memengaruhi capaian layanan.','final','operasional','${unit}','${sender}','${riskGroup}',
 true,true,'2025-Q4',3,4,1.46,17.52,1,3,6,'Cek bulanan','Efektif','mitigasi',ARRAY['Keterlambatan input'],ARRAY['Jadwal layanan bergeser'],'2025-10-01','2025-10-01','2025-10-01'),
('${skipped}','${skippedCode}','Risiko yang dilewati','Masih dipantau di Register.','final','operasional','${unit}','${sender}','${skippedGroup}',
 true,true,'2025-Q4',1,4,3,12,1,3,6,'Cek bulanan','Efektif','mitigasi',ARRAY['Petugas terbatas'],ARRAY['Antrean data'],'2025-10-01','2025-10-01','2025-10-01');
WITH plan AS (
  INSERT INTO planning(organization_id,period,title,status) VALUES ('${other}','2026','Rencana bersama ${suffix}','active') RETURNING id
), g AS (
  INSERT INTO planning_goals(period,title,status,planning_id) SELECT '2026','Tujuan bersama','active',id FROM plan RETURNING id
), obj AS (
  INSERT INTO planning_objectives(goal_id,title) SELECT id,'Sasaran bersama ${suffix}' FROM g RETURNING id
), iku AS (
  INSERT INTO planning_ikus(objective_id,title) SELECT id,'IKU bersama' FROM obj RETURNING id
), prog AS (
  INSERT INTO planning_programs(iku_id,title) SELECT id,'Program bersama' FROM iku RETURNING id
), act AS (
  INSERT INTO planning_activities(program_id,title) SELECT id,'Kegiatan bersama' FROM prog RETURNING id
)
INSERT INTO planning_ros(activity_id,period,title,scope_mode) SELECT id,'2026','RO seluruh satker','all_satker' FROM act;
INSERT INTO mitigations(risk_id,action,owner,frequency) VALUES ('${risk}','Tinjau jadwal dan kapasitas','Tim uji','insidental');
INSERT INTO evaluation_templates(id,template_key,name,version,status) VALUES ('${template}','e2e-${suffix}','Template uji',1,'active');
INSERT INTO evaluations(id,organization_id,period,template_id,status,code,sequence_no,problems)
VALUES ('${evaluation}','${unit}','2026-Q2','${template}','draft','EV-${suffix}',1,'Bukti sebelum revisi');
INSERT INTO evaluation_sections(evaluation_id,section_key,title,sort_order)
VALUES ('${evaluation}','document_completeness','Kelengkapan dokumen',1);
COMMIT;
`);

const [senderToken, receiverToken, outsiderToken] = await Promise.all([
  login(1),
  login(2),
  login(3),
]);
const runtimeErrors = [];
const browser = await chromium.launch({
  ...(process.env.MANRISK_E2E_CHROME
    ? { executablePath: process.env.MANRISK_E2E_CHROME }
    : {}),
});
try {
  const senderPage = await pageFor(browser, senderToken);
  const receiverPage = await pageFor(browser, receiverToken);
  await senderPage.goto(origin + "/risk/annual-profiles");
  await senderPage
    .getByRole("button", { name: "Tambah profil", exact: true })
    .click();
  const initiation = senderPage.getByRole("dialog", {
    name: "Tambah profil risiko tahunan",
  });
  await initiation.getByRole("button", { name: "Batal", exact: true }).click();
  await initiation.waitFor({ state: "hidden" });
  assert(
    await senderPage
      .getByRole("button", { name: "Tambah profil", exact: true })
      .evaluate((button) => button === document.activeElement),
  );
  await senderPage
    .getByRole("button", { name: "Tambah profil", exact: true })
    .click();
  await initiation.getByLabel("Tahun profil").fill("2026");
  await initiation
    .getByRole("checkbox", { name: new RegExp(`Pilih ${baseCode}`) })
    .check();
  await initiation
    .getByRole("button", { name: "Buat draf · 1 risiko", exact: true })
    .click();
  await senderPage.waitForURL("**/risk/annual-profiles/2026?versi=*");
  const addRisk = senderPage.getByRole("button", {
    name: "Tindakan profil",
    exact: true,
  });
  await addRisk.click();
  await senderPage.getByRole("menuitem", { name: /^Tambah risiko/ }).click();
  const picker = senderPage.getByRole("dialog", {
    name: "Tambah risiko ke profil 2026",
  });
  const pickupSearch = picker.getByRole("combobox", {
    name: "Cari risiko untuk ditambahkan",
  });
  await pickupSearch.and(senderPage.locator(":focus")).waitFor();
  await pickupSearch.fill(skippedCode);
  await picker.getByRole("option", { name: new RegExp(skippedCode) }).waitFor();
  await pickupSearch.press("ArrowDown");
  await pickupSearch.press("Enter");
  await picker
    .getByRole("button", { name: "Tambahkan 1 risiko", exact: true })
    .waitFor();
  await pickupSearch.fill(baseCode);
  await picker
    .getByText("Tidak ada risiko yang cocok dengan pencarian.")
    .waitFor();
  await picker
    .getByRole("button", { name: "Tambahkan 1 risiko", exact: true })
    .waitFor();
  await pickupSearch.press("Escape");
  await picker.waitFor({ state: "hidden" });
  await addRisk.and(senderPage.locator(":focus")).waitFor();
  check(
    "pencarian pickup pada detail mendukung keyboard dan menjaga pilihan antar pencarian",
  );
  const initiated = await request("/annual-profiles/2026", senderToken);
  assert.equal(initiated.members[0].sourceRiskId, risk);
  assert.equal(
    initiated.members[0].riskId,
    null,
    "No assessment is created during initiation",
  );
  assert.equal(
    (await request("/annual-profiles", senderToken))[0].riskCount,
    1,
  );
  await request(
    "/annual-profiles/2026/initiate",
    senderToken,
    { riskIds: [risk] },
    "POST",
    409,
  );
  check(
    "daftar profil dan inisiasi Register membuat satu draf dengan risiko yang dipilih",
  );
  const candidates = await request(
    "/annual-profiles/2026/candidates",
    senderToken,
  );
  assert.equal(
    candidates.find((item) => item.id === risk).source,
    "year_end_register",
  );
  await senderPage
    .getByRole("row", { name: new RegExp(baseCode) })
    .getByRole("button", { name: "Siapkan penilaian", exact: true })
    .click();
  await senderPage.getByLabel("Sasaran 2026", { exact: true }).click();
  await senderPage
    .getByRole("option", { name: "Validasi data tepat waktu", exact: true })
    .click();
  await senderPage.getByLabel("Berlaku mulai").fill("2026-01-15");
  await senderPage
    .getByLabel("Alasan perubahan atau koreksi")
    .fill("Menetapkan kondisi awal berdasarkan bukti Januari.");
  await senderPage
    .getByRole("button", { name: "Simpan & buka penilaian", exact: true })
    .click();
  await senderPage.waitForURL("**/risk/register/new?**");
  await senderPage
    .getByRole("link", { name: "Kembali ke Profil Risiko Tahunan" })
    .first()
    .waitFor();
  const draftRisk = new URL(senderPage.url()).searchParams.get("id");
  assert(draftRisk && draftRisk !== risk);
  const profile1 = (await request("/annual-profiles/2026", senderToken))
    .selected.id;
  await request(
    `/annual-profile-versions/${profile1}/finalize`,
    senderToken,
    {},
    "POST",
    422,
  );
  await request(
    `/risks/${draftRisk}`,
    senderToken,
    riskData(draftRisk, 3),
    "PUT",
  );
  const stableRisk = await request(
    "/risks",
    senderToken,
    riskData(undefined, 1, "Risiko dengan baseline tetap"),
    "POST",
    201,
  );
  const stableInput = {
    riskId: stableRisk.id,
    objectiveId: objective,
    effectiveFrom: "2026-01-15",
    changeReason: "Penilaian kondisi awal Januari.",
  };
  await request(
    `/annual-profile-versions/${profile1}/members`,
    senderToken,
    stableInput,
  );
  const stableMember = (
    await request("/annual-profiles/2026", senderToken)
  ).members.find((item) => item.riskId === stableRisk.id);
  await request(
    `/annual-profile-versions/${profile1}/members/${stableMember.groupId}`,
    senderToken,
    undefined,
    "DELETE",
  );
  assert(
    !(await request("/annual-profiles/2026", senderToken)).members.some(
      (item) => item.riskId === stableRisk.id,
    ),
  );
  await request(
    `/annual-profile-versions/${profile1}/members`,
    senderToken,
    stableInput,
  );
  const concurrentDrafts = await Promise.all([
    request("/annual-profiles/2026/draft", senderToken, {}),
    request("/annual-profiles/2026/draft", senderToken, {}),
  ]);
  assert(concurrentDrafts.every((item) => item.id === profile1));
  await senderPage.goto(origin + "/risk/annual-profiles?tahun=2026");
  await senderPage.getByRole("button", { name: "Tindakan profil", exact: true }).click();
  await senderPage.getByRole("menuitem", { name: /^Tinjau & finalisasi/ }).click();
  await senderPage
    .getByRole("dialog")
    .getByRole("button", { name: "Finalisasi profil", exact: true })
    .click();
  await senderPage.getByText(/^Difinalisasi 17 Juli 2026\./).waitFor();
  const v1 = await request(
    `/annual-profiles/2026?version=${profile1}`,
    senderToken,
  );
  assert.equal(v1.members.length, 2);
  assert.equal(v1.members.find((member) => member.code === baseCode).score, 18);
  assert.equal(
    v1.members.find((member) => member.code === baseCode).groupId,
    riskGroup,
  );
  assert(v1.objectives.some((item) => item.id === emptyObjective));
  assert(
    v1.objectives.some((item) => item.title === `Sasaran bersama ${suffix}`),
  );
  assert.equal(
    sql(
      `SELECT is_current AND archived_at IS NULL FROM risks WHERE id='${skipped}'`,
    ),
    "t",
  );
  check(
    "pickup dari register akhir tahun, lineage, finalisasi, sasaran kosong dan risiko yang dilewati",
  );

  // Fixtures represent upstream monitoring and completed Q1 KK. The new report flow
  // reads the real production tables and restores the working-paper content.
  sql(`
  INSERT INTO risk_monitorings(source_risk_id,version_group_id,assessment_cycle,status,source_probability,source_impact,observed_nilai,conclusion,finalized_at) VALUES
  ('${draftRisk}','${riskGroup}','2026-Q1','final',3,4,13,'Observasi Q1','2026-04-01'),
  ('${draftRisk}','${riskGroup}','2026-Q2','final',3,4,12,'Observasi Q2','2026-07-01'),
  ('${skipped}','${skippedGroup}','2026-Q1','final',1,4,12,'Risiko di luar profil','2026-04-01');
  INSERT INTO working_papers(id,sequence_no,code,title,org_id,status,assessment_cycle,document_hash,created_by,completed_at,tte_skipped)
  VALUES ('${kk1}',1,'KK-Q1-${suffix}','KK triwulan satu','${unit}','completed','2026-Q1','hash-fixture','${sender}','2026-04-02',true),
  ('${kk2}',2,'KK-Q2-${suffix}','KK triwulan dua','${unit}','draft','2026-Q2','hash-fixture','${sender}',NULL,false);
  INSERT INTO working_paper_risks(working_paper_id,risk_id,version_group_id,source_mode,sort_order) VALUES
  ('${kk1}','${draftRisk}','${riskGroup}','latest_approved',0),('${kk1}','${skipped}','${skippedGroup}','latest_approved',1);
  `);
  const semester1 = { year: 2026, semester: 1 };
  const noProfile = await request(
    "/upr-reports/semester/preview",
    senderToken,
    semester1,
  );
  assert.equal(noProfile.profile, null);
  await request(
    "/upr-reports/semester/finalize",
    senderToken,
    { ...semester1, profileId: profile1 },
    "POST",
    422,
  );
  await request(
    `/upr-reports/${kk2}/send`,
    senderToken,
    { kind: "working_paper" },
    "POST",
    422,
  );
  await request(
    `/upr-reports/${evaluation}/send`,
    senderToken,
    { kind: "evaluation" },
    "POST",
    422,
  );
  const { id: report1 } = await request(
    "/upr-reports/semester/finalize",
    senderToken,
    { ...semester1, profileId: profile1, reason: "Profil pertama merekam kondisi per 30 Juni." },
  );
  await request(`/upr-reports/${report1}`, receiverToken, undefined, "GET", 404);
  await request(`/upr-reports/${report1}/send`, senderToken, {});
  const original = await request(`/upr-reports/${report1}`, receiverToken);
  assert.equal(original.snapshot.cutoff, "2026-06-30");
  assert.equal(original.snapshot.risks.length, 2);
  assert.equal(
    original.snapshot.risks.find((item) => item.code === baseCode).score,
    18,
  );
  assert(!original.snapshot.risks.some((item) => item.code === skippedCode));
  assert.deepEqual(
    original.snapshot.risks
      .find((item) => item.code === baseCode)
      .monitoring.map(({ score }) => score),
    [13, 12],
  );
  assert.equal(
    original.snapshot.supporting.filter((item) => !item.sourceId).length,
    2,
  );
  assert.equal(original.sentBy, sender);
  await request(
    `/upr-reports/${report1}`,
    outsiderToken,
    undefined,
    "GET",
    404,
  );
  await request(
    `/upr-report-deliveries/${original.deliveryId}/resolve`,
    outsiderToken,
    { resolution: "accepted" },
    "POST",
    404,
  );
  check(
    "profil pertama final Juli, pratinjau dan kirim S1 dengan dokumen belum lengkap, isolasi organisasi",
  );

  await receiverPage.goto(origin + "/laporan");
  await receiverPage
    .getByRole("row", { name: /Laporan Penerapan Manajemen Risiko/ })
    .getByRole("link", { name: /Laporan Penerapan Manajemen Risiko/ })
    .click();
  await receiverPage
    .getByRole("button", { name: "Minta perbaikan", exact: true })
    .click();
  await receiverPage
    .getByLabel("Catatan perbaikan")
    .fill("Koreksi skor berdasarkan bukti per 30 Juni.");
  await receiverPage
    .getByRole("dialog")
    .getByRole("button", { name: "Minta perbaikan", exact: true })
    .click();
  await receiverPage.getByText("Perlu perbaikan", { exact: true }).waitFor();

  const profile2 = (
    await request("/annual-profiles/2026/draft", senderToken, {})
  ).id;
  const draft2 = (
    await request(`/annual-profile-versions/${profile2}/members`, senderToken, {
      riskId: draftRisk,
      objectiveId: objective,
      effectiveFrom: "2026-06-30",
      changeReason: "Koreksi bukti Juni.",
      reassess: true,
    })
  ).riskId;
  await request(`/risks/${draft2}`, senderToken, riskData(draft2, 2), "PUT");
  const newRisk = await request(
    "/risks",
    senderToken,
    riskData(undefined, 2, "Gangguan baru Juli"),
    "POST",
    201,
  );
  await request(`/annual-profile-versions/${profile2}/members`, senderToken, {
    riskId: newRisk.id,
    objectiveId: emptyObjective,
    effectiveFrom: "2026-07-10",
    changeReason: "Bukti pertama ditemukan 10 Juli.",
  });
  await request(
    `/annual-profile-versions/${profile2}/finalize`,
    senderToken,
    {},
  );
  const revised = await request("/annual-profiles/2026", senderToken);
  assert.deepEqual(
    revised.members.map((member) => member.score).sort(),
    [12, 15, 15],
  );
  const unchanged = revised.members.find(
    (member) => member.riskId === stableRisk.id,
  );
  assert.deepEqual(
    unchanged.baseline,
    v1.members.find((member) => member.riskId === stableRisk.id).baseline,
  );
  assert.equal(
    revised.members.find((member) => member.code === baseCode).riskId,
    draft2,
  );
  assert.equal(
    (
      await request(`/annual-profiles/2026?version=${profile1}`, senderToken)
    ).members.find((member) => member.code === baseCode).score,
    18,
  );

  await request(`/evaluations/${evaluation}/finalize`, senderToken, {});
  sql(
    `UPDATE working_papers SET status='completed',completed_at='2026-07-17',tte_skipped=true WHERE id='${kk2}'`,
  );
  await senderPage.goto(origin + "/laporan");
  await senderPage.getByRole("link", { name: "+ Buat Laporan", exact: true }).waitFor();
  assert.equal(await senderPage.getByRole("tab").count(), 0);
  const sentPaper = await request(`/upr-reports/${kk1}/send`, senderToken, {
    kind: "working_paper",
  });
  const paper = await request(`/upr-reports/${sentPaper.id}`, receiverToken);
  assert(paper.snapshot.risks.some((item) => item.risk.code === skippedCode));
  const kkQ2 = await request(`/upr-reports/${kk2}/send`, senderToken, {
    kind: "working_paper",
  });
  const eval1 = await request(`/upr-reports/${evaluation}/send`, senderToken, {
    kind: "evaluation",
  });
  for (const id of [paper.id, kkQ2.id, eval1.id]) {
    const doc = await request(`/upr-reports/${id}`, receiverToken);
    await request(
      `/upr-report-deliveries/${doc.deliveryId}/resolve`,
      receiverToken,
      { resolution: "accepted" },
    );
  }
  await request(`/evaluations/${evaluation}/reopen`, senderToken, {});
  assert.equal(
    (await request(`/upr-reports/${eval1.id}`, receiverToken)).snapshot.status,
    "final",
  );
  sql(
    `UPDATE evaluations SET problems='Bukti setelah revisi',updated_at=now() WHERE id='${evaluation}'`,
  );
  await request(`/evaluations/${evaluation}/finalize`, senderToken, {});
  const eval2 = await request(`/upr-reports/${evaluation}/send`, senderToken, {
    kind: "evaluation",
  });
  assert.notEqual(eval2.id, eval1.id);
  assert.equal(
    (await request(`/upr-reports/${eval1.id}`, receiverToken)).snapshot
      .problems,
    "Bukti sebelum revisi",
  );
  assert.equal(
    (await request(`/upr-reports/${eval2.id}`, receiverToken)).snapshot
      .problems,
    "Bukti setelah revisi",
  );

  // Completed KK content is immutable. A corrected KK can be a new source
  // document responding to the delivery that asked for corrections.
  // Test correction on another completed KK whose delivery is still pending.
  sql(`INSERT INTO working_papers(id,sequence_no,code,title,org_id,status,assessment_cycle,document_hash,created_by,completed_at,tte_skipped)
    VALUES ('${kkReplacement}',3,'KK-Q2-revisi-${suffix}','KK Q2 perbaikan','${unit}','completed','2026-Q2','hash-perbaikan','${sender}','2026-07-17',true)`);
  const awaitingKK = await request(
    `/upr-reports/${kkReplacement}/send`,
    senderToken,
    { kind: "working_paper" },
  );
  const awaitingDetail = await request(
    `/upr-reports/${awaitingKK.id}`,
    receiverToken,
  );
  await request(
    `/upr-report-deliveries/${awaitingDetail.deliveryId}/resolve`,
    receiverToken,
    { resolution: "changes_requested", note: "Lengkapi catatan." },
  );
  const correctedPaperID = randomUUID();
  sql(`INSERT INTO working_papers(id,sequence_no,code,title,org_id,status,assessment_cycle,document_hash,created_by,completed_at,tte_skipped)
    VALUES ('${correctedPaperID}',4,'KK-Q2-final-${suffix}','KK Q2 dengan catatan lengkap','${unit}','completed','2026-Q2','hash-koreksi','${sender}','2026-07-17',true)`);
  const fixedKK = await request(
    `/upr-reports/${correctedPaperID}/send`,
    senderToken,
    { kind: "working_paper", previousDeliveryId: awaitingDetail.deliveryId },
  );
  const fixedDetail = await request(
    `/upr-reports/${fixedKK.id}`,
    receiverToken,
  );
  assert.equal(fixedDetail.previousDeliveryId, awaitingDetail.deliveryId);
  assert.equal(fixedDetail.snapshot.title, "KK Q2 dengan catatan lengkap");
  assert.equal(
    (await request(`/upr-reports/${awaitingKK.id}`, receiverToken)).snapshot
      .title,
    "KK Q2 perbaikan",
  );
  assert.equal(
    (
      await request(`/upr-reports/${correctedPaperID}/send`, senderToken, {
        kind: "working_paper",
        previousDeliveryId: awaitingDetail.deliveryId,
      })
    ).id,
    fixedKK.id,
  );
  check(
    "KK dan Evaluasi dikirim serta diterima terpisah dan versi penerima tetap tersedia setelah Evaluasi dibuka ulang",
  );

  const input2 = {
    ...semester1,
    profileId: profile2,
    reason: "Perbaikan berdasarkan catatan UPR-T.I.",
  };
  const { id: report2 } = await request(
    "/upr-reports/semester/finalize",
    senderToken,
    input2,
  );
  const retried = await request(
    "/upr-reports/semester/finalize",
    senderToken,
    input2,
  );
  assert.equal(retried.id, report2);
  await request(`/upr-reports/${report2}/send`, senderToken, {});
  await request(`/upr-reports/${report2}/send`, senderToken, {});
  const corrected = await request(`/upr-reports/${report2}`, receiverToken);
  assert.equal(corrected.version, 2);
  assert.equal(corrected.previousDeliveryId, original.deliveryId);
  assert.equal(corrected.snapshot.risks.length, 2);
  assert.equal(
    corrected.snapshot.risks.find((item) => item.code === baseCode).score,
    15,
  );
  assert(!corrected.snapshot.risks.some((item) => item.riskId === newRisk.id));
  assert.deepEqual(
    corrected.snapshot.risks
      .find((item) => item.code === baseCode)
      .monitoring.map(({ score }) => score),
    [13, 12],
  );
  assert.equal(
    corrected.snapshot.supporting.filter((item) => !item.sourceId).length,
    0,
  );
  assert.equal(
    corrected.snapshot.supporting.find((item) => item.kind === "evaluation")
      .contents.problems,
    "Bukti setelah revisi",
  );
  await request(`/evaluations/${evaluation}/reopen`, senderToken, {});
  sql(
    `UPDATE evaluations SET problems='Perubahan setelah laporan dibekukan',updated_at=now() WHERE id='${evaluation}'`,
  );
  assert.deepEqual(
    (await request(`/upr-reports/${report2}`, receiverToken)).snapshot,
    corrected.snapshot,
  );
  sql(`UPDATE users SET role='unit' WHERE id='${receiver}'`);
  await receiverPage.goto(origin + `/laporan/${report2}`);
  await receiverPage
    .getByRole("button", { name: "Terima laporan", exact: true })
    .click();
  await receiverPage
    .getByRole("dialog")
    .getByRole("button", { name: "Terima laporan", exact: true })
    .click();
  await receiverPage.getByText("Diterima", { exact: true }).waitFor();
  await receiverPage.getByRole("link", { name: "Versi sebelumnya" }).click();
  await receiverPage
    .getByText("Koreksi skor berdasarkan bukti per 30 Juni.", { exact: true })
    .waitFor();
  const old = await request(`/upr-reports/${report1}`, receiverToken);
  assert.deepEqual(old.snapshot, original.snapshot);
  assert.equal(old.resolution, "changes_requested");
  assert.equal(
    (await request(`/upr-reports/${report2}`, receiverToken)).resolvedBy,
    receiver,
  );
  check(
    "revisi campuran: S1 v2 hanya menerima koreksi Juni, mempertahankan aktual Q1/Q2, histori, dan tanda terima",
  );

  const { id: reportH2 } = await request(
    "/upr-reports/semester/finalize",
    senderToken,
    { year: 2026, semester: 2 },
  );
  const second = await request(`/upr-reports/${reportH2}`, senderToken);
  assert(second.snapshot.risks.some((item) => item.riskId === newRisk.id));
  assert(!second.snapshot.risks.some((item) => item.code === skippedCode));
  await request(`/upr-reports/${reportH2}/send`, senderToken, {});
  const sentH2 = await request(`/upr-reports/${reportH2}`, receiverToken);
  await request(
    `/upr-report-deliveries/${sentH2.deliveryId}/resolve`,
    receiverToken,
    { resolution: "accepted" },
  );
  const next = await request("/annual-profiles/2027/candidates", senderToken);
  assert.equal(
    next.find((item) => item.groupId === skippedGroup).source,
    "other_active",
  );
  assert.equal(
    next.find((item) => item.groupId === riskGroup).source,
    "prior_profile",
  );
  sql(
    `UPDATE risks SET archived_at=now(),archived_reason='E2E arsip' WHERE id='${stableRisk.id}';`,
  );
  const olderSource = `/annual-profiles/2027/pickup?sourceProfileId=${profile1}`;
  const sourceRisks = await request(olderSource, senderToken);
  assert.equal(sourceRisks.filter((item) => !item.unavailable).length, 1);
  assert(sourceRisks.some((item) => /Diarsipkan/.test(item.unavailable)));
  await request(olderSource, outsiderToken, undefined, "GET", 404);
  assert.deepEqual(await request("/annual-profiles", outsiderToken), []);
  await request(
    "/annual-profiles/2027/initiate",
    senderToken,
    {
      sourceProfileId: profile1,
      riskIds: [sourceRisks.find((item) => !item.unavailable).id, skipped],
    },
    "POST",
    409,
  );
  assert.equal(
    (await request("/annual-profiles/2027", senderToken)).selected,
    null,
    "Invalid pickup leaves no draft",
  );
  await senderPage.setViewportSize({ width: 390, height: 844 });
  await senderPage.goto(origin + "/risk/annual-profiles");
  await senderPage
    .getByRole("button", { name: "Tambah profil", exact: true })
    .click();
  await initiation.getByLabel("Tahun profil").fill("2026");
  await initiation
    .getByRole("button", { name: "Buka profil final", exact: true })
    .waitFor();
  await initiation.getByLabel("Tahun profil").fill("2027");
  await initiation.getByLabel("Sumber risiko").click();
  await senderPage
    .getByRole("option", { name: "Ambil dari profil final" })
    .click();
  await initiation.getByLabel("Profil sumber").click();
  await senderPage
    .getByRole("option", { name: "2026 · Versi 1 Final", exact: true })
    .click();
  await initiation
    .getByText("Diarsipkan atau tidak lagi aktif", { exact: true })
    .filter({ visible: true })
    .waitFor();
  await initiation
    .getByRole("button", {
      name: "Pilih semua 1 risiko yang bisa dibawa",
      exact: true,
    })
    .click();
  assert(
    await senderPage.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Pickup dialog should fit mobile viewport",
  );
  const output = process.env.MANRISK_E2E_OUTPUT;
  if (output) {
    mkdirSync(output, { recursive: true });
    await senderPage.screenshot({
      path: output + "/profil-tahunan-pickup-mobile.png",
    });
  }
  await initiation
    .getByRole("button", { name: "Buat draf · 1 risiko", exact: true })
    .click();
  await senderPage.waitForURL("**/risk/annual-profiles/2027?versi=*");
  const nextDraft = await request("/annual-profiles/2027", senderToken);
  const nextProfile = nextDraft.selected.id;
  assert.equal(nextDraft.members[0].groupId, riskGroup);
  assert.equal(nextDraft.members[0].riskId, null);
  await senderPage.getByRole("button", { name: "Tindakan profil", exact: true }).click();
  await senderPage.getByRole("menuitem", { name: /^Tambah risiko/ }).click();
  const detailPickup = senderPage.getByRole("dialog", {
    name: "Tambah risiko ke profil 2027",
  });
  await detailPickup
    .getByRole("tab", { name: "Dari profil sebelumnya" })
    .click();
  await detailPickup
    .getByRole("button", {
      name: "Pilih semua 1 risiko dari sumber ini",
      exact: true,
    })
    .click();
  await detailPickup.getByRole("tab", { name: "Risiko aktif" }).click();
  await detailPickup
    .getByRole("button", { name: "Tambahkan 1 risiko", exact: true })
    .click();
  await detailPickup.waitFor({ state: "hidden" });
  const afterBulk = await request("/annual-profiles/2027", senderToken);
  assert.equal(afterBulk.members.length, 2);
  assert(afterBulk.members.some((item) => item.sourceRiskId === newRisk.id && item.riskId === null));
  check(
    "tab profil sebelumnya memilih seluruh kandidat dan menyimpan pilihan saat ganti tab",
  );
  check(
    "bulk dari versi final lama menolak arsip, menjaga scope, dan membuat draf atomik di mobile",
  );
  await request(
    `/annual-profile-versions/${nextProfile}/members`,
    senderToken,
    {
      riskId: skipped,
      objectiveId: nextObjective,
      effectiveFrom: "2027-01-10",
      reassess: true,
    },
  );
  assert.equal(
    (await request("/annual-profiles/2027", senderToken)).members.some(
      (item) => item.groupId === skippedGroup,
    ),
    true,
  );
  check(
    "S2 mencakup risiko Juli dan rollover bisa mengambil risiko aktif yang dilewati",
  );
  await senderPage.setViewportSize({ width: 1280, height: 900 });
  await senderPage.goto(origin + "/design-system#workspace-annual-profile");
  const catalog = senderPage
    .locator("section")
    .filter({ has: senderPage.locator("#workspace-annual-profile") });
  await catalog
    .getByRole("button", { name: "Tambah profil", exact: true })
    .click();
  await initiation
    .getByRole("button", {
      name: "Pilih semua 2 risiko yang bisa dibawa",
      exact: true,
    })
    .click();
  await initiation
    .getByRole("button", { name: "Buat draf · 2 risiko", exact: true })
    .click();
  await catalog
    .getByRole("heading", { name: "Profil 2027", exact: true })
    .waitFor();
  await catalog
    .getByRole("button", { name: "Kembali ke daftar profil contoh" })
    .click();
  await catalog
    .getByRole("row")
    .filter({ hasText: "2027" })
    .getByRole("button", { name: "Lanjutkan draf", exact: true })
    .waitFor();
  check(
    "design system menampilkan alur daftar, modal dan draf dengan data ilustratif",
  );
  if (output) {
    mkdirSync(output, { recursive: true });
    await receiverPage.goto(origin + `/laporan/${report2}`);
    await receiverPage.getByText("Diterima", { exact: true }).waitFor();
    await receiverPage.screenshot({
      path: output + "/laporan-desktop.png",
      fullPage: true,
    });
    await receiverPage.setViewportSize({ width: 390, height: 844 });
    await receiverPage.screenshot({
      path: output + "/laporan-mobile.png",
      fullPage: true,
    });
    assert(
      await receiverPage.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      "Mobile document overflows viewport",
    );
    writeFileSync(
      output + "/results.json",
      JSON.stringify(
        {
          passed: true,
          checks,
          runtimeErrors,
          profile1,
          profile2,
          report1,
          report2,
          reportH2,
        },
        null,
        2,
      ),
    );
  }
  assert.deepEqual(runtimeErrors, []);
} finally {
  await browser.close();
}
