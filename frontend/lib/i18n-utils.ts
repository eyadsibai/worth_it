const RTL_LANGUAGE_CODES = new Set(["ar", "fa", "he", "ur"]);

export function normalizeLocaleTag(locale: string | null | undefined): string {
  const normalized = (locale ?? "").trim().toLowerCase();
  return normalized || "en";
}

export function isRtlLocale(locale: string | null | undefined): boolean {
  const normalized = normalizeLocaleTag(locale);
  const languageCode = normalized.split("-")[0];
  return RTL_LANGUAGE_CODES.has(languageCode);
}

export function getTextDirection(locale: string | null | undefined): "ltr" | "rtl" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}
