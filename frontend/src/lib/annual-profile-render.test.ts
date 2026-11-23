import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AnnualProfileContent,
  type AnnualProfileContentProps,
} from "../components/upr/annual-profile-content";
import { AnnualProfilePeriods } from "../components/upr/annual-profile-periods";
import { AnnualExclusionReview } from "../components/upr/annual-exclusion-review";
import { ProfileDocumentPeriodCell, RiskMonitoringPeriodCell } from "../components/upr/profile-period-cells";
import type { ProfilePeriodProgress } from "./api/profile-periods";
import type { AnnualProfile } from "./api/upr-workflow";

const version = { id: "v1", version: 1, finalizedAt: null, finalizedBy: null };
const profile: AnnualProfile = {
  selected: version,
  versions: [version],
  members: [],
  objectives: [],
};
const props: AnnualProfileContentProps = {
  year: 2026,
  profile,
  candidates: [],
  organization: "Unit A",
  busy: false,
  returnTo: "/risk/annual-profiles?tahun=2026",
  onRetryCandidates: () => undefined,
  onSelectVersion: () => undefined,
  onDraft: async () => undefined,
  onAdd: async () => ({ added: [] }),
  onSave: async () => undefined,
  onRemove: async () => undefined,
  onCancelExclusion: async () => undefined,
  onFinalize: async () => undefined,
  onDeleteDraft: async () => undefined,
};

test("empty draft omits the finalize helper and keeps the table empty state", () => {
  const html = renderToStaticMarkup(createElement(AnnualProfileContent, props));
  assert.doesNotMatch(html, /annual-finalize-help/);
  assert.doesNotMatch(html, /1 dari 1 risiko siap untuk finalisasi/);
  assert.match(html, /Belum ada risiko dalam profil/);
  assert.doesNotMatch(html, /Unit A/);
});

test("final empty profile keeps revision action out of the detail body", () => {
  const selected = { ...version, finalizedAt: "2026-11-12T03:00:00Z" };
  const html = renderToStaticMarkup(
    createElement(AnnualProfileContent, {
      ...props,
      profile: { ...profile, code: "PRT-2026-0032", selected, versions: [selected] },
    }),
  );
  assert.match(html, /aria-label="Profil terkunci"/);
  assert.match(html, /Kode profil<\/dt><dd[^>]*>PRT-2026-0032<\/dd>/);
  assert.doesNotMatch(html, /Buat revisi/);
  assert.doesNotMatch(html, /aria-label="Tindakan profil"/);
  assert.doesNotMatch(html, /Tinjau &amp; finalisasi/);
});

test("revision shows the previous final version and the incomplete risk's work", () => {
  const html = renderToStaticMarkup(
    createElement(AnnualProfileContent, {
      ...props,
      profile: {
        ...profile,
        selected: { ...version, id: "v2", version: 2 },
        versions: [{ ...version, finalizedAt: "2026-01-01T03:00:00Z" }],
        members: [
          {
            groupId: "g1",
            riskId: "r1",
            sourceRiskId: null,
            objectiveId: null,
            effectiveFrom: "2026-01-01",
            changeReason: "",
            baseline: null,
            code: "R-001",
            title: "Risiko A",
            riskStatus: "draft",
            score: null,
            canRemove: true,
          },
        ],
      },
    }),
  );
  assert.match(html, /Versi 1 adalah profil final terakhir/);
  assert.doesNotMatch(html, /0 dari 1 risiko siap/);
  assert.match(html, />Draf<\/span>/);
  assert.match(html, /aria-label="Opsi untuk R-001"/);
});

test("exclusions do not render in a separate profile detail panel", () => {
  const exclusions = [{
    groupId: "g1",
    code: "R-001",
    title: "Risiko A",
    effectiveFrom: null,
    changeReason: "Kegiatan tidak lagi menjadi lingkup unit.",
  }];
  const draftProfile = { ...profile, exclusions };
  const draft = renderToStaticMarkup(createElement(AnnualProfileContent, { ...props, profile: draftProfile }));
  assert.doesNotMatch(draft, /Usulan pengeluaran risiko|Kegiatan tidak lagi menjadi lingkup unit|Batalkan pengeluaran/);

  const selected = { ...version, finalizedAt: "2026-08-25T03:00:00Z" };
  const final = renderToStaticMarkup(createElement(AnnualProfileContent, {
    ...props,
    profile: { ...draftProfile, selected, versions: [selected],
      exclusions: exclusions.map((item) => ({ ...item, effectiveFrom: "2026-08-25" })) },
  }));
  assert.doesNotMatch(final, /Risiko dikeluarkan|Keluar dari profil mulai 25 Agustus 2026|Kegiatan tidak lagi menjadi lingkup unit/);
  const readOnly = renderToStaticMarkup(createElement(AnnualProfileContent, {
    ...props,
    profile: draftProfile,
    readOnly: true,
  }));
  assert.doesNotMatch(readOnly, /Usulan pengeluaran risiko|Batalkan pengeluaran/);

  const review = renderToStaticMarkup(createElement(AnnualExclusionReview, {
    exclusions,
    year: 2026,
    busy: false,
    onCancel: () => undefined,
  }));
  assert.match(review, /1 risiko akan dikeluarkan/);
  assert.match(review, /aria-label="Batalkan pengeluaran R-001 Risiko A"/);
});

test("parent read-only preview preserves draft status and omits child mutations", () => {
  const html = renderToStaticMarkup(createElement(AnnualProfileContent, { ...props, organization: "Unit bawahan", readOnly: true }));
  assert.match(html, /Draf/);
  assert.match(html, /Unit bawahan/);
  assert.match(html, /Hanya baca/);
  assert.doesNotMatch(html, /Hapus draf|Buat Baru|Buat revisi|Lanjutkan revisi|Finalisasi profil/);
});

test("descendant period cells expose existing records for viewing and hide start actions", () => {
  const period: ProfilePeriodProgress = {
    id: "period-1",
    label: "Q1",
    ordinal: 1,
    opensOn: "2020-01-01",
    closesOn: "2099-12-31",
    workingPaper: { id: "paper-1", status: "ongoing", completed: 0, total: 1 },
    evaluation: { status: "pending", completed: 0, total: 1 },
    monitorings: [{ groupId: "g1", id: "monitoring-1", status: "ongoing", completed: 0, total: 1 }],
  };
  const docs = renderToStaticMarkup(createElement(ProfileDocumentPeriodCell, { period, profileId: "v1", readOnly: true }));
  assert.match(docs, /href="\/risk\/working-papers\/paper-1"/);
  assert.match(docs, /Lihat kertas kerja/);
  assert.doesNotMatch(docs, /Mulai evaluasi|Lanjutkan kertas kerja/);
  const observed = renderToStaticMarkup(createElement(RiskMonitoringPeriodCell, { period, groupId: "g1", readOnly: true, profileFinalized: true }));
  assert.match(observed, /href="\/risk\/monitoring\/monitoring-1"/);
  assert.match(observed, /Lihat pemantauan/);
  const pending = renderToStaticMarkup(createElement(RiskMonitoringPeriodCell, { period, groupId: "g2", readOnly: true, profileFinalized: true }));
  assert.doesNotMatch(pending, /Mulai pemantauan|Lanjutkan pemantauan/);
});

test("revision shows the frozen period and keeps a later risk outside it", () => {
  const period: ProfilePeriodProgress = {
    id: "p1",
    ordinal: 1,
    label: "Semester I",
    opensOn: "2026-07-01",
    closesOn: "2026-07-31",
    calendarEndsOn: "2026-06-30",
    scopeProfileId: "v1",
    scopeLocked: true,
    workingPaper: { id: "paper-v1", status: "done", completed: 1, total: 1 },
    evaluation: { status: "pending", completed: 0, total: 1 },
    monitorings: [{ groupId: "risk-added-in-v2", applicable: false, status: "pending", completed: 0, total: 2 }],
  };
  const html = renderToStaticMarkup(createElement(AnnualProfilePeriods, {
    workspace: {
      year: 2026, version: 2, periods: [period],
      rule: { id: "rule", name: "Semester", frequency: "semester", year: 2026, active: true, periods: [period] },
    },
    profileId: "v2",
    finalized: true,
    readOnly: true,
    retry: () => undefined,
  }));
  assert.match(html, /Cakupan terkunci/);
  assert.match(html, /href="\/risk\/working-papers\/paper-v1"/);
  const cell = renderToStaticMarkup(createElement(RiskMonitoringPeriodCell, {
    period, groupId: "risk-added-in-v2", onStart: () => undefined, profileFinalized: true,
  }));
  assert.match(cell, /Belum berlaku pada periode ini/);
  assert.doesNotMatch(cell, /Mulai pemantauan/);
  const planned = renderToStaticMarkup(createElement(RiskMonitoringPeriodCell, {
    period: { ...period, scopeLocked: false },
    groupId: "risk-added-in-v2",
    profileFinalized: false,
  }));
  assert.equal(planned, "");
});

test("administrative closure is offered only where approval is available", () => {
  const period: ProfilePeriodProgress = {
    id: "period-1",
    ordinal: 1,
    label: "Semester I",
    opensOn: "2026-07-01",
    closesOn: "2026-07-31",
    blocksRevision: true,
    canCloseAdministratively: true,
    workingPaper: { status: "pending", completed: 0, total: 1 },
    evaluation: { status: "pending", completed: 0, total: 1 },
    monitorings: [],
  };
  const render = (period: ProfilePeriodProgress, admin = false) =>
    renderToStaticMarkup(createElement(AnnualProfileContent, {
      ...props,
      readOnly: admin,
      onApprovePeriodClosure: admin ? async () => undefined : undefined,
      periodWorkspace: { year: 2026, version: 1, rule: null, periods: [period] },
    }));
  assert.match(render(period), /Menahan finalisasi revisi/);
  assert.match(render(period), /Hubungi Super Admin/);
  assert.doesNotMatch(render(period), />Tutup secara administratif</);
  assert.match(render(period, true), />Tutup secara administratif</);
  assert.doesNotMatch(render({ ...period, canCloseAdministratively: false }, true), />Tutup secara administratif</);

  const completed = render({
    ...period,
    blocksRevision: false,
    canCloseAdministratively: false,
    administrativeClosureReason: "Kelengkapan dicatat dalam berita acara.",
  }, true);
  assert.match(completed, /Ditutup secara administratif/);
  assert.match(completed, /Kelengkapan dicatat dalam berita acara/);
  assert.doesNotMatch(completed, />Tutup secara administratif</);
});
