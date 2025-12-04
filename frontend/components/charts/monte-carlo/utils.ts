/**
 * Shared utility functions for Monte Carlo visualizations
 */

import { formatCurrencyCompact } from "@/lib/format-utils";

// Re-export for backward compatibility
export { formatCurrencyCompact as formatCurrency };

/**
 * Common chart tooltip style configuration
 */
export const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};
