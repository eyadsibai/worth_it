"use client";

import { cn } from "@/lib/utils";

interface SkipLinkProps {
  /** Target element ID to skip to (without #) */
  targetId?: string;
  /** Custom label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skip link for keyboard navigation accessibility.
 * Visually hidden until focused, then appears prominently.
 *
 * @example
 * ```tsx
 * <SkipLink />
 * <Header />
 * <main id="main-content">...</main>
 * ```
 */
export function SkipLink({
  targetId = "main-content",
  label = "Skip to main content",
  className,
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Visually hidden by default
        "sr-only",
        // Visible when focused - appears at top of screen
        "focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
        // Styling when visible
        "focus:px-4 focus:py-2 focus:rounded-md",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "focus:font-medium focus:text-sm",
        // Animation
        "focus:animate-in focus:fade-in-0 focus:zoom-in-95",
        className
      )}
    >
      {label}
    </a>
  );
}
