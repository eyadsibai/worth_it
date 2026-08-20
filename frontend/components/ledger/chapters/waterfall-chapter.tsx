"use client";

import { useTranslations } from "next-intl";
import { Chapter } from "@/components/ledger/chapter";
import { Link } from "@/i18n/navigation";

export interface WaterfallChapterProps {
  index: string;
  hasTiers: boolean;
}

/**
 * Chapter 05: the exit waterfall. The full preference-tier breakdown lives in
 * the Cap Table tool (it needs the founder's stakeholders and instruments,
 * which this comparison landing never loads) — this chapter is always a
 * one-line pointer there, worded to whether the offer's rounds carry
 * preference tiers.
 */
export function WaterfallChapter({ index, hasTiers }: WaterfallChapterProps) {
  const t = useTranslations("chapters");

  return (
    <Chapter index={index} title={t("waterfall.title")}>
      <p className="mt-3 text-sm">
        <Link href="/cap-table" className="text-market">
          {hasTiers ? t("waterfall.hasTiers") : t("waterfall.noTiers")}
        </Link>
      </p>
    </Chapter>
  );
}
