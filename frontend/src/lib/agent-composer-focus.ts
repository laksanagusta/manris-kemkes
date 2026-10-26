// Carry only an explicit send's focus intent across the new-chat route remount.
// This is transient UI state; no message, token, or persisted storage is involved.
let pending: { conversationId: string; expiresAt: number } | undefined;
export function requestAgentComposerFocus(conversationId: string): void {
  pending = { conversationId, expiresAt: Date.now() + 5000 };
}
export function consumeAgentComposerFocus(conversationId: string): boolean {
  if (!pending || pending.conversationId !== conversationId) return false;
  const valid = pending.expiresAt >= Date.now();
  pending = undefined;
  return valid;
}
