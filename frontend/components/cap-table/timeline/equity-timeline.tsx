"use client";

/**
 * Equity Timeline Component (#228)
 *
 * Main container for the equity timeline visualization.
 * Combines area chart, horizontal timeline, filters, and export.
 */

import { useState, useCallback, useRef } from "react";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVersionHistory } from "../history/use-version-history";
import { OwnershipAreaChart } from "./ownership-area-chart";
import { EventTimeline } from "./event-timeline";
import {
  TimelineEventFilters,
  useTimelineFilters,
} from "./timeline-event-filters";
import { TimelineExportMenu } from "./timeline-export-menu";
import { useTimelineExport } from "./use-timeline-export";
import {
  useFounderTimelineData,
  useEmployeeTimelineData,
} from "./use-timeline-data";
import type {
  TimelineInteractionState,
  TimelineInteractionHandlers,
  TimelineExportFormat,
} from "./types";
import type { AppMode } from "@/lib/store";
import type { RSUForm, StockOptionsForm, GlobalSettingsForm } from "@/lib/schemas";

// ============================================================================
// Founder Mode Timeline
// ============================================================================

interface FounderTimelineProps {
  className?: string;
}

export function FounderTimeline({ className }: FounderTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { versions } = useVersionHistory();
  const { filters, toggleFilter, showAll, hideAll } = useTimelineFilters("founder");

  // Get timeline data
  const { filteredEvents, chartData, stakeholderNames } = useFounderTimelineData({
    versions,
    filters,
  });

  // Interaction state
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);

  const interactionState: TimelineInteractionState = {
    selectedTimestamp,
    hoveredTimestamp,
  };

  const interactionHandlers: TimelineInteractionHandlers = {
    onSelect: setSelectedTimestamp,
    onHover: setHoveredTimestamp,
  };

  // Export handlers
  const { exportPNG, exportCSV, exportJSON, exportPDF } = useTimelineExport({
    events: filteredEvents,
    containerRef,
  });

  const handleExport = useCallback(
    async (format: TimelineExportFormat) => {
      switch (format) {
        case "png":
          await exportPNG();
          break;
        case "csv":
          exportCSV();
          break;
        case "json":
          exportJSON();
          break;
        case "pdf":
          exportPDF();
          break;
      }
    },
    [exportPNG, exportCSV, exportJSON, exportPDF]
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Equity Timeline</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <TimelineEventFilters
              mode="founder"
              filters={filters}
              onToggleFilter={toggleFilter}
              onShowAll={showAll}
              onHideAll={hideAll}
            />
            <TimelineExportMenu
              onExport={handleExport}
              disabled={filteredEvents.length === 0}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6" ref={containerRef}>
        {/* Ownership Area Chart */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Ownership Over Time
          </h3>
          <OwnershipAreaChart
            chartData={chartData}
            stakeholderNames={stakeholderNames}
            events={filteredEvents}
            interactionState={interactionState}
            interactionHandlers={interactionHandlers}
          />
        </div>

        {/* Horizontal Event Timeline */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Timeline
          </h3>
          <div className="bg-muted/30 rounded-xl">
            <EventTimeline
              events={filteredEvents}
              interactionState={interactionState}
              interactionHandlers={interactionHandlers}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Employee Mode Timeline
// ============================================================================

interface EmployeeTimelineProps {
  equityDetails: RSUForm | StockOptionsForm | null;
  globalSettings: GlobalSettingsForm | null;
  className?: string;
}

export function EmployeeTimeline({
  equityDetails,
  globalSettings,
  className,
}: EmployeeTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { filters, toggleFilter, showAll, hideAll } = useTimelineFilters("employee");

  // Get timeline data
  const { filteredEvents, chartData, stakeholderNames } = useEmployeeTimelineData({
    equityDetails,
    globalSettings,
    filters,
  });

  // Interaction state
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);

  const interactionState: TimelineInteractionState = {
    selectedTimestamp,
    hoveredTimestamp,
  };

  const interactionHandlers: TimelineInteractionHandlers = {
    onSelect: setSelectedTimestamp,
    onHover: setHoveredTimestamp,
  };

  // Export handlers
  const { exportPNG, exportCSV, exportJSON, exportPDF } = useTimelineExport({
    events: filteredEvents,
    containerRef,
  });

  const handleExport = useCallback(
    async (format: TimelineExportFormat) => {
      switch (format) {
        case "png":
          await exportPNG();
          break;
        case "csv":
          exportCSV();
          break;
        case "json":
          exportJSON();
          break;
        case "pdf":
          exportPDF();
          break;
      }
    },
    [exportPNG, exportCSV, exportJSON, exportPDF]
  );

  // Don't render if no equity details
  if (!equityDetails || !globalSettings) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Vesting Timeline</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <TimelineEventFilters
              mode="employee"
              filters={filters}
              onToggleFilter={toggleFilter}
              onShowAll={showAll}
              onHideAll={hideAll}
            />
            <TimelineExportMenu
              onExport={handleExport}
              disabled={filteredEvents.length === 0}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6" ref={containerRef}>
        {/* Vesting Progress Chart */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Vesting Progress
          </h3>
          <OwnershipAreaChart
            chartData={chartData}
            stakeholderNames={stakeholderNames}
            events={filteredEvents}
            interactionState={interactionState}
            interactionHandlers={interactionHandlers}
          />
        </div>

        {/* Horizontal Event Timeline */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Key Dates
          </h3>
          <div className="bg-muted/30 rounded-xl">
            <EventTimeline
              events={filteredEvents}
              interactionState={interactionState}
              interactionHandlers={interactionHandlers}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Unified Timeline (auto-detects mode)
// ============================================================================

interface EquityTimelineProps {
  mode: AppMode;
  // Employee mode props
  equityDetails?: RSUForm | StockOptionsForm | null;
  globalSettings?: GlobalSettingsForm | null;
  className?: string;
}

export function EquityTimeline({
  mode,
  equityDetails,
  globalSettings,
  className,
}: EquityTimelineProps) {
  if (mode === "employee") {
    return (
      <EmployeeTimeline
        equityDetails={equityDetails ?? null}
        globalSettings={globalSettings ?? null}
        className={className}
      />
    );
  }

  return <FounderTimeline className={className} />;
}
