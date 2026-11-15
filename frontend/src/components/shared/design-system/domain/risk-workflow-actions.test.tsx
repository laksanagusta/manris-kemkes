import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RiskWorkflowActions } from "./risk-workflow-actions";
import type { RiskOpenDrafts } from "@/types/risk";

const base = { token:"test",riskId:"source",onStartMonitoring:()=>{},onRevisionStarted:()=>{},onRetry:()=>{} };
function render(drafts:RiskOpenDrafts|undefined,status:"ready"|"loading"|"error"="ready") {
 return renderToStaticMarkup(<RiskWorkflowActions {...base} drafts={drafts} status={status} />);
}

test("a revision draft opens directly and prevents starting monitoring",()=>{
 const html=render({revisionRiskId:"revision-1"});
 assert.match(html,/href="\/risk\/register\/new\?id=revision-1"[^>]*>Lanjutkan revisi/);
 assert.match(html,/<button[^>]*disabled=""[^>]*>Pantau<\/button>/);
 assert.doesNotMatch(html,/aria-haspopup="dialog"/);
});

test("a monitoring draft opens the exact transaction and prevents starting revision",()=>{
 const html=render({monitoringId:"monitoring-1"});
 assert.match(html,/href="\/risk\/monitoring\/monitoring-1"[^>]*>Lanjutkan pemantauan/);
 assert.match(html,/<button[^>]*disabled=""[^>]*>Revisi<\/button>/);
});

test("without drafts both new actions are available",()=>{
 const html=render({});
 assert.doesNotMatch(html,/disabled=""/);
 assert.match(html,/>Pantau<\/button>/);
 assert.match(html,/>Revisi<\/button>/);
});

test("loading, lookup failure and missing backend state never enable a new workflow",()=>{
 for(const state of [render(undefined,"loading"),render(undefined,"error"),render(undefined)]) {
  assert.equal((state.match(/disabled=""/g)||[]).length,2);
 }
 assert.match(render(undefined,"error"),/Periksa draf lagi/);
});
