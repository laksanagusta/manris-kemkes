import assert from "node:assert/strict";
import test from "node:test";

const viewModelLib = await import(new URL("./working-paper-detail-view-model", import.meta.url).href);

const { buildWorkingPaperDetailViewModel } = viewModelLib as typeof import("./working-paper-detail-view-model");

type WorkingPaper = import("@/types/working-paper").WorkingPaper;

function makeWorkingPaper(overrides: Partial<WorkingPaper> = {}): WorkingPaper {
  return {
    id: "wp-1",
    sequence_no: 1,
    code: "WP-001",
    title: "Kertas Kerja Semester I",
    org_id: "org-1",
    status: "signing",
    assessment_cycle: "2026 Semester I",
    risks: [
      {
        id: "link-1",
        working_paper_id: "wp-1",
        risk_id: "risk-1",
        sort_order: 1,
        source_mode: "latest_approved",
        created_at: "2026-04-01T08:00:00.000Z",
        risk: {
          id: "risk-1",
          code: "R-001",
          title: "Keterlambatan distribusi vaksin",
          category: "operasional",
          status: "approved",
          probability: 4,
          impact: 4,
          bobot: 1,
          nilai: 16,
          tingkat_risiko: "tinggi",
          prioritas_risiko: 1,
        },
      },
    ],
    document_hash: "abc123def456ghi789",
    current_signatory_sequence: 0,
    created_by: "creator-1",
    created_at: "2026-04-01T08:00:00.000Z",
    updated_at: "2026-04-03T09:00:00.000Z",
    tte_skipped: false,
    signatories: [
      {
        id: "sig-1",
        working_paper_id: "wp-1",
        user_id: "user-1",
        sequence_no: 1,
        signer_name: "Rina Pratiwi",
        signer_jabatan: "Kepala Subbagian",
        signer_pangkat: "Kepala Subbagian",
        status: "pending",
        created_at: "2026-04-01T08:00:00.000Z",
      },
      {
        id: "sig-2",
        working_paper_id: "wp-1",
        user_id: "user-2",
        sequence_no: 2,
        signer_name: "Budi Santoso",
        signer_jabatan: "Direktur",
        signer_pangkat: "Direktur",
        status: "pending",
        created_at: "2026-04-01T08:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

test("buildWorkingPaperDetailViewModel highlights the current signer action", () => {
  const result = buildWorkingPaperDetailViewModel(makeWorkingPaper(), "user-1");

  assert.equal(result.canStartSigning, false);
  assert.equal(result.canSign, true);
  assert.equal(result.canSkipTTE, false);
  assert.equal(result.canCancel, true);
  assert.equal(result.canDelete, false);
  assert.equal(result.currentAction?.title, "Tindakan Anda diperlukan");
  assert.equal(result.currentAction?.buttonLabel, "Tanda tangani sekarang");
  assert.equal(result.timeline[0]?.label, "Giliran Anda");
  assert.match(result.timeline[0]?.description ?? "", /periksa isi dokumen/i);
});

test("buildWorkingPaperDetailViewModel explains when another signer is active", () => {
  const result = buildWorkingPaperDetailViewModel(makeWorkingPaper(), "user-9");

  assert.equal(result.canSign, false);
  assert.equal(result.canSkipTTE, false);
  assert.equal(result.currentAction?.title, "Menunggu penandatangan aktif");
  assert.match(result.currentAction?.description ?? "", /Rina Pratiwi/);
  assert.equal(result.timeline[0]?.label, "Sedang ditinjau");
  assert.equal(result.timeline[1]?.label, "Menunggu giliran");
});

test("buildWorkingPaperDetailViewModel marks completed signatures and completed documents clearly", () => {
  const result = buildWorkingPaperDetailViewModel(
    makeWorkingPaper({
      status: "completed",
      current_signatory_sequence: 2,
      completed_at: "2026-04-04T10:00:00.000Z",
      tte_skipped: false,
      signatories: [
        {
          id: "sig-1",
          working_paper_id: "wp-1",
          user_id: "user-1",
          sequence_no: 1,
          signer_name: "Rina Pratiwi",
          signer_jabatan: "Kepala Subbagian",
          signer_pangkat: "Kepala Subbagian",
          status: "signed",
          signed_at: "2026-04-02T08:00:00.000Z",
          created_at: "2026-04-01T08:00:00.000Z",
        },
        {
          id: "sig-2",
          working_paper_id: "wp-1",
          user_id: "user-2",
          sequence_no: 2,
          signer_name: "Budi Santoso",
          signer_jabatan: "Direktur",
          signer_pangkat: "Direktur",
          status: "signed",
          signed_at: "2026-04-03T09:30:00.000Z",
          created_at: "2026-04-01T08:00:00.000Z",
        },
      ],
    }),
    "user-2",
  );

  assert.equal(result.canStartSigning, false);
  assert.equal(result.canSign, false);
  assert.equal(result.canCancel, false);
  assert.equal(result.canDelete, false);
  assert.equal(result.currentAction?.title, "Seluruh tanda tangan selesai");
  assert.equal(result.timeline[0]?.label, "Sudah ditandatangani");
  assert.equal(result.timeline[1]?.label, "Sudah ditandatangani");
});

test("buildWorkingPaperDetailViewModel allows creator to skip TTE when all risks are approved", () => {
  const result = buildWorkingPaperDetailViewModel(
    makeWorkingPaper({
      status: "draft",
      current_signatory_sequence: 0,
      created_by: "creator-1",
      risks: [
        {
          id: "link-1",
          working_paper_id: "wp-1",
          risk_id: "risk-1",
          sort_order: 1,
          source_mode: "latest_approved",
          created_at: "2026-04-01T08:00:00.000Z",
          risk: {
            id: "risk-1",
            code: "R-001",
            title: "Keterlambatan distribusi vaksin",
            category: "operasional",
            status: "approved",
            probability: 4,
            impact: 4,
            bobot: 1,
            nilai: 16,
            tingkat_risiko: "tinggi",
            prioritas_risiko: 1,
          },
        },
      ],
    }),
    "creator-1",
  );

  assert.equal(result.canStartSigning, true);
  assert.equal(result.canSkipTTE, true);
  assert.equal(result.currentAction?.title, "Siap ditandatangani");
  assert.equal(result.currentAction?.buttonLabel, "Mulai proses TTE");
  assert.match(
    result.currentAction?.description ?? "",
    /mulai proses tanda tangan elektronik/i,
  );
});

test("buildWorkingPaperDetailViewModel blocks signing when monitoring is still draft", () => {
  const result = buildWorkingPaperDetailViewModel(
    makeWorkingPaper({
      risks: [
        {
          id: "link-1",
          working_paper_id: "wp-1",
          risk_id: "risk-1",
          sort_order: 1,
          source_mode: "latest_approved",
          created_at: "2026-04-01T08:00:00.000Z",
          risk: {
            id: "risk-1",
            code: "R-001",
            title: "Keterlambatan distribusi vaksin",
            category: "operasional",
            status: "approved",
            probability: 4,
            impact: 4,
            bobot: 1,
            nilai: 16,
            tingkat_risiko: "tinggi",
            prioritas_risiko: 1,
            monitoring: {
              id: "mon-1",
              status: "draft",
              assessmentCycle: "2026-H1",
              sourceProbability: 4,
              sourceImpact: 4,
              sourceWeight: 1,
              sourceNilai: 16,
              sourceLevel: "tinggi",
              observedProbability: 4,
              observedImpact: 4,
              observedWeight: 1,
              observedNilai: 16,
              observedLevel: "tinggi",
              trend: "stable",
              mitigationCompletionPercent: 0,
              mitigationProgressSummary: "",
              effectivenessConclusion: "",
              conditionSummary: "",
              eventSummary: "",
              mitigationObstacles: "",
              mitigationFollowUp: "",
              followUpNote: "",
              startedAt: "2026-06-01T08:00:00.000Z",
              updatedAt: "2026-06-10T08:00:00.000Z",
            },
          },
        },
      ],
    }),
    "user-1",
  );

  assert.equal(result.canSign, false);
  assert.equal(result.canSkipTTE, false);
  assert.match(result.currentAction?.title ?? "", /monitoring/i);
  assert.equal(result.monitoringBlockers.length, 1);
});

test("buildWorkingPaperDetailViewModel shows skipped state when tte_skipped is true", () => {
  const result = buildWorkingPaperDetailViewModel(
    makeWorkingPaper({
      status: "completed",
      tte_skipped: true,
      completed_at: "2026-04-04T10:00:00.000Z",
    }),
    "user-1",
  );

  assert.equal(result.canSign, false);
  assert.equal(result.canCancel, false);
  assert.equal(result.canSkipTTE, false);
  assert.equal(result.tteSkipped, true);
  assert.equal(result.currentAction?.title, "TTE dilewati");
  assert.equal(result.timeline[0]?.state, "skipped");
  assert.equal(result.timeline[0]?.label, "TTE dilewati");
  assert.equal(result.timeline[1]?.state, "skipped");
});
