"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSetCommandPaletteOpen, useDisplayCurrency, useAppStore } from "@/lib/store";
import type { DisplayCurrency } from "@/lib/ledger/format-money";
import { cn } from "@/lib/utils";

const DISPLAY_CURRENCIES: DisplayCurrency[] = ["USD", "SAR"];

/** The other of the two supported locales — the language switcher always offers exactly this one. */
function otherLocale(locale: string): "en" | "ar" {
  return locale === "en" ? "ar" : "en";
}

/** Each language names itself in its own script, regardless of the active locale. */
const LANGUAGE_LABELS: Record<"en" | "ar", string> = {
  en: "English",
  ar: "العربية",
};

/**
 * The document's masthead: wordmark, primary nav, the ⌘K command palette
 * trigger, the language switcher, the theme toggle, and the display-currency
 * select. Replaces the legacy glass `Header`/`AppShell` pair for the Ledger
 * landing (and, from Task 14, the Cap Table route) — `Header` itself survives
 * for the not-yet-restyled Valuation/About pages until C2/C3.
 */
export function Masthead() {
  const t = useTranslations("masthead");
  const locale = useLocale();
  const pathname = usePathname();
  const setCommandPaletteOpen = useSetCommandPaletteOpen();
  const displayCurrency = useDisplayCurrency();
  const setDisplayCurrency = useAppStore((state) => state.setDisplayCurrency);
  const target = otherLocale(locale);

  const navItems = [
    { href: "/", label: t("analysis") },
    { href: "/cap-table", label: t("capTable") },
    { href: "/valuation", label: t("valuation") },
    { href: "/about", label: t("about") },
  ] as const;

  return (
    <header className="border-ink bg-paper border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="font-serif text-lg font-medium">
          Worth It
        </Link>

        <nav aria-label={t("analysis")} className="hidden items-center gap-4 md:flex">
          {navItems.map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn("text-sm", isActive ? "text-ink" : "text-annotation hover:text-ink")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="border-rule text-annotation hover:text-ink rounded-sm border px-2 py-1 font-mono text-xs"
          >
            {t("search")} <kbd className="ms-1">⌘K</kbd>
          </button>

          <label className="flex items-center gap-1 text-xs">
            <span className="sr-only">{t("currency")}</span>
            <select
              value={displayCurrency}
              onChange={(event) => setDisplayCurrency(event.target.value as DisplayCurrency)}
              className="border-rule text-ink bg-paper rounded-sm border px-1 py-1 font-mono text-xs"
            >
              {DISPLAY_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <Link
            href={pathname}
            locale={target}
            aria-label={t("language")}
            className="text-annotation hover:text-ink text-xs"
          >
            {LANGUAGE_LABELS[target]}
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
