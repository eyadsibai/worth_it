# Equity Timeline Visualization Design

**Issue**: #228 - Timeline visualization of equity changes and dilutions
**Date**: 2025-12-19
**Status**: Approved

## Summary

Add a timeline view that visualizes how equity ownership changes over time. Supports both founder mode (cap table changes) and employee mode (vesting schedules). Features a stacked area chart showing ownership evolution plus a horizontal event timeline below, with full cross-interaction between the two visualizations.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Both modes simultaneously | Unified approach, cohesive UX |
| Visualization | Area chart + horizontal timeline | Best of both: trends + discrete events |
| Layout | Stacked sections | Both visible, easy correlation |
| Time scale | Auto-scale | Adapts to data, simpler UX |
| Event filtering | User-configurable checkboxes | Flexibility for different use cases |
| Chart-timeline linking | Fully linked | Premium, polished experience |
| Export | PNG, PDF, CSV, JSON | Complete export capabilities |

## Component Architecture

```
frontend/components/cap-table/timeline/
├── equity-timeline.tsx          # Main container (stacked layout)
├── ownership-area-chart.tsx     # Stacked area chart with event markers
├── event-timeline.tsx           # Horizontal timeline with event dots
├── timeline-event-filters.tsx   # Checkbox filters for event types
├── timeline-event-popover.tsx   # Detail card on hover/click
├── timeline-export-menu.tsx     # Export dropdown
├── use-timeline-data.ts         # Transform version history → chart data
├── use-timeline-export.ts       # Export logic
└── types.ts                     # Timeline-specific types
```

### Integration Points

- **Founder mode**: Reads from `useVersionHistory()` hook (existing)
- **Employee mode**: Derives events from form data (grant date, vesting)

## Data Model

```typescript
export type TimelineEventType =
  // Founder mode events
  | "funding_round"
  | "stakeholder_added"
  | "stakeholder_removed"
  | "option_pool_change"
  | "instrument_converted"
  // Employee mode events
  | "grant_date"
  | "cliff_date"
  | "vesting_milestone"
  | "exercise_deadline";

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: TimelineEventType;
  title: string;
  description: string;
  ownershipSnapshot: OwnershipDataPoint[];
  metadata?: {
    amount?: number;
    valuation?: number;
    sharesAffected?: number;
    percentageChange?: number;
  };
}

export interface OwnershipDataPoint {
  stakeholderId: string;
  name: string;
  percentage: number;
  category: "founder" | "investor" | "employee" | "option_pool";
}

export interface TimelineChartData {
  timestamp: number;
  date: string;
  [stakeholderName: string]: number | string;
}
```

## Visual Design

### Ownership Area Chart

```
┌─────────────────────────────────────────────────────────────────┐
│  Equity Ownership Over Time                          [Filters ▾]│
├─────────────────────────────────────────────────────────────────┤
│  100% ┤░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│       │████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░│
│   50% ┤██████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│       │██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│    0% ┼──●────────●─────────────●────────────────●──────────────│
│       Jan 2023   Jun 2023      Mar 2024         Nov 2024       │
└─────────────────────────────────────────────────────────────────┘
Legend: ■ Founders  ■ Option Pool  ■ Investors
```

- Fundcy green color palette (chart-1 through chart-5)
- Event markers as circular dots on x-axis
- Dark tooltip on hover (Fundcy style)

### Horizontal Event Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│  Timeline                                                       │
├─────────────────────────────────────────────────────────────────┤
│    ●──────────────●────────────────●─────────────────●          │
│    │              │                │                 │          │
│  Jan 2023     Jun 2023         Mar 2024          Nov 2024       │
│  Founded      Seed Round       Pool Expanded     Series A       │
│                                                                 │
│  ┌─────────────────────────────────┐                           │
│  │ ● Series A Closed               │  ◄── Detail popover       │
│  │   Nov 15, 2024                  │                           │
│  │   Raised $5M at $25M valuation  │                           │
│  └─────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

- Horizontal line with positioned event dots
- Icon per event type
- Detail popover on hover/click
- Drag to scroll for long timelines

## Interaction Model

### Sync Behaviors

| User Action | Chart Response | Timeline Response |
|-------------|----------------|-------------------|
| Hover chart | Vertical crosshair + tooltip | Nearest event highlighted |
| Click chart | Locks selection | Event detail opens |
| Hover timeline event | Vertical line at date | Hover state |
| Click timeline event | Scrolls to date | Detail opens |
| Click outside | Clears selection | Clears selection |

### State Management

```typescript
const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);

<OwnershipAreaChart
  onHover={setHoveredTimestamp}
  onSelect={setSelectedTimestamp}
  selectedTimestamp={selectedTimestamp}
  hoveredTimestamp={hoveredTimestamp}
/>
<EventTimeline
  onHover={setHoveredTimestamp}
  onSelect={setSelectedTimestamp}
  selectedTimestamp={selectedTimestamp}
  hoveredTimestamp={hoveredTimestamp}
/>
```

## Employee Mode

For employee mode, timeline events are derived from form data:

1. **Grant Date** - Initial equity grant
2. **Cliff Date** - First vesting milestone (typically 12 months)
3. **Vesting Milestones** - 25%, 50%, 75%, 100% vested
4. **Exercise Deadline** - Options expiration (if applicable)

Chart shows single area of vested percentage climbing over time.

## Filters

Compact toggle chips, inline with header:

**Founder Mode:**
- Funding Rounds
- Stakeholders
- Option Pool
- Conversions

**Employee Mode:**
- Grant Date
- Cliff
- Vesting Milestones
- Deadlines

Preferences persisted in localStorage.

## Export

Dropdown menu with options:

| Format | Description |
|--------|-------------|
| PNG Image | Screenshot of chart + timeline |
| PDF Report | Integrated into existing PDF export |
| CSV Data | Events table (date, type, description) |
| JSON Data | Full timeline data structure |

## Acceptance Criteria

- [ ] Ownership area chart renders with stacked stakeholder data
- [ ] Horizontal timeline shows events with proper positioning
- [ ] Full cross-interaction between chart and timeline
- [ ] Works for founder mode (version history data)
- [ ] Works for employee mode (derived vesting events)
- [ ] Event type filters toggle visibility
- [ ] Export to PNG, PDF, CSV, JSON
- [ ] Responsive design for mobile/tablet
- [ ] Unit tests for data transformation logic
- [ ] Matches Fundcy design aesthetic
