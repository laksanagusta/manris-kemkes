export function buildRiskDetailPDFFilename(input: { code?: string; id: string }) {
  const raw = input.code?.trim() || input.id.trim() || "risk";
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return `lampiran-risiko-${safe || "risk"}.pdf`;
}
