/**
 * Shared utility functions for Monte Carlo visualizations
 */

import { formatCurrencyCompact } from "@/lib/format-utils";

// Re-export for backward compatibility
export { formatCurrencyCompact as formatCurrency };

/**
 * Common chart tooltip style configuration - Fundcy dark style
 */
export const tooltipStyle = {
  backgroundColor: "hsl(220 15% 15%)",
  border: "none",
  borderRadius: "12px",
  color: "white",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
};
