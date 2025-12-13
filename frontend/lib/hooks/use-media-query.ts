"use client";

import * as React from "react";

/**
 * Hook to detect if a media query matches.
 * Useful for responsive layouts and conditional rendering.
 *
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @returns true if the media query matches, false otherwise
 *
 * @example
 * ```tsx
 * const isDesktop = useMediaQuery("(min-width: 1024px)");
 * const isMobile = useMediaQuery("(max-width: 768px)");
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
 * Convenience hook to detect mobile viewport (max-width: 768px).
 * Matches Tailwind's `md` breakpoint.
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
  return useMediaQuery("(max-width: 768px)");
}

/**
 * Convenience hook to detect tablet viewport (max-width: 1024px).
 * Matches Tailwind's `lg` breakpoint.
 *
 * @returns true if viewport is tablet-sized or smaller, false otherwise
 */
export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1024px)");
}
