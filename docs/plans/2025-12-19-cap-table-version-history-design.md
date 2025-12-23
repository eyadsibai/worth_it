# Cap Table Version History Design

**Issue:** #175
**Date:** 2025-12-19
**Status:** Design Complete

## Overview

Add version history functionality to track cap table changes over time, allowing users to view past states and restore previous versions.

## Design Decisions

### 1. Auto-Save Triggers (Significant Changes Only)

Snapshots are created automatically when:

- Stakeholder added or removed
- Funding round added
- Instruments converted (SAFE/Note → equity)
- Option pool size changed

NOT triggered by:

- Minor edits (name changes, small ownership adjustments)
- UI interactions (expand/collapse, tab switches)

### 2. UI: Slide-Out Panel

- **Trigger:** "History" button in cap table header (clock icon)
- **Panel:** Slides in from right side, 400px width
- **Contents:**
  - List of versions with timestamps
  - Version description (auto-generated from change type)
  - "View" and "Restore" buttons per version
  - Close button

### 3. Version Comparison: Simple Diff View

When viewing a version, show:

- Added stakeholders (green highlight)
- Removed stakeholders (red highlight)
- Changed ownership percentages (yellow highlight with before/after)
- Summary text: "2 stakeholders added, 1 removed, 3 ownership changes"

### 4. Storage

- **Location:** localStorage under `cap-table-versions`
- **Limit:** Keep last 20 versions (configurable)
- **Cleanup:** Oldest versions auto-pruned when limit exceeded

## Data Structure

```typescript
interface CapTableVersion {
  id: string;                    // UUID
  timestamp: number;             // Unix timestamp
  description: string;           // Auto-generated: "Added stakeholder: Alice"
  triggerType: VersionTrigger;   // 'stakeholder_added' | 'funding_added' | etc.
  snapshot: {
    stakeholders: Stakeholder[];
    fundingInstruments: FundingInstrument[];
    optionPoolPct: number;
  };
}

type VersionTrigger =
  | 'stakeholder_added'
  | 'stakeholder_removed'
  | 'funding_added'
  | 'instrument_converted'
  | 'option_pool_changed'
  | 'manual_save';
```

## Component Architecture

```
frontend/components/cap-table/history/
├── index.ts                    # Barrel exports
├── types.ts                    # Version types
├── use-version-history.ts      # Zustand store for versions
├── version-history-panel.tsx   # Slide-out panel component
├── version-list-item.tsx       # Individual version row
├── version-diff-view.tsx       # Diff comparison component
└── history-trigger-button.tsx  # Header button component
```

## Implementation Plan

### Phase 1: Core Infrastructure

1. Create types and version store
2. Implement localStorage persistence
3. Add snapshot creation logic

### Phase 2: UI Components

4. Build slide-out panel
5. Create version list with timestamps
6. Add view/restore functionality

### Phase 3: Diff View

7. Implement diff calculation logic
8. Build diff visualization component
9. Add summary generation

### Phase 4: Integration

10. Add History button to cap table header
11. Hook up auto-save triggers in cap-table-store
12. Write E2E tests

## Testing Strategy

- Unit tests for diff calculation
- Unit tests for version store operations
- Component tests for panel UI
- E2E tests for full workflow
