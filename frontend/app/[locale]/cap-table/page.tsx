"use client";

import { useTranslations } from "next-intl";
import { Masthead } from "@/components/ledger/masthead";
import { FounderDashboard } from "@/components/dashboard";

/**
 * The cap-table tool's own route (promoted out of the legacy single-page
 * mode toggle — see `lib/store.ts`'s now-unread `appMode`). `FounderDashboard`
 * itself stays legacy (Fundcy) styled this task; only the surrounding chrome
 * — the Ledger `Masthead` and this page's own title — is new.
 */
export default function CapTablePage() {
  const t = useTranslations("masthead");

  return (
    <div className="bg-paper text-ink min-h-screen">
      <Masthead />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="mb-8 font-serif text-3xl font-medium">{t("capTable")}</h1>
        <FounderDashboard />
      </main>
    </div>
  );
}
