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
        assert.match(source, new RegExp(`<Card\\s+id="${sectionId}"`));
      }
    } else {
      assert.match(source, /<FormHeader/);
      assert.match(source, /<CollapsibleCard\.Root/);
      assert.match(source, /<CollapsibleCard\.Trigger/);
      assert.doesNotMatch(source, /<AccordionItem/);
    }
  });

  if (name === "registration") {
    test(`${name} uses the risk register section geometry`, () => {
      assert.match(
        source,
        /const RISK_FORM_CARD_CLASS[\s\S]{0,140}gap-0 p-0/,
      );
      assert.doesNotMatch(
        source,
        /RISK_FORM_SURFACE_CLASS/,
      );
      assert.doesNotMatch(source, /Accordion/);
      assert.match(source, /px-5 py-4/);
      assert.match(source, /space-y-5 px-5 pb-6 pt-2/);
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
    /setMonitoringDraft\(updatedMonitoring\);[\s\S]*?setDraftRisk\(buildRiskFromMonitoring\(updatedMonitoring, sourceRisk\)\);/,
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
  assert.match(assessmentSource, /CollectionStatusBadge/);
  assert.match(
    assessmentSource,
    /<CollectionStatusBadge[\s\S]*?assessmentStatusLabel\[draftRisk\.status\]/,
  );
});

test("monitoring finalization uses the neutral state warning and concise CTA", () => {
  assert.match(
    assessmentSource,
    /flex items-start gap-2 rounded-lg bg-state-surface px-3 py-3 text-sm text-state-foreground/,
  );
  assert.match(assessmentSource, /isMonitoringRoute \? "Finalisasi" : "Lanjutkan"/);
});

test("monitoring mitigation status lives in the compact right panel", () => {
  const rightPanelIndex = assessmentSource.indexOf(
    "{/* Right Column / Side Panel */}",
  );
  const mitigationStatusIndex = assessmentSource.indexOf(
    "<MitigationStatusTable",
  );

  assert.ok(rightPanelIndex >= 0);
  assert.ok(mitigationStatusIndex > rightPanelIndex);
  assert.match(assessmentSource, /Pelaksanaan Mitigasi/);
  assert.doesNotMatch(mitigationStatusSource, /<Table/);
  assert.match(
    monitoringSummarySource,
    /<dt className="text-\[13px\] text-muted-foreground">Skor risiko<\/dt>/,
  );
  assert.doesNotMatch(monitoringSummarySource, /Math\.round\(delta\)/);
  assert.match(
    mitigationStatusSource,
    /<dt className="text-\[13px\] text-muted-foreground">Total mitigasi<\/dt>/,
  );
  assert.match(
    mitigationStatusSource,
    /<p className="text-\[13px\] text-muted-foreground">Status pelaporan<\/p>/,
  );
  assert.match(mitigationStatusSource, /Total mitigasi/);
  assert.match(mitigationStatusSource, /Sudah dilaporkan/);
  assert.match(mitigationStatusSource, /Belum dilaporkan/);
  assert.match(mitigationStatusSource, /aria-expanded=\{isExpanded\}/);
  assert.match(mitigationStatusSource, /motion-safe:animate-in/);
  assert.match(mitigationStatusSource, /motion-safe:slide-in-from-top-2/);
  assert.doesNotMatch(mitigationStatusSource, /motion-safe:slide-in-from-right-2/);
  assert.match(mitigationStatusSource, /motion-safe:duration-200/);
  assert.match(mitigationStatusSource, /motion-safe:ease-\(--ease-out\)/);
  assert.match(mitigationStatusSource, /motion-reduce:animate-none/);
  assert.match(mitigationStatusSource, /MitigationProgressDialog/);
  assert.match(mitigationStatusSource, /updateTaskReport/);
  assert.doesNotMatch(mitigationStatusSource, /from "next\/link"/);
  assert.doesNotMatch(mitigationStatusSource, /compliance\/monitoring/);
});

test("monitoring header and right panel use the shared detail geometry", () => {
  assert.match(
    assessmentSource,
    /<div className="w-full min-w-0">\s*<CollectionPageHeader/,
  );
  assert.doesNotMatch(
    assessmentSource,
    /<CollectionPageHeader[\s\S]*actionsPlacement="title"/,
  );
  assert.match(
    assessmentSource,
    /<CardContent className="px-5 py-5 text-sm">/,
  );
  assert.match(
    assessmentSource,
    /<CollapsibleCard\.Body className="space-y-5 border-t-0 px-5 py-5 text-sm">/,
  );
  assert.match(
    assessmentSource,
    /className="text-xs font-semibold uppercase tracking-\[0\.6px\] text-muted-foreground\/70"/,
  );
  assert.match(
    monitoringSummarySource,
    /className="text-xs font-semibold uppercase tracking-\[0\.6px\] text-muted-foreground\/70"/,
  );
});
