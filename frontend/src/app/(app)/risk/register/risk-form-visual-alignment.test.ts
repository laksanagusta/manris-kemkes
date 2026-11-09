import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registrationSource = readFileSync(
  new URL("./new/page.tsx", import.meta.url),
  "utf8",
);
const assessmentSource = readFileSync(
  new URL("../assessment/[id]/page.tsx", import.meta.url),
  "utf8",
);
const mitigationStatusSource = readFileSync(
  new URL(
    "../assessment/[id]/_components/mitigation-status-table.tsx",
    import.meta.url,
  ),
  "utf8",
);
const monitoringSummarySource = readFileSync(
  new URL("../assessment/components/simpulan-card.tsx", import.meta.url),
  "utf8",
);

for (const [name, source] of [
  ["registration", registrationSource],
  ["assessment", assessmentSource],
] as const) {
  test(`${name} uses the expected form shell`, () => {
    assert.match(
      source,
      /<FormPage[\s\S]{0,180}risk-form-filter-controls space-y-6/,
    );
    if (name === "registration") {
      assert.doesNotMatch(source, /<CollectionPageHeader/);
      assert.match(
        source,
        /<FormPage className="risk-form-filter-controls space-y-6">\s*<div className="flex flex-wrap items-center justify-end gap-2">/,
      );
      assert.doesNotMatch(source, /<FormHeader/);
      assert.match(source, /Simpan draft/);
      assert.match(source, /Finalisasi/);
      assert.doesNotMatch(source, /Accordion/);
      for (const sectionId of [
        "identifikasi",
        "analisis",
        "evaluasi",
        "penanganan",
        "target",
        "approval-line",
      ]) {
        assert.match(source, new RegExp(`<FormContainer\\s+id="${sectionId}"`));
      }
    } else {
      assert.match(source, /<FormHeader/);
      assert.match(source, /<CollapsibleCard\.Root/);
      assert.match(source, /<CollapsibleCard\.Trigger/);
      assert.doesNotMatch(source, /<AccordionItem/);
    }
  });

  if (name === "registration") {
    test(`${name} uses grouped panels for risk sections`, () => {
      const identification = source.slice(
        source.indexOf('id="identifikasi"'),
        source.indexOf('id="analisis"'),
      );
      assert.match(identification, /title="Identifikasi Risiko"/);
      assert.match(identification, /description=\{sectionStatuses\[0\]\.description\}/);
      assert.equal(identification.match(/<FormGroup\b/g)?.length, 2);
      assert.doesNotMatch(source, /Accordion/);
    });
  }
}

test("registration behavior entry points remain intact", () => {
  assert.match(registrationSource, /handleSaveDraft/);
  assert.match(registrationSource, /openSubmitReviewConfirm/);
  assert.match(
    registrationSource,
    /<FormPage className="risk-form-filter-controls space-y-6">\s*<div className="flex flex-wrap items-center justify-end gap-2">/,
  );
  assert.match(
    registrationSource,
    /<aside className="min-w-0 self-start">\s*<div className="space-y-6 xl:sticky xl:top-20">/,
  );
  assert.doesNotMatch(registrationSource, /xl:-translate-y-6/);
  assert.match(registrationSource, /xl:grid-cols-\[minmax\(0,1fr\)_360px\] xl:items-start/);
  assert.match(registrationSource, /scrollToSection\(/);
  assert.doesNotMatch(registrationSource, /Accordion/);
  assert.doesNotMatch(
    registrationSource,
    /onClick=\{\(\) => scrollToSection\(section\.id\)\}/,
  );
});

test("registration detail omits the duplicate local page header", () => {
  assert.doesNotMatch(registrationSource, /<CollectionPageHeader/);
  assert.doesNotMatch(
    registrationSource,
    /title=\{riskId \? riskCode \|\| "Edit Risiko" : "Tambah Risiko"\}/,
  );
});

test("registration context panel previews linked risk events", () => {
  assert.match(registrationSource, /listRiskEvents\(token, id\)/);
  assert.doesNotMatch(registrationSource, />Catat Kejadian<\/Link>/);
  assert.match(
    registrationSource,
    /<section[\s\S]*aria-labelledby="risk-side-events"/,
  );
  assert.match(registrationSource, />\s*Kejadian\s*</);
  assert.match(
    registrationSource,
    /<ActionIconButton[\s\S]*icon=\{<Plus className="size-3\.5" \/>\}[\s\S]*aria-label="Catat kejadian"[\s\S]*onClick=\{handleCreateRiskEvent\}/,
  );
  assert.match(
    registrationSource,
    /const canCreateRiskEvent = Boolean\(riskId\) && riskStatus === "final";/,
  );
  assert.match(
    registrationSource,
    /\{canCreateRiskEvent \? \(\s*<ActionIconButton/,
  );
  assert.match(
    registrationSource,
    /const handleCreateRiskEvent = useCallback\(\(\) => \{\s*if \(canCreateRiskEvent\) setRiskEventDrawerOpen\(true\);/,
  );
  assert.match(
    registrationSource,
    /\{token && riskId && canCreateRiskEvent \? \(\s*<RiskEventFormDialog/,
  );
  assert.match(
    registrationSource,
    /Finalisasi risiko sebelum mencatat dan menautkan kejadian\./,
  );
  assert.match(
    registrationSource,
    /<RiskEventFormDialog[\s\S]*open=\{riskEventDrawerOpen\}[\s\S]*initialRiskId=\{riskId\}[\s\S]*onCreated=\{handleRiskEventCreated\}/,
  );
  assert.match(
    registrationSource,
    /visibleRiskEvents\.map\(\(event\) =>/,
  );
  assert.match(
    registrationSource,
    /href=\{`\/risk-events\/\$\{event\.id\}`\}/,
  );
  assert.match(
    registrationSource,
    /<Link href="\/risk-events">\s*Lihat semua kejadian/,
  );
});

test("registration uses the correct finalized-risk monitoring shortcut state", () => {
  assert.match(registrationSource, /const canStartMonitoring =/);
  assert.match(registrationSource, /const canContinueMonitoring =/);
  assert.match(registrationSource, /listRiskMonitorings\(/);
  assert.match(registrationSource, /ongoingMonitoring/);
  assert.match(registrationSource, /Lanjutkan Pemantauan/);
  assert.match(
    registrationSource,
    /<ActionButton\s+asChild\s+variant="outline"\s+className="px-4"[\s\S]*?Lanjutkan Pemantauan/,
  );
  assert.doesNotMatch(registrationSource, /ArrowRight/);
  assert.match(registrationSource, /Mulai Pemantauan/);
  assert.match(registrationSource, /startMonitoring\(/);
  assert.match(registrationSource, /getSelectableMonitoringCycles/);
  assert.match(
    registrationSource,
    /result\.redirectUrl \|\| `\/risk\/monitoring\/\$\{result\.monitoring\.id\}`/,
  );
});

test("assessment behavior entry points remain intact", () => {
  assert.match(assessmentSource, /handleSaveDraft/);
  assert.match(assessmentSource, /openSubmitReviewConfirm/);
  assert.match(assessmentSource, /router\.push\(backTarget\)/);
});

test("monitoring draft save keeps the form mounted and action layout stable", () => {
  assert.match(
    assessmentSource,
    /setMonitoringDraft\(updatedMonitoring\);[\s\S]*?setDraftRisk\(savedRisk\);[\s\S]*?setSubstanceDraft\(buildSubstanceDefaults\(savedRisk\)\);/,
  );
  assert.doesNotMatch(assessmentSource, /await loadRiskData\(\);/);
  assert.match(
    assessmentSource,
    /min-w-\[7rem\] items-center justify-end text-\[11px\]/,
  );
});

test("monitoring workspace does not render a separate finalized success banner", () => {
  assert.doesNotMatch(assessmentSource, /showFinalizeSuccess/);
  assert.doesNotMatch(assessmentSource, /Pemantauan \{monitoringCycle\} berhasil difinalisasi/);
  assert.doesNotMatch(assessmentSource, /Snapshot resmi sudah dibuat dan transaksi ini tidak dapat diedit lagi/);
});

test("monitoring status uses the shared collection state component", () => {
  assert.match(assessmentSource, /<Badge/);
  assert.match(
    assessmentSource,
    /<Badge[\s\S]*?assessmentStatusLabel\[draftRisk\.status\]/,
  );
});

test("monitoring finalization uses the neutral state warning and concise CTA", () => {
  assert.match(
    assessmentSource,
    /flex items-start gap-2 rounded-lg bg-state-surface px-3 py-3 text-sm text-state-foreground/,
  );
  assert.match(assessmentSource, /"Tinjau finalisasi"/);
  assert.match(assessmentSource, /"Finalisasi pemantauan"/);
  assert.match(assessmentSource, /!monitoringValidation\?\.canFinalize/);
  assert.match(assessmentSource, /Coba cek lagi/);
});

test("monitoring shows treatment reports before the score and opens the exact task in Penanganan", () => {
  const mitigationStatusIndex = assessmentSource.indexOf("<MitigationStatusTable");
  const scoreIndex = assessmentSource.indexOf('id="risk-score-picker"');
  assert.ok(mitigationStatusIndex >= 0 && mitigationStatusIndex < scoreIndex);
  assert.match(assessmentSource, /Laporan Penanganan/);
  assert.match(mitigationStatusSource, /aria-expanded=\{expanded\}/);
  assert.match(mitigationStatusSource, /penanganan\?taskId=\$\{encodeURIComponent\(task\.id\)\}/);
  assert.match(mitigationStatusSource, /target="_blank"/);
  assert.doesNotMatch(mitigationStatusSource, /MitigationProgressDialog|updateTaskReport/);
});

test("monitoring header and right panel use the shared detail geometry", () => {
  assert.match(
    assessmentSource,
    /<CollectionPageHeader\s+actionsPlacement="top"/,
  );
  assert.doesNotMatch(
    assessmentSource,
    /<CollectionPageHeader[\s\S]*actionsPlacement="title"/,
  );
  assert.match(assessmentSource, /<DetailSidePanel>[\s\S]*Simpulan Pemantauan/);
  assert.match(assessmentSource, /id="monitoring-side-summary"\s+className="text-sm font-semibold text-primary"/);
  assert.match(monitoringSummarySource, /<PropertyList compact/);
  assert.match(monitoringSummarySource, /<PropertyLabel showIcon=\{false\}>Skor risiko/);
});

test("monitoring opens with the two flat disclosure headers", () => {
  assert.doesNotMatch(assessmentSource, /<MonitoringEvidence\b|\/evidence`/);
  for (const title of ["Hasil Pemantauan", "Ubah profil risiko"]) {
    const heading = assessmentSource.indexOf(title, assessmentSource.indexOf('<CollapsibleCard.Root appearance="form"'));
    assert.notEqual(heading, -1);
    const trigger = assessmentSource.lastIndexOf("<CollapsibleCard.Trigger", heading);
    assert.notEqual(trigger, -1);
    assert.match(assessmentSource.slice(trigger, assessmentSource.indexOf(">", trigger)), /hover:bg-transparent/);
  }
});
