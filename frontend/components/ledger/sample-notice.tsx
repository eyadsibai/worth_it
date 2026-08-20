"use client";

import { useTranslations } from "next-intl";

interface SampleNoticeProps {
  onClear: () => void;
}

/**
 * Shown on first visit, while the document is filled with the pre-loaded
 * example (spec §5.2). The page owns the `sampleActive` flag and mounts this
 * only while it's true; clearing is the page's job too (it empties
 * `currentJob`/`globalSettings`/`offers` back to true blanks via the store's
 * `clearSample` action).
 */
export function SampleNotice({ onClear }: SampleNoticeProps) {
  const t = useTranslations("landing");

  return (
    <div
      role="note"
      className="border-market bg-market-soft text-market border-y px-6 py-2 text-sm"
    >
      <span>{t("sampleNotice")}</span>
      <span aria-hidden="true"> · </span>
      <button type="button" onClick={onClear} className="underline underline-offset-2">
        {t("clearSample")}
      </button>
    </div>
  );
}
