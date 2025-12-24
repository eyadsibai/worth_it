import * as React from "react";

interface ResponsiveTextProps {
  /** Content shown on sm+ screens (640px and up) */
  full: React.ReactNode;
  /** Content shown on mobile (below 640px) */
  short: React.ReactNode;
  /** Optional className for the wrapper span */
  className?: string;
}

/**
 * ResponsiveText - Show different text content at breakpoints.
 *
 * Uses Tailwind's responsive classes to show full text on larger screens
 * and abbreviated text on mobile devices.
 *
 * @example
 * <ResponsiveText
 *   full="Opportunity Cost (NPV)"
 *   short="Opp. Cost"
 * />
 */
export function ResponsiveText({ full, short, className }: ResponsiveTextProps) {
  return (
    <span className={className}>
      <span className="hidden sm:inline">{full}</span>
      <span className="sm:hidden">{short}</span>
    </span>
  );
}
