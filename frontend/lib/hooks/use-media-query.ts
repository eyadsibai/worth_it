"use client";

import * as React from "react";

/**
 * Hook to detect if a media query matches.
 * Useful for responsive layouts and conditional rendering.
 *
 * **SSR Behavior:** Returns false during server-side rendering and on the
 * first client render (before useEffect runs). This may cause a brief
 * flash of the "non-matching" content during hydration. Consider using
 * a mounted state or CSS-based media queries as fallback if layout shift
 * is a concern.
 *
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns true if the media query matches, false otherwise
 *
 * @example
 * ```tsx
 * const isDesktop = useMediaQuery("(min-width: 1024px)");
 * const isMobile = useMediaQuery("(max-width: 767px)");
 *
 * return isDesktop ? <DesktopNav /> : <MobileNav />;
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    try {
      const mediaQuery = window.matchMedia(query);
      setMatches(mediaQuery.matches);

      const handleChange = (event: MediaQueryListEvent) => {
        setMatches(event.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } catch {
      // SSR or matchMedia not available
      return;
    }
  }, [query]);

  return matches;
}

/**
 * Convenience hook to detect mobile viewport (max-width: 767px).
 * Returns true for viewports below Tailwind's `md` breakpoint (768px+).
 * This means 768px and above is considered "not mobile" (consistent with
 * Tailwind's md: classes which apply at 768px and above).
 *
 * @returns true if viewport is mobile-sized, false otherwise
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 *
 * return isMobile ? <MobileTable data={data} /> : <DesktopTable data={data} />;
 * ```
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * Convenience hook to detect tablet viewport (max-width: 1023px).
 * Returns true for viewports below Tailwind's `lg` breakpoint (1024px+).
 * This means 1024px and above is considered "not tablet" (consistent with
 * Tailwind's lg: classes which apply at 1024px and above).
 *
 * @returns true if viewport is tablet-sized or smaller, false otherwise
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}
