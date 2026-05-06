const truthyValues = new Set(["1", "true", "yes", "on"]);

export function isAIFeaturesDisabled(
  envValue: string | null | undefined = process.env.NEXT_PUBLIC_DISABLE_AI_FEATURES,
): boolean {
  if (!envValue) return false;
  return truthyValues.has(envValue.trim().toLowerCase());
}
