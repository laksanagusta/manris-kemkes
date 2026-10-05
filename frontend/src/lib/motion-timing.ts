/** CSS optimizers may rewrite 200ms as .2s; JS orchestration accepts both. */
export function motionDurationMs(value: string, fallback: number): number {
  const text = value.trim();
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)$/.test(text)) return fallback;
  const amount = Number.parseFloat(text);
  return text.endsWith("ms") ? amount : amount * 1000;
}

export function readMotionDuration(element: Element, token: string, fallback: number): number {
  return motionDurationMs(getComputedStyle(element).getPropertyValue(token), fallback);
}
