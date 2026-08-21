"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  /** Target element ID to skip to (without #) */
  targetId?: string;
  /** Custom label text. Defaults to the translated "Skip to main content". */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skip link for keyboard navigation accessibility.
 * Visually hidden until focused, then appears prominently.
 *
 * Every route sits under the locale layout's `NextIntlClientProvider`
 * (`app/[locale]/layout.tsx`), so resolving the default label here — rather
 * than requiring each caller to pass a translated `label` — keeps every
 * mount point (the legacy `AppShell`, the Ledger landing, the cap-table
 * route) correct in both locales for free.
 *
 * @example
 * ```tsx
 * <SkipLink />
 * <Header />
 * <main id="main-content">...</main>
 * ```
 */
export function SkipLink({ targetId = "main-content", label, className }: SkipLinkProps) {
  const t = useTranslations("a11y");
  const resolvedLabel = label ?? t("skipToMainContent");

  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Visually hidden by default
        "sr-only",
        // Visible when focused - appears at top of screen. `start-4` (not
        // `left-4`) so the link lands in the correct corner under RTL too.
        "focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100]",
        // Styling when visible
        "focus:rounded-md focus:px-4 focus:py-2",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:ring-ring focus:ring-2 focus:ring-offset-2",
        "focus:text-sm focus:font-medium",
        // Animation
        "focus:animate-in focus:fade-in-0 focus:zoom-in-95",
        className
      )}
    >
      {resolvedLabel}
    </a>
  );
}
