# Fix Layout Shift When Switching App Modes

**Issue:** #241
**Date:** 2025-12-20
**Status:** Approved

## Problem

When switching between Founder and Employee modes, the page layout shifts abruptly and elements appear to shake. This creates a jarring user experience.

**Root causes:**

- Employee mode uses 2-column grid (`grid-cols-[380px_1fr]`)
- Founder mode uses full-width fragment layout
- Complete DOM swap forces full layout recalculation
- Scrollbar appearing/disappearing shifts content by ~15px

## Solution

### 1. Animation Architecture

Use Framer Motion's `AnimatePresence` with `mode="wait"` for crossfade transitions.

**Mode Content Wrapper:**

- Exit: Opacity 0, slight scale down (0.98)
- Enter: Opacity 1, scale 1
- Duration: 200-250ms with easeOut

**Text Transition Component:**

- Uses `AnimatePresence` with `mode="popLayout"`
- Crossfades text when `appMode` changes
- Duration: 150ms (faster than content)

**Stable Container:**

- Hero Section wrapper remains static
- Only children (text) animate
- Mode toggle stays completely fixed

### 2. Layout Stabilization

**Scrollbar Gutter:**

```css
html {
  scrollbar-gutter: stable;
}
```

**Content Container:**

- Both dashboards render inside shared container
- `min-height` prevents collapse during transition
- No structural changes to individual dashboard layouts

### 3. File Changes

| File | Changes |
|------|---------|
| `frontend/app/globals.css` | Add `scrollbar-gutter: stable` (~2 lines) |
| `frontend/app/page.tsx` | Add AnimatePresence wrappers (~30-40 lines) |
| `frontend/lib/motion.tsx` | New reusable text transition component (~25 lines) |

**No changes to:**

- EmployeeDashboard (internal layout unchanged)
- FounderDashboard (internal layout unchanged)
- ModeToggle (stays as-is)
- AppShell (no modifications)

### 4. Testing Strategy

**Manual Testing:**

1. Switch between modes multiple times rapidly
2. Verify no layout shift in Hero Section
3. Confirm smooth crossfade (~250ms)
4. Test on different viewport widths
5. Verify scrollbar stability

**Automated Testing:**

- Unit tests for AnimatedText component
- Respect `prefers-reduced-motion` for accessibility

**Browser Testing:**

- Chrome, Firefox, Safari
- Verify scrollbar-gutter support

## Acceptance Criteria

- [ ] No layout shift when switching modes
- [ ] Smooth crossfade transition on content
- [ ] Hero Section (title/toggle) remains stable
- [ ] Scrollbar doesn't cause horizontal shift
- [ ] Respects prefers-reduced-motion
