"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAppStore, useOffers, MAX_OFFERS } from "@/lib/store";

/** Dashed slot at the end of the duel that adds another offer column, up to `MAX_OFFERS`. */
export function AddOfferSlot() {
  const t = useTranslations("duel");
  const offers = useOffers();
  const addOffer = useAppStore((state) => state.addOffer);
  const atCap = offers.length >= MAX_OFFERS;

  return (
    <button
      type="button"
      onClick={() => addOffer()}
      disabled={atCap}
      className="border-rule text-annotation hover:border-market hover:text-market flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed p-6 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Plus className="h-5 w-5" aria-hidden="true" />
      <span>{t("addOffer")}</span>
    </button>
  );
}
