"use client";

/**
 * Event Timeline Component (#228)
 *
 * Horizontal timeline with event dots positioned by date.
 * Shows detail popover on hover/click.
 */

import { useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  UserPlus,
  UserMinus,
  PieChart,
  ArrowRightLeft,
  Building,
  Gift,
  Mountain,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  TimelineEvent,
  TimelineEventType,
  TimelineInteractionState,
  TimelineInteractionHandlers,
} from "./types";

// ============================================================================
// Icon Mapping
// ============================================================================

const EVENT_ICONS: Record<TimelineEventType, React.ComponentType<{ className?: string }>> = {
  funding_round: DollarSign,
  stakeholder_added: UserPlus,
  stakeholder_removed: UserMinus,
  option_pool_change: PieChart,
  instrument_converted: ArrowRightLeft,
  company_founded: Building,
  grant_date: Gift,
  cliff_date: Mountain,
  vesting_milestone: TrendingUp,
  exercise_deadline: Clock,
};

// ============================================================================
// Event Dot Component
// ============================================================================

interface EventDotProps {
  event: TimelineEvent;
  position: number; // 0-100 percentage position
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (timestamp: number | null) => void;
  onHover: (timestamp: number | null) => void;
}

function EventDot({ event, position, isSelected, isHovered, onSelect, onHover }: EventDotProps) {
  const Icon = EVENT_ICONS[event.type];

  return (
    <Popover open={isSelected}>
      <PopoverTrigger asChild>
        <motion.button
          className={cn(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
            "flex h-10 w-10 items-center justify-center rounded-full",
            "cursor-pointer transition-all duration-200",
            "focus:ring-primary focus:ring-2 focus:ring-offset-2 focus:outline-none",
            isSelected || isHovered
              ? "bg-primary text-primary-foreground scale-110 shadow-lg"
              : "bg-card text-muted-foreground border-border hover:border-primary hover:text-primary border-2"
          )}
          style={{ left: `${position}%` }}
          onMouseEnter={() => onHover(event.timestamp)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(isSelected ? null : event.timestamp)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label={`${event.title} - ${format(new Date(event.timestamp), "MMM d, yyyy")}`}
        >
          <Icon className="h-4 w-4" />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" side="top" align="center" sideOffset={8}>
        <EventDetailCard event={event} />
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Event Detail Card (Popover Content)
// ============================================================================

interface EventDetailCardProps {
  event: TimelineEvent;
}

function EventDetailCard({ event }: EventDetailCardProps) {
  const Icon = EVENT_ICONS[event.type];

  return (
    <div className="overflow-hidden rounded-xl bg-[hsl(220,15%,15%)] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 flex h-8 w-8 items-center justify-center rounded-full">
            <Icon className="text-primary h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-gray-400">
              {format(new Date(event.timestamp), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-3">
        <p className="text-sm text-gray-300">{event.description}</p>

        {/* Metadata */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
            {event.metadata.amount && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="font-medium tabular-nums">
                  ${event.metadata.amount.toLocaleString()}
                </span>
              </div>
            )}
            {event.metadata.valuation && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Valuation</span>
                <span className="font-medium tabular-nums">
                  ${event.metadata.valuation.toLocaleString()}
                </span>
              </div>
            )}
            {event.metadata.percentageChange !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Change</span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    event.metadata.percentageChange > 0 ? "text-terminal" : "text-destructive"
                  )}
                >
                  {event.metadata.percentageChange > 0 ? "+" : ""}
                  {event.metadata.percentageChange.toFixed(1)}%
                </span>
              </div>
            )}
            {event.metadata.vestedPercentage !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Vested</span>
                <span className="text-terminal font-medium tabular-nums">
                  {event.metadata.vestedPercentage.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ownership snapshot preview */}
        {event.ownershipSnapshot.length > 0 && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="mb-2 text-xs tracking-wide text-gray-400 uppercase">
              Ownership at this point
            </p>
            <div className="space-y-1">
              {event.ownershipSnapshot.slice(0, 4).map((owner) => (
                <div key={owner.stakeholderId} className="flex justify-between text-sm">
                  <span className="max-w-[140px] truncate text-gray-300">{owner.name}</span>
                  <span className="font-medium tabular-nums">{owner.percentage.toFixed(1)}%</span>
                </div>
              ))}
              {event.ownershipSnapshot.length > 4 && (
                <p className="text-xs text-gray-500">+{event.ownershipSnapshot.length - 4} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Event Label Component
// ============================================================================

interface EventLabelProps {
  event: TimelineEvent;
  position: number;
  isSelected: boolean;
  isHovered: boolean;
}

function EventLabel({ event, position, isSelected, isHovered }: EventLabelProps) {
  return (
    <div
      className={cn(
        "absolute top-full mt-3 -translate-x-1/2 text-center",
        "transition-colors duration-200",
        isSelected || isHovered ? "text-foreground" : "text-muted-foreground"
      )}
      style={{ left: `${position}%` }}
    >
      <p className="max-w-[80px] truncate text-xs font-medium whitespace-nowrap">{event.title}</p>
      <p className="text-[10px]">{format(new Date(event.timestamp), "MMM yyyy")}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface EventTimelineProps {
  events: TimelineEvent[];
  interactionState: TimelineInteractionState;
  interactionHandlers: TimelineInteractionHandlers;
}

export function EventTimeline({
  events,
  interactionState,
  interactionHandlers,
}: EventTimelineProps) {
  const { selectedTimestamp, hoveredTimestamp } = interactionState;
  const { onSelect, onHover } = interactionHandlers;
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate positions for each event (0-100%)
  const eventPositions = useMemo(() => {
    if (events.length === 0) return [];
    if (events.length === 1) return [{ event: events[0], position: 50 }];

    const timestamps = events.map((e) => e.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime;

    // Add padding so dots aren't at the very edge
    const paddingPct = 5;

    return events.map((event) => ({
      event,
      position:
        timeRange === 0
          ? 50
          : paddingPct + ((event.timestamp - minTime) / timeRange) * (100 - 2 * paddingPct),
    }));
  }, [events]);

  // Find if a timestamp is selected or hovered
  const isEventSelected = useCallback(
    (event: TimelineEvent) => selectedTimestamp === event.timestamp,
    [selectedTimestamp]
  );

  const isEventHovered = useCallback(
    (event: TimelineEvent) => hoveredTimestamp === event.timestamp,
    [hoveredTimestamp]
  );

  if (events.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[120px] items-center justify-center">
        <p>No events to display</p>
      </div>
    );
  }

  return (
    <div className="relative px-8 py-6" ref={containerRef}>
      {/* Timeline line */}
      <div className="relative h-12">
        {/* Background line */}
        <div className="bg-border absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2" />

        {/* Highlighted segment for selected/hovered */}
        <AnimatePresence>
          {(selectedTimestamp || hoveredTimestamp) && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              className="bg-primary absolute top-1/2 left-0 h-1 origin-left -translate-y-1/2"
              style={{
                width: `${
                  eventPositions.find(
                    (ep) => ep.event.timestamp === (selectedTimestamp || hoveredTimestamp)
                  )?.position ?? 0
                }%`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Event dots */}
        {eventPositions.map(({ event, position }) => (
          <EventDot
            key={event.id}
            event={event}
            position={position}
            isSelected={isEventSelected(event)}
            isHovered={isEventHovered(event)}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </div>

      {/* Event labels below the line */}
      <div className="relative h-12">
        {eventPositions.map(({ event, position }) => (
          <EventLabel
            key={event.id}
            event={event}
            position={position}
            isSelected={isEventSelected(event)}
            isHovered={isEventHovered(event)}
          />
        ))}
      </div>
    </div>
  );
}
