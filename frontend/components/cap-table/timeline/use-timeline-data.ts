/**
 * Timeline Data Hook for Equity Timeline (#228)
 *
 * Transforms version history data (founder mode) and form data (employee mode)
 * into unified timeline events and chart data.
 */

import { useMemo } from "react";
import { format, addMonths } from "date-fns";
import type { CapTableVersion } from "../history/types";
import type {
  TimelineEvent,
  TimelineEventType,
  OwnershipDataPoint,
  TimelineChartDataPoint,
  OwnershipCategory,
  TimelineFilterState,
} from "./types";
import type { Stakeholder, RSUForm, StockOptionsForm, GlobalSettingsForm } from "@/lib/schemas";

// ============================================================================
// Founder Mode: Transform Version History to Timeline Events
// ============================================================================

/**
 * Map stakeholder type to ownership category
 */
function getOwnershipCategory(type: string): OwnershipCategory {
  switch (type) {
    case "founder":
      return "founder";
    case "investor":
      return "investor";
    case "employee":
    case "advisor":
      return "employee";
    default:
      return "founder";
  }
}

/**
 * Map version trigger type to timeline event type
 */
function mapTriggerToEventType(trigger: string): TimelineEventType {
  switch (trigger) {
    case "funding_added":
      return "funding_round";
    case "stakeholder_added":
      return "stakeholder_added";
    case "stakeholder_removed":
      return "stakeholder_removed";
    case "option_pool_changed":
      return "option_pool_change";
    case "instrument_converted":
      return "instrument_converted";
    case "manual_save":
      return "company_founded"; // Treat manual saves as founding/milestone
    default:
      return "company_founded";
  }
}

/**
 * Create ownership snapshot from stakeholders and option pool
 */
function createOwnershipSnapshot(
  stakeholders: Stakeholder[],
  optionPoolPct: number
): OwnershipDataPoint[] {
  const snapshot: OwnershipDataPoint[] = stakeholders.map((s) => ({
    stakeholderId: s.id,
    name: s.name,
    percentage: s.ownership_pct,
    category: getOwnershipCategory(s.type),
  }));

  // Add option pool as a synthetic stakeholder
  if (optionPoolPct > 0) {
    snapshot.push({
      stakeholderId: "option_pool",
      name: "Option Pool",
      percentage: optionPoolPct,
      category: "option_pool",
    });
  }

  return snapshot;
}

/**
 * Transform version history into timeline events (founder mode)
 */
export function transformVersionsToEvents(versions: CapTableVersion[]): TimelineEvent[] {
  if (versions.length === 0) return [];

  // Versions are stored newest first, reverse for chronological order
  const chronological = [...versions].reverse();

  return chronological.map((version, index) => {
    const eventType = mapTriggerToEventType(version.triggerType);
    const snapshot = createOwnershipSnapshot(
      version.snapshot.stakeholders,
      version.snapshot.optionPoolPct
    );

    // Calculate metadata based on event type
    const metadata: TimelineEvent["metadata"] = {};

    // For funding rounds, try to extract amount from description
    if (eventType === "funding_round") {
      const amountMatch = version.description.match(/\$?([\d,]+(?:\.\d+)?)\s*(?:M|K)?/i);
      if (amountMatch) {
        const numStr = amountMatch[1].replace(/,/g, "");
        metadata.amount = parseFloat(numStr);
      }
    }

    // For option pool changes, calculate the change
    if (eventType === "option_pool_change" && index > 0) {
      const prevVersion = chronological[index - 1];
      metadata.percentageChange =
        version.snapshot.optionPoolPct - prevVersion.snapshot.optionPoolPct;
    }

    return {
      id: version.id,
      timestamp: version.timestamp,
      type: eventType,
      title: getEventTitle(eventType, version.description),
      description: version.description,
      ownershipSnapshot: snapshot,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  });
}

/**
 * Get a concise title for an event
 */
function getEventTitle(type: TimelineEventType, description: string): string {
  // Extract entity name from description if present
  const colonIndex = description.indexOf(":");
  if (colonIndex > 0) {
    return description.substring(colonIndex + 1).trim();
  }

  // Default titles by type
  switch (type) {
    case "funding_round":
      return "Funding Round";
    case "stakeholder_added":
      return "New Stakeholder";
    case "stakeholder_removed":
      return "Stakeholder Removed";
    case "option_pool_change":
      return "Option Pool Changed";
    case "instrument_converted":
      return "Instrument Converted";
    case "company_founded":
      return "Company Founded";
    default:
      return description;
  }
}

// ============================================================================
// Employee Mode: Derive Timeline Events from Form Data
// ============================================================================

/**
 * Check if equity form is stock options (vs RSU)
 */
function isStockOptions(form: RSUForm | StockOptionsForm): form is StockOptionsForm {
  return "strike_price" in form;
}

/**
 * Derive timeline events from employee equity form data
 */
export function deriveEmployeeTimelineEvents(
  equityDetails: RSUForm | StockOptionsForm,
  _globalSettings: GlobalSettingsForm // Reserved for future use with salary-based milestones
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Parse grant date - default to today (no grant_date in schema)
  const grantDate = new Date();
  // Schema stores vesting_period/cliff_period in years, convert to months
  // Use ?? instead of || to allow 0 as a valid cliff period
  const vestingMonths = (equityDetails.vesting_period ?? 4) * 12;
  const cliffMonths = (equityDetails.cliff_period ?? 1) * 12;
  // Get shares/options count based on equity type
  const totalShares = isStockOptions(equityDetails) ? equityDetails.num_options : 0; // RSUs use percentage, not share count

  // Helper to create vesting snapshot at a given percentage
  const createVestingSnapshot = (vestedPct: number): OwnershipDataPoint[] => [
    {
      stakeholderId: "you",
      name: "Your Equity",
      percentage: vestedPct,
      category: "employee",
    },
    {
      stakeholderId: "unvested",
      name: "Unvested",
      percentage: 100 - vestedPct,
      category: "option_pool",
    },
  ];

  // Build description based on equity type
  const grantDescription = isStockOptions(equityDetails)
    ? `Granted ${totalShares.toLocaleString()} stock options`
    : `Granted ${equityDetails.total_equity_grant_pct}% equity in RSUs`;

  // 1. Grant Date
  events.push({
    id: "grant_date",
    timestamp: grantDate.getTime(),
    type: "grant_date",
    title: "Equity Grant",
    description: grantDescription,
    ownershipSnapshot: createVestingSnapshot(0),
    metadata: {
      sharesAffected: totalShares,
      vestedPercentage: 0,
    },
  });

  // 2. Cliff Date (if applicable)
  if (cliffMonths > 0) {
    const cliffDate = addMonths(grantDate, cliffMonths);
    const cliffPct = (cliffMonths / vestingMonths) * 100;

    events.push({
      id: "cliff_date",
      timestamp: cliffDate.getTime(),
      type: "cliff_date",
      title: "Cliff Reached",
      description: `${cliffPct.toFixed(0)}% vested after ${cliffMonths} month cliff`,
      ownershipSnapshot: createVestingSnapshot(cliffPct),
      metadata: {
        vestedPercentage: cliffPct,
        sharesAffected: Math.floor((cliffPct / 100) * totalShares),
      },
    });
  }

  // 3. Vesting Milestones (25%, 50%, 75%, 100%)
  const milestones = [25, 50, 75, 100];
  milestones.forEach((pct) => {
    const monthsToMilestone = (pct / 100) * vestingMonths;

    // Skip if this milestone is before or at cliff
    if (monthsToMilestone <= cliffMonths && pct < 100) return;

    const milestoneDate = addMonths(grantDate, monthsToMilestone);

    events.push({
      id: `vesting_${pct}`,
      timestamp: milestoneDate.getTime(),
      type: "vesting_milestone",
      title: `${pct}% Vested`,
      description:
        pct === 100
          ? "Fully vested!"
          : `${pct}% of equity vested after ${monthsToMilestone} months`,
      ownershipSnapshot: createVestingSnapshot(pct),
      metadata: {
        vestedPercentage: pct,
        sharesAffected: Math.floor((pct / 100) * totalShares),
      },
    });
  });

  // 4. Exercise Deadline (for options only - 10 years from grant)
  if (isStockOptions(equityDetails)) {
    const exerciseDeadline = addMonths(grantDate, 120); // 10 years

    events.push({
      id: "exercise_deadline",
      timestamp: exerciseDeadline.getTime(),
      type: "exercise_deadline",
      title: "Exercise Deadline",
      description: "Options expire if not exercised",
      ownershipSnapshot: createVestingSnapshot(100),
      metadata: {},
    });
  }

  // Sort by timestamp
  return events.sort((a, b) => a.timestamp - b.timestamp);
}

// ============================================================================
// Chart Data Transformation
// ============================================================================

/**
 * Transform timeline events into chart data points for Recharts AreaChart
 */
export function transformEventsToChartData(events: TimelineEvent[]): TimelineChartDataPoint[] {
  if (events.length === 0) return [];

  return events.map((event) => {
    const dataPoint: TimelineChartDataPoint = {
      timestamp: event.timestamp,
      date: format(new Date(event.timestamp), "MMM yyyy"),
    };

    // Add each stakeholder's percentage
    event.ownershipSnapshot.forEach((owner) => {
      dataPoint[owner.name] = owner.percentage;
    });

    return dataPoint;
  });
}

/**
 * Get unique stakeholder names from events for chart legend
 */
export function getStakeholderNames(events: TimelineEvent[]): string[] {
  const names = new Set<string>();

  events.forEach((event) => {
    event.ownershipSnapshot.forEach((owner) => {
      names.add(owner.name);
    });
  });

  return Array.from(names);
}

// ============================================================================
// Filter Logic
// ============================================================================

/**
 * Filter events based on filter state
 */
export function filterEvents(
  events: TimelineEvent[],
  filters: TimelineFilterState
): TimelineEvent[] {
  return events.filter((event) => {
    switch (event.type) {
      case "funding_round":
        return filters.fundingRound;
      case "stakeholder_added":
        return filters.stakeholderAdded;
      case "stakeholder_removed":
        return filters.stakeholderRemoved;
      case "option_pool_change":
        return filters.optionPoolChange;
      case "instrument_converted":
        return filters.instrumentConverted;
      case "company_founded":
        return true; // Always show founding
      case "grant_date":
        return filters.grantDate;
      case "cliff_date":
        return filters.cliffDate;
      case "vesting_milestone":
        return filters.vestingMilestone;
      case "exercise_deadline":
        return filters.exerciseDeadline;
      default:
        return true;
    }
  });
}

// ============================================================================
// Main Hook: Founder Mode
// ============================================================================

interface UseFounderTimelineDataOptions {
  versions: CapTableVersion[];
  filters: TimelineFilterState;
}

interface UseFounderTimelineDataReturn {
  events: TimelineEvent[];
  filteredEvents: TimelineEvent[];
  chartData: TimelineChartDataPoint[];
  stakeholderNames: string[];
}

/**
 * Hook to get timeline data for founder mode
 */
export function useFounderTimelineData({
  versions,
  filters,
}: UseFounderTimelineDataOptions): UseFounderTimelineDataReturn {
  const events = useMemo(() => transformVersionsToEvents(versions), [versions]);

  const filteredEvents = useMemo(() => filterEvents(events, filters), [events, filters]);

  const chartData = useMemo(() => transformEventsToChartData(filteredEvents), [filteredEvents]);

  const stakeholderNames = useMemo(() => getStakeholderNames(filteredEvents), [filteredEvents]);

  return {
    events,
    filteredEvents,
    chartData,
    stakeholderNames,
  };
}

// ============================================================================
// Main Hook: Employee Mode
// ============================================================================

interface UseEmployeeTimelineDataOptions {
  equityDetails: RSUForm | StockOptionsForm | null;
  globalSettings: GlobalSettingsForm | null;
  filters: TimelineFilterState;
}

interface UseEmployeeTimelineDataReturn {
  events: TimelineEvent[];
  filteredEvents: TimelineEvent[];
  chartData: TimelineChartDataPoint[];
  stakeholderNames: string[];
}

/**
 * Hook to get timeline data for employee mode
 */
export function useEmployeeTimelineData({
  equityDetails,
  globalSettings,
  filters,
}: UseEmployeeTimelineDataOptions): UseEmployeeTimelineDataReturn {
  const events = useMemo(() => {
    if (!equityDetails || !globalSettings) return [];
    return deriveEmployeeTimelineEvents(equityDetails, globalSettings);
  }, [equityDetails, globalSettings]);

  const filteredEvents = useMemo(() => filterEvents(events, filters), [events, filters]);

  const chartData = useMemo(() => transformEventsToChartData(filteredEvents), [filteredEvents]);

  const stakeholderNames = useMemo(() => getStakeholderNames(filteredEvents), [filteredEvents]);

  return {
    events,
    filteredEvents,
    chartData,
    stakeholderNames,
  };
}
