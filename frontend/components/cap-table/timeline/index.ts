/**
 * Equity Timeline Module (#228)
 *
 * Exports timeline visualization components for both founder and employee modes.
 */

// Main components
export { EquityTimeline, FounderTimeline, EmployeeTimeline } from "./equity-timeline";
export { OwnershipAreaChart } from "./ownership-area-chart";
export { EventTimeline } from "./event-timeline";
export { TimelineEventFilters, useTimelineFilters } from "./timeline-event-filters";
export { TimelineExportMenu } from "./timeline-export-menu";

// Hooks
export {
  useFounderTimelineData,
  useEmployeeTimelineData,
  transformVersionsToEvents,
  deriveEmployeeTimelineEvents,
  transformEventsToChartData,
  filterEvents,
} from "./use-timeline-data";
export { useTimelineExport, exportToCSV, exportToJSON, exportToPNG } from "./use-timeline-export";

// Types
export type {
  TimelineEvent,
  TimelineEventType,
  TimelineEventMetadata,
  OwnershipDataPoint,
  OwnershipCategory,
  TimelineChartDataPoint,
  TimelineFilterState,
  TimelineInteractionState,
  TimelineInteractionHandlers,
  TimelineExportFormat,
} from "./types";

// Constants
export {
  TimelineEventTypeEnum,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  OWNERSHIP_COLORS,
  STAKEHOLDER_COLORS,
  TIMELINE_FILTER_STORAGE_KEY,
  DEFAULT_FOUNDER_FILTERS,
  DEFAULT_EMPLOYEE_FILTERS,
} from "./types";
