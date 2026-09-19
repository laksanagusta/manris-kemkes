import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const appNavigation = readSource("../lib/app-navigation.ts");
const appSidebar = readSource("./app-sidebar.tsx");
const minutesPage = readSource("../app/(app)/minutes/page.tsx");
const minutesDetailPage = readSource("../app/(app)/minutes/[id]/page.tsx");
const meetingWorkspace = readSource("./meeting-intelligence-workspace.tsx");
const riskRegister = readSource("../app/(app)/risk/register/new/page.tsx");
const designSystemPage = readSource("../app/(app)/design-system/page.tsx");
const designSystemDocument = readSource("../../../DESIGN.md");

test("uses MoM for the meeting module's user-facing labels", () => {
  assert.match(appNavigation, /"\/intelligence\/transcript": "MoM"/);
  assert.match(appNavigation, /"\/intelligence\/minutes": "MoM"/);
  assert.match(appNavigation, /"\/minutes": "MoM"/);
  assert.match(appNavigation, /title: "MoM Intelligence"/);
  assert.match(appSidebar, /label: "MoM"/);

  assert.match(minutesPage, /title="MoM Dinonaktifkan"/);
  assert.match(minutesPage, /<CollectionPageHeader title="MoM" \/>/);
  assert.match(minutesDetailPage, /notulen MoM Intelligence/);
  assert.match(meetingWorkspace, /Analisis MoM/);
  assert.match(riskRegister, /rekomendasi MoM Intelligence/);
  assert.match(designSystemPage, /form risiko, MoM, dan Document Intelligence/);
  assert.match(designSystemDocument, /\*\*MoM briefing result:/);

  for (const source of [
    appNavigation,
    appSidebar,
    minutesPage,
    minutesDetailPage,
    meetingWorkspace,
    riskRegister,
    designSystemPage,
    designSystemDocument,
  ]) {
    assert.doesNotMatch(source, /Meeting Intelligence/);
    assert.doesNotMatch(source, /meeting intelligence/);
  }
});

test("keeps the MoM create action in the collection toolbar", () => {
  const toolbarStart = minutesPage.indexOf("<CollectionToolbar");
  const tableStart = minutesPage.indexOf("<CollectionTableCard", toolbarStart);
  const toolbar =
    toolbarStart >= 0 && tableStart > toolbarStart
      ? minutesPage.slice(toolbarStart, tableStart)
      : "";

  assert.ok(toolbar.length > 0);
  assert.match(toolbar, /actions=/);
  assert.match(toolbar, /router\.push\("\/minutes\/new"\)/);
  assert.match(toolbar, /Buat Notulen/);
});

test("keeps transcript action controls icon-free", () => {
  const actionRowStart = meetingWorkspace.indexOf(
    '<div className="flex flex-wrap justify-end gap-2">',
  );
  const cardContentEnd = meetingWorkspace.indexOf(
    "</CardContent>",
    actionRowStart,
  );
  const actionRow =
    actionRowStart >= 0 && cardContentEnd > actionRowStart
      ? meetingWorkspace.slice(actionRowStart, cardContentEnd)
      : "";

  assert.ok(actionRow.length > 0);
  assert.doesNotMatch(actionRow, /Sparkles|RefreshCw/);
  assert.match(actionRow, /selectedMode\.runningLabel/);
  assert.match(actionRow, /selectedMode\.actionLabel/);
});
