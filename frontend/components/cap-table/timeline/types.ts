/**
 * Types for Equity Timeline Visualization (#228)
 *
 * Supports both founder mode (cap table changes) and employee mode (vesting).
 */

import { z } from "zod";

// ============================================================================
// Event Types
// ============================================================================

export const TimelineEventTypeEnum = z.enum([
  // Founder mode events
  "funding_round",
  "stakeholder_added",
  "stakeholder_removed",
  "option_pool_change",
  "instrument_converted",
  "company_founded",
  // Employee mode events
  "grant_date",
  "cliff_date",
  "vesting_milestone",
  "exercise_deadline",
]);
export type TimelineEventType = z.infer<typeof TimelineEventTypeEnum>;

// Human-readable labels for event types
export const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  funding_round: "Funding Round",
  stakeholder_added: "Stakeholder Added",
  stakeholder_removed: "Stakeholder Removed",
  option_pool_change: "Option Pool Change",
  instrument_converted: "Instrument Converted",
  company_founded: "Company Founded",
  grant_date: "Grant Date",
  cliff_date: "Cliff Reached",
  vesting_milestone: "Vesting Milestone",
  exercise_deadline: "Exercise Deadline",
};

// Icons for event types (lucide icon names)
export const EVENT_TYPE_ICONS: Record<TimelineEventType, string> = {
  funding_round: "DollarSign",
  stakeholder_added: "UserPlus",
  stakeholder_removed: "UserMinus",
  option_pool_change: "PieChart",
  instrument_converted: "ArrowRightLeft",
  company_founded: "Building",
  grant_date: "Gift",
  cliff_date: "Mountain",
  vesting_milestone: "TrendingUp",
  exercise_deadline: "Clock",
};

// ============================================================================
// Ownership Data
// ============================================================================

export type OwnershipCategory = "founder" | "investor" | "employee" | "option_pool";

export const OwnershipDataPointSchema = z.object({
  stakeholderId: z.string(),
  name: z.string(),
  percentage: z.number().min(0).max(100),
  category: z.enum(["founder", "investor", "employee", "option_pool"]),
});
export type OwnershipDataPoint = z.infer<typeof OwnershipDataPointSchema>;

// ============================================================================
// Timeline Event
// ============================================================================

export const TimelineEventMetadataSchema = z.object({
  amount: z.number().optional(),
  valuation: z.number().optional(),
  sharesAffected: z.number().optional(),
  percentageChange: z.number().optional(),
  vestedPercentage: z.number().optional(), // For employee mode
});
export type TimelineEventMetadata = z.infer<typeof TimelineEventMetadataSchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  timestamp: z.number(), // Unix ms
  type: TimelineEventTypeEnum,
  title: z.string(),
  description: z.string(),
  ownershipSnapshot: z.array(OwnershipDataPointSchema),
  metadata: TimelineEventMetadataSchema.optional(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// ============================================================================
// Chart Data Types
// ============================================================================

export interface TimelineChartDataPoint {
  timestamp: number;
  date: string; // Formatted for display
  // Dynamic keys for each stakeholder's percentage
  [stakeholderName: string]: number | string;
}

// ============================================================================
// Filter State
// ============================================================================

export interface TimelineFilterState {
  // Founder mode filters
  fundingRound: boolean;
  stakeholderAdded: boolean;
  stakeholderRemoved: boolean;
  optionPoolChange: boolean;
  instrumentConverted: boolean;
  // Employee mode filters
  grantDate: boolean;
  cliffDate: boolean;
  vestingMilestone: boolean;
  exerciseDeadline: boolean;
}

export const DEFAULT_FOUNDER_FILTERS: Partial<TimelineFilterState> = {
  fundingRound: true,
  stakeholderAdded: true,
  stakeholderRemoved: true,
  optionPoolChange: true,
  instrumentConverted: true,
};

export const DEFAULT_EMPLOYEE_FILTERS: Partial<TimelineFilterState> = {
  grantDate: true,
  cliffDate: true,
  vestingMilestone: true,
  exerciseDeadline: true,
};

/**
 * Complete filter state with all filters enabled - useful for testing
 */
export const ALL_FILTERS_ENABLED: TimelineFilterState = {
  // Founder mode
  fundingRound: true,
  stakeholderAdded: true,
  stakeholderRemoved: true,
  optionPoolChange: true,
  instrumentConverted: true,
  // Employee mode
  grantDate: true,
  cliffDate: true,
  vestingMilestone: true,
  exerciseDeadline: true,
};

// ============================================================================
// Component Props
// ============================================================================

export interface TimelineInteractionState {
  selectedTimestamp: number | null;
  hoveredTimestamp: number | null;
}

export interface TimelineInteractionHandlers {
  onSelect: (timestamp: number | null) => void;
  onHover: (timestamp: number | null) => void;
}

// ============================================================================
// Export Types
// ============================================================================

export type TimelineExportFormat = "png" | "pdf" | "csv" | "json";

// ============================================================================
// Constants
// ============================================================================

export const TIMELINE_FILTER_STORAGE_KEY = "equity-timeline-filters";

// Chart colors matching Fundcy palette
export const OWNERSHIP_COLORS: Record<OwnershipCategory, string> = {
  founder: "hsl(var(--chart-1))", // Dark forest green
  investor: "hsl(var(--chart-4))", // Teal/mint
  employee: "hsl(var(--chart-2))", // Medium green
  option_pool: "hsl(var(--chart-3))", // Lime
};

// Named colors for specific stakeholders (cycles through)
export const STAKEHOLDER_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];
