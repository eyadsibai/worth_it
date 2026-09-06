# C1 — The Ledger: Comparison Landing and Design Foundation

**Status:** approved design, awaiting implementation plan
**Date:** 2026-08-20
**Comp:** [`assets/2026-08-20-c1-ledger-comp.html`](assets/2026-08-20-c1-ledger-comp.html) — open in a browser; it carries a language toggle (EN/AR) and a type-pairing switcher. The IBM Plex pairing is the approved one.

## 1. Context

The worth_it frontend clones Fundcy: dark glassmorphism, a lime accent, and a single ~3,000-px page where a stack of form cards faces a column of result cards. The product's verdict — the one number the user came for — sits in a small badge, and comparison between offers, the product's core job, has no spatial expression.

The redesign replaces that direction. The user split the work into three isolated sub-projects:

- **C1 (this spec):** the comparison landing, plus the design system it produces.
- **C2 (later):** the Cap Table tool restyled on C1's system, at its own route.
- **C3 (later):** the Valuation calculator and About page restyled; final cleanup.

C2 and C3 depend on C1 and not on each other. Until they land, the app runs with a redesigned landing and legacy inner pages; the team accepts that temporary inconsistency because the product has no public users yet.

Two sibling projects sit outside the redesign entirely: **A** (merge PR #295 and close the four open audit findings) and **B** (deployment). This spec depends on A: **C1 branches from master only after PR #295 merges**, because the redesign must sit on corrected math.

## 2. Goals

1. The landing states the verdict — take the offer or stay — as its visual centerpiece, with the probability behind it.
2. Comparison is the layout: offers face each other as columns, and adding an offer is a first-class action.
3. C1's surfaces ship bilingual, English and Arabic, with full RTL mirroring. (Legacy pages stay English until C2/C3 restyle and translate them — an accepted seam of the isolated-project split.)
4. C1 leaves behind a token-based design system ("The Ledger") that C2 and C3 apply without redesign.

**Non-goals:** accounts or persistence beyond localStorage; FX conversion; restyling cap-table or valuation surfaces; Eastern Arabic numerals (Western digits in both locales); changing any calculation.

## 3. Visual direction — The Ledger

A financial document, not a dashboard: paper-white ground, ink text, hairline rules instead of cards, one market-green accent, and every number in mono with tabular figures. Charts are thin ink lines with quiet green fills. Motion is a single ~200 ms settle on recompute; `prefers-reduced-motion` disables it.

### Type

| Role | Latin | Arabic | Notes |
| --- | --- | --- | --- |
| Display / verdict | IBM Plex Serif | Amiri | serif voice for sentences |
| UI labels / body | IBM Plex Sans | IBM Plex Sans Arabic | designed as one family |
| Numerals, codes | IBM Plex Mono | — (digits are Latin) | `font-variant-numeric: tabular-nums` everywhere digits align |

Fonts load through `next/font` with per-locale subsets. Arabic text never receives letter-spacing; labels that are letter-spaced uppercase in English render as plain weight-600 in Arabic.

### Color tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--paper` | `#FBFAF7` | `#151412` |
| `--ink` | `#1C1B17` | `#EDEBE4` |
| `--rule` | ink at 14% | ink at 16% |
| `--rule-strong` | ink at 32% | ink at 36% |
| `--annotation` | `#6E6B63` | `#A5A199` |
| `--green` | `#0A7A3D` | `#31A863` |
| `--green-soft` | green at 7% | green at 10% |
| `--red` | `#B42318` | `#E5544A` |

Light is the default; the existing theme toggle stays. Sign never rides on color alone — every delta carries `+`/`−` and, where space allows, a direction glyph.

### Surfaces and controls

No cards, glass, or shadows. Sections divide by hairline rules and whitespace. Inputs are typed mono values on a hairline baseline with hover steppers; preset text-chips (e.g. $10M / $50M / $100M / $500M / $1B) accompany the exit-valuation field. Sliders survive only where scrubbing is the interaction (sensitivity what-ifs). Collapsible chapters use a serif heading over a rule, not an accordion card.

## 4. Information architecture

| Route | Fate |
| --- | --- |
| `/[locale]` | **The Comparison** — the product (this spec) |
| `/[locale]/cap-table` | Cap Table tool, promoted out of the tab; legacy styling until C2 |
| `/[locale]/valuation` | unchanged until C3; the Exit Valuation field links here ("not sure? estimate it →") |
| `/[locale]/about` | unchanged until C3 |
| `/dashboard` | **deleted** — its jobs (recent scenarios, quick actions) move into the landing |
| Welcome dialog, walkthrough | **deleted** — the pre-filled sample replaces onboarding |
| Saved Scenarios panel | **deleted** — scenarios become switchable offer columns (§5) |
| Command palette (⌘K) | stays; gains "switch language", "switch offer", "load scenario" |

`/` redirects to the negotiated locale (`/en` or `/ar`); the choice persists and a header control switches it.

## 5. The landing document

Top to bottom:

1. **Masthead** — wordmark; nav (Analysis · Cap Table · Valuation · About); ⌘K; language and theme controls.
2. **Sample notice** — on first visit the document arrives filled with a labeled example ("Sample comparison — replace with your numbers · Clear the sample"). Clearing empties fields to true blanks with ghost placeholders, never `$0`.
3. **Document header** — "Offer analysis"; horizon control; simulation seed (always visible, bidi-isolated); NPV toggle.
4. **The duel** — facing columns, ruled apart:
   - **Stay** (current job): monthly salary, annual raise %, surplus-investment ROI and frequency, and the derived take-home over the chosen horizon.
   - **Offer** (one or more, each named, editable name): grant type (RSU | stock options); monthly salary; RSU → equity %, options → option count + strike price; vesting years + cliff; RSU → exit valuation, options → exit price per share; dilution toggle with stage/rounds summary; preset chips.
   - **＋ Add another offer** — dashed slot; cap of three offers plus Stay. Each offer column's header menu offers Save / Load / Duplicate / Remove; saved scenarios also load from ⌘K.
5. **The verdict band** — tinted ground between two strong rules:
   - A serif sentence with the number in mono green (or red): EN *"Take the offer — it nets you **+$22,542** in today's dollars."* / AR *«اقبل العرض — فستكسب **+$22,542** إضافية بقيمة اليوم.»* With multiple offers the sentence ranks: *"Take **Atlas** — +$22,542 over staying, +$9,100 over **Borealis**."* Sentence templates live in the locale files; the numbers come from the API.
   - A stat row: P(offer wins) · equity value at exit · cost of leaving · break-even exit.
   - A miniature fan chart (p10–p90 band, median line) echoing chapter 02.
   - Utilities: Export PDF · Share · Save scenario.
6. **Chapters** — numbered, ruled sections, each a chart or table plus one annotation paragraph that interprets rather than repeats:
   - **01 Vesting** — step chart with cliff and full-vest markers; annotation names the cliff as the risk window.
   - **02 Range of outcomes** — fan chart and percentile table (p10/p25/p50/p75/p90 of equity value and net-vs-staying); "Assumptions" disclosure holding run count, volatility, and seed re-roll; caption states runs and seed.
   - **03 Dilution** — rounds table (completed vs. projected, raise, dilution, resulting stake); appears only when dilution simulation is on.
   - **04 What would change the answer** — sensitivity prose naming the flip thresholds, labeled as a linear approximation (the audit's open finding).
   - **05 Waterfall** — appears only when preference tiers exist; otherwise one line linking to the Cap Table tool.
7. **Footer** — sample label, seed, export/share/save repeated.

### States

- **Incomplete:** the verdict band names the missing input — *"Enter the offer's equity grant to compute a verdict"* — and the phrase focuses that field on activation. Validation fires only on touched fields.
- **Computing:** stale numbers dim; a hairline progress rule runs under the verdict while the Monte Carlo WebSocket streams; values settle with the tween. The verdict region is `aria-live="polite"`.
- **Failure:** the verdict band degrades to an ink notice with a retry action; chapters keep last-good values marked *stale*. The existing typed error taxonomy supplies the copy.
- **Mobile (≤768 px):** columns stack; the verdict becomes a sticky bottom bar ("Take the offer · +$22,542", tap to expand); tables scroll inside `overflow-x` containers.

## 6. Internationalization

- **Routing:** `next-intl` with a `[locale]` segment (`en`, `ar`); `lang` and `dir` stamped on `<html>`.
- **Strings:** every UI string in `messages/en.json` / `messages/ar.json` from the first commit. No hardcoded copy, including aria-labels and error text.
- **Layout:** logical CSS only (`ps-/pe-/ms-/me-/start-/end-`, `border-inline-*`); physical direction utilities are lint-banned. RTL is then a text-direction switch, not a second layout.
- **Bidi:** seeds, dates, signed amounts, and codes render inside LTR isolates. (The comp exposed the failure: seed "184-002" displayed as "002-184" in Arabic until isolated.)
- **Charts:** SVG internals stay LTR; labels and captions localize; chart containers set `dir="ltr"` in RTL pages.
- **Numerals and dates:** Western digits in both locales; Gregorian months, localized names.
- **Currency:** a display setting, USD | SAR, stored beside the theme preference. One `formatMoney(value, {currency, locale})` built on `Intl.NumberFormat` formats every amount; values at or above $1M use compact notation ("$81.8M"). No FX conversion — amounts mean whatever currency the user typed. The stray "(SAR)" label on the current breakeven KPI disappears with the surface that carries it.

## 7. Implementation architecture

- **Tokens:** CSS custom properties in `globals.css`, both themes, wired into the Tailwind config; components consume tokens only.
- **Components:** a new `components/ledger/` family — `DuelColumn`, `Field`, `VerdictBand`, `Chapter`, `RuledTable`, `PresetChips`, `FanChart` — used by the landing. Legacy glass components remain for cap-table and valuation until C2/C3, then die.
- **Data layer unchanged:** `use-scenario-calculation.ts`, the API client, Zod schemas, error taxonomy, and the WebSocket Monte Carlo path all survive. The redesign replaces presentation.
- **One backend addition:** `MonteCarloResponse` (`backend/src/worth_it/models.py:594`) returns raw `net_outcomes` only, so today a percentile table would be computed client-side — which the project's own rule forbids. Extend the response with `percentiles` (p10/p25/p50/p75/p90 for net outcome and equity value) and `probability_offer_wins`, computed server-side, with tests. Each offer's simulation compares that offer against Stay, so the probability is per offer; the ranked multi-offer sentence orders offers by their median net outcome. The raw arrays remain for the charts.
- **Verdict composition:** localized sentence templates filled with API numbers. Winner selection and every figure come from the backend; the frontend chooses words.
- **Deletions:** `app/dashboard/`, the welcome dialog, the walkthrough, the Saved Scenarios panel, and the landing's slider-heavy form components once replaced.
- **CLAUDE.md:** replace the "Clone Fundcy exactly" mandate with a pointer to this spec and the comp; the Fundcy reference images retire.

## 8. Testing

TDD throughout, per the repo's standing rule.

- **Unit:** ledger primitives; `formatMoney` across locale × currency; bidi isolation helpers (regression: the seed-reversal bug); verdict template selection (offer wins / stay wins / ranked / incomplete).
- **Backend:** percentile and probability fields on the Monte Carlo response.
- **E2E (Playwright):** landing-flow specs rewritten against the new structure; API-health, validation, and calculation-accuracy suites survive; a new Arabic smoke spec loads `/ar`, asserts `dir="rtl"`, and sees a verdict; the PR-gating smoke subset (`playwright.yml`) updates to match.
- **Accessibility:** the axe specs in `frontend/tests/` carry over with new selectors; keyboard focus visible on every control; the verdict announces via `aria-live`.

## 9. Order of work

1. PR #295 merges (project A). C1 branches from master as `redesign/c1-ledger`.
2. Foundation: locale routing, tokens, fonts, `formatMoney`, lint rule for logical properties.
3. Ledger primitives with unit tests.
4. The landing: duel → verdict band → chapters, states as they become reachable.
5. Backend Monte Carlo response extension.
6. Deletions, CLAUDE.md update, E2E rewrite, Arabic smoke, a11y pass.

No feature flag: the branch replaces the landing outright and merges when the suites pass.

## 10. References

- Live comp: <https://claude.ai/code/artifact/b3b31723-32b2-4a0e-afff-1088f4423cb2> (same file as the asset above)
- Production-readiness audit: [`docs/production-readiness-audit.md`](../../production-readiness-audit.md) — §4 open findings, §6 roadmap item 2 (offer-vs-offer as primary flow)
