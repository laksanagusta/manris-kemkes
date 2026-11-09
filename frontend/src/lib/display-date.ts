/** Presentation only: never use these formatters for storage, API dates or keys. */
export function createDisplayDateFormatter(
  locales: Intl.LocalesArgument = "id-ID",
  options: Intl.DateTimeFormatOptions = {},
) {
  const { dateStyle, timeStyle, ...parts } = options;
  const normalized: Intl.DateTimeFormatOptions = { ...parts };

  if (dateStyle) {
    normalized.year = "numeric";
    normalized.month = dateStyle === "short" ? "2-digit" : dateStyle === "medium" ? "short" : "long";
    normalized.day = "2-digit";
    if (dateStyle === "full") normalized.weekday = "long";
  }
  if (timeStyle) {
    normalized.hour = "2-digit";
    normalized.minute = "2-digit";
    if (timeStyle !== "short") normalized.second = "2-digit";
    if (timeStyle === "long" || timeStyle === "full") {
      normalized.timeZoneName = timeStyle === "full" ? "long" : "short";
    }
  }
  for (const part of ["day", "month", "hour", "minute", "second"] as const) {
    if (normalized[part] === "numeric") normalized[part] = "2-digit";
  }
  if (normalized.hour) normalized.hour12 ??= false;
  return new Intl.DateTimeFormat(locales, normalized);
}

export function formatDisplayDate(value: Date, options: Intl.DateTimeFormatOptions) {
  return createDisplayDateFormatter("id-ID", options).format(value);
}
