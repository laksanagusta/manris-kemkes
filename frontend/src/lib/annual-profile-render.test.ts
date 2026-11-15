import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AnnualProfileContent,
  type AnnualProfileContentProps,
} from "../components/upr/annual-profile-content";
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
      profile: { ...profile, selected, versions: [selected] },
    }),
  );
  assert.match(html, /Isi versi ini sudah dikunci/);
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
  assert.match(html, /0 dari 1 risiko siap/);
  assert.match(html, /Penilaian belum final/);
  assert.match(html, /aria-label="Opsi untuk R-001"/);
});


test("parent read-only preview preserves draft status and omits child mutations", () => {
  const html = renderToStaticMarkup(createElement(AnnualProfileContent, { ...props, readOnly: true }));
  assert.match(html, /Draf/);
  assert.doesNotMatch(html, /Hapus draf|Buat Baru|Buat revisi|Lanjutkan revisi|Finalisasi profil/);
});
