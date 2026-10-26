import assert from "node:assert/strict";
import test from "node:test";
import { requestAgentComposerFocus, consumeAgentComposerFocus } from "./agent-composer-focus.ts";
test("focus intent is single-use and limited to the newly created conversation", () => {
  requestAgentComposerFocus("new-chat");
  assert.equal(consumeAgentComposerFocus("other-chat"), false);
  assert.equal(consumeAgentComposerFocus("new-chat"), true);
  assert.equal(consumeAgentComposerFocus("new-chat"), false);
});
