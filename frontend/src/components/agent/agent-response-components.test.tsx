import assert from "node:assert/strict";
import { test } from "node:test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentWidget } from "./agent-widget";
import { AgentResponseActions } from "./agent-response-components";
import { AgentActivity } from "./agent-activity";
import { AgentDownloadMenu } from "./agent-message-downloads";
import { agentResponseExamples } from "./agent-response-examples";
import type { AgentWidgetAction } from "@/types/agent";

test("risk detail starts collapsed and retains stored causes and mitigations", () => {
  const html = renderToStaticMarkup(<AgentWidget widget={agentResponseExamples[0]} onAction={() => {}} />);
  assert.match(html, /<details class="agent-risk-details">/);
  assert.match(html, /Lihat rincian/);
  assert.match(html, /Jadwal pengadaan/);
  assert.match(html, /PIC contoh/);
  assert.match(html, /Sangat tinggi/);
  assert.doesNotMatch(html, /<footer|<time|Unduh hasil ini/);
});

test("priority preview groups tasks once per risk and discloses population", () => {
  const html = renderToStaticMarkup(<AgentWidget widget={agentResponseExamples[1]} onAction={() => {}} />);
  assert.match(html, /2 dari 7 risiko/);
  assert.equal((html.match(/class="agent-risk-heading"/g) ?? []).length, 2);
  assert.equal((html.match(/class="agent-priority-tasks"/g) ?? []).length, 1);
  assert.match(html, /14 hari/);
  assert.match(html, /Lihat lebih banyak/);
});

test("comparison preserves explicit periods, zero and missing values", () => {
  const known = renderToStaticMarkup(<AgentWidget widget={agentResponseExamples[2]} />);
  assert.match(known, /2026-Q3/);
  assert.match(known, /2026-Q2/);
  assert.match(known, />0<\/td>/);
  assert.match(known, /\+3/);
  const unknown = renderToStaticMarkup(<AgentWidget widget={agentResponseExamples[3]} />);
  assert.match(unknown, /—/);
  assert.match(unknown, /kedua nilai tersedia/);
  assert.match(unknown, /Sebagian profil/);
});

test("contextual actions forward the exact prompt and skills immediately", () => {
  const action: AgentWidgetAction = { label: "Lihat mitigasi", prompt: "Baca ID 241 unit A periode 2026-Q4", skills: ["mitigations"] };
  const received: AgentWidgetAction[] = [];
  const output = AgentResponseActions({ actions: [action], context: "R-241", onAction: (value) => received.push(value) }) as ReactElement<{ children: ReactElement<{ onClick: () => void }>[] }>;
  output.props.children[0].props.onClick();
  assert.deepEqual(received, [action]);
  const disabled = renderToStaticMarkup(<AgentResponseActions actions={[action]} disabled onAction={() => {}} />);
  assert.match(disabled, /disabled=""/);
  const unavailable = renderToStaticMarkup(<AgentResponseActions actions={[action]} />);
  assert.match(unavailable, /disabled=""/);
});

test("new payloads keep safe links and old result kinds keep their renderer", () => {
  const widget = structuredClone(agentResponseExamples[0]);
  widget.risk!.href = "javascript:alert(1)";
  const html = renderToStaticMarkup(<AgentWidget widget={widget} />);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(renderToStaticMarkup(<AgentWidget widget={{ id: "old", type: "table", title: "Ancien résultat", snapshotAt: "2026-10-24", columns: [{ key: "code", label: "Kode" }], rows: [{ code: "R-001" }] }} />), /R-001/);
});

test("completed activity omits empty disclosures and keeps recorded steps available", () => {
  const run = { id: "run", conversationId: "conversation", status: "completed" as const, events: [] };
  assert.equal(renderToStaticMarkup(<AgentActivity run={run} />), "");
  const html = renderToStaticMarkup(<AgentActivity run={{ ...run, events: [{ id: "step", label: "Membaca profil risiko", status: "completed", createdAt: "2026-10-24T08:00:00+07:00" }] }} />);
  assert.match(html, /1 langkah/);
  assert.match(html, /Membaca profil risiko/);
  assert.match(html, /Selesai\. 1 langkah/);
});

test("activity simplification retains live status and visible failure recovery", () => {
  const run = { id: "run", conversationId: "conversation", events: [] };
  const active = renderToStaticMarkup(<AgentActivity run={{ ...run, status: "running" }} />);
  assert.match(active, /role="status"/);
  assert.match(active, /Sedang mengerjakan/);
  assert.doesNotMatch(active, /<details/);
  const failed = renderToStaticMarkup(<AgentActivity run={{ ...run, status: "failed", error: "Data belum tersedia" }} onRetry={() => {}} />);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Data belum tersedia/);
  assert.match(failed, /Siapkan pesan ulang/);
  assert.doesNotMatch(failed, /<details/);
});

test("download menu stays named and exposes loading and errors without opening it", () => {
  const ready = renderToStaticMarkup(<AgentDownloadMenu onDownload={() => {}} />);
  assert.match(ready, /aria-label="Unduh jawaban"/);
  assert.equal((ready.match(/<button/g) ?? []).length, 1);
  const pending = renderToStaticMarkup(<AgentDownloadMenu onDownload={() => {}} exporting="xlsx" />);
  assert.match(pending, /disabled=""/);
  assert.match(pending, /Menyiapkan Excel/);
  const failed = renderToStaticMarkup(<AgentDownloadMenu onDownload={() => {}} error="Coba lagi" />);
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Coba lagi/);
});
