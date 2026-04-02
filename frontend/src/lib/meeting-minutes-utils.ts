export type MeetingRiskOption = {
  id: string;
  code: string;
  title: string;
  status?: string;
};

export function normalizeMeetingMinuteDate(value?: string) {
  const trimmed = value?.trim() || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function filterMeetingRiskOptions(risks: MeetingRiskOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return risks;
  }

  return risks.filter((risk) => {
    const haystack = `${risk.code} ${risk.title}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}
