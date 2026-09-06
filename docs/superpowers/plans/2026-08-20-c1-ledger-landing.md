# C1 — The Ledger Comparison Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page with a bilingual (EN/AR, full RTL) offer-vs-offer comparison document in the Ledger visual system, backed by server-computed Monte Carlo statistics.

**Architecture:** A new `app/[locale]/` route tree (next-intl) hosts a rebuilt landing composed of `components/ledger/` primitives styled by CSS tokens in `globals.css` (Tailwind v4, CSS-first). The existing data layer — `use-scenario-calculation.ts`, the API client, the WebSocket Monte Carlo hook — survives unchanged except for schema extensions. The backend gains percentiles and a win probability on the Monte Carlo response, computed in the router from arrays the engine already produces.

**Tech Stack:** Next.js 16 (App Router, Turbopack), next-intl, Tailwind v4 CSS-first, next/font (IBM Plex family + Amiri), zustand 5, TanStack Query 5, react-hook-form + zod 4, Vitest + Testing Library, Playwright; FastAPI + Pydantic 2 + NumPy on the backend, uv + pytest.

**Spec:** `docs/superpowers/specs/2026-08-20-c1-ledger-comparison-design.md` (the design comp is `docs/superpowers/specs/assets/2026-08-20-c1-ledger-comp.html` — open it in a browser; the approved type pairing is IBM Plex).

## Global Constraints

- Work on branch `redesign/c1-ledger`. **Before the final verification task, PR #295 must be merged and this branch rebased onto `master`** — the redesign must sit on corrected math. Do not merge C1 before that rebase.
- Frontend package manager is **pnpm** (`packageManager: pnpm@10.29.2`). Never npm or yarn. Backend is **uv** (`uv run pytest`, `uv add`). Never pip or bare python.
- TDD for every task: failing test → implement → pass → commit.
- ESLint `@typescript-eslint/no-magic-numbers` is an **error** (only 0, 1, -1 allowed; `enforceConst`) — every numeric literal in new non-test code needs a named `const`. Tests and `*.config.*` files are exempt.
- `@typescript-eslint/no-explicit-any` is an error; `tsconfig` is strict.
- All UI strings live in `messages/en.json` and `messages/ar.json` — no hardcoded copy, including `aria-label`s. Western digits in both locales (`-u-nu-latn`).
- Layout uses **logical** Tailwind utilities only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, `border-s`, `border-e`, `rounded-s`, `rounded-e`) — a lint rule added in Task 3 enforces this.
- New components consume the Ledger CSS tokens (`bg-paper`, `text-ink`, `border-rule`, `text-market`, `text-loss`, `text-annotation`) — never raw hex in components.
- Backend: ruff line-length 100, target py314; pyright `src/` must stay clean; pytest runs with `--strict-markers` and **no markers are registered** — do not introduce `@pytest.mark.*`.
- The seed-contract suites (`backend/tests/test_request_bounds.py::TestMonteCarloSeedPlumbing`, `backend/tests/test_router_offload_and_seed_contract.py::TestSeedContractHoldsOnBothTransports`) assert exact REST↔WS equality of `net_outcomes`/`simulated_valuations` — they must stay green untouched.
- Commits: Conventional Commits (a commit-msg hook enforces this), ending with the trailer line `Eyad SibAI <eyad.alsibai@gmail.com>`.
- Pre-commit hooks run prettier + full eslint + full `tsc --noEmit` on any `frontend/**/*.ts(x)` change and markdownlint on docs; if a hook modifies files, `git add` and commit again.
- Do not push or merge anything without the user's say-so.

## File Structure (end state)

```
frontend/
├── middleware.ts                          # next-intl locale negotiation (new)
├── i18n/
│   ├── routing.ts                         # locales: en, ar (new)
│   ├── navigation.ts                      # Link/redirect/usePathname/useRouter wrappers (new)
│   └── request.ts                         # per-request messages loader (new)
├── messages/
│   ├── en.json                            # every UI string (new)
│   └── ar.json                            # Arabic translations, key-parity enforced by test (new)
├── app/
│   ├── globals.css                        # + Ledger tokens in @theme/:root/.dark (modified)
│   └── [locale]/
│       ├── layout.tsx                     # root layout: html lang/dir, IBM Plex fonts, providers (new; replaces app/layout.tsx)
│       ├── page.tsx                       # the comparison landing (rewritten)
│       ├── cap-table/page.tsx             # FounderDashboard, legacy styling (new home)
│       ├── valuation/page.tsx             # moved unchanged
│       └── about/page.tsx                 # moved unchanged
├── components/ledger/                     # the design system C2/C3 inherit (all new)
│   ├── money.tsx                          # bidi-safe currency display
│   ├── field.tsx                          # typed value input on a hairline baseline
│   ├── chapter.tsx                        # numbered serif heading + rule
│   ├── ruled-table.tsx
│   ├── preset-chips.tsx
│   ├── outcome-band.tsx                   # p10–p90 band + median (the honest "fan chart")
│   ├── verdict-band.tsx
│   ├── stay-column.tsx
│   ├── offer-column.tsx
│   ├── add-offer-slot.tsx
│   ├── masthead.tsx
│   ├── sample-notice.tsx
│   └── chapters/
│       ├── vesting-chapter.tsx
│       ├── outcomes-chapter.tsx
│       ├── dilution-chapter.tsx
│       ├── sensitivity-chapter.tsx
│       └── waterfall-chapter.tsx
├── lib/ledger/
│   ├── format-money.ts                    # the ONE money formatter
│   └── verdict.ts                         # pure verdict selection
└── lib/store.ts                           # + offers[], displayCurrency (modified)

backend/src/worth_it/
├── monte_carlo.py                         # + "payout_values" in both return dicts (modified)
├── models.py                              # + MonteCarloPercentiles, 3 response fields (modified)
└── api/routers/monte_carlo.py             # + _percentiles helper, REST + WS enrichment (modified)

Deleted: frontend/app/dashboard/, frontend/app/layout.tsx, frontend/app/page.tsx (old),
frontend/components/onboarding/welcome-modal.tsx usage + file, walkthrough wiring,
frontend/components/dashboard/employee-dashboard.tsx (after Task 13), playwright/tests/24-dashboard.spec.ts,
playwright/tests/25-walkthrough.spec.ts.
```

---

### Task 0: Preflight

**Files:** none.

- [ ] **Step 1:** `git switch redesign/c1-ledger && git pull --ff-only || true`. Confirm `git log --oneline -1` shows the spec commit (`docs: add the C1 Ledger comparison-landing design spec`) or later.
- [ ] **Step 2:** Check whether PR #295 has merged: `gh pr view 295 --json state -q .state`. If `MERGED`, run `git fetch origin master && git rebase origin/master` now. If still `OPEN`, proceed — but Task 17 blocks until the rebase happens.
- [ ] **Step 3:** `cd frontend && pnpm install --frozen-lockfile` and `cd backend && uv sync`. Both must succeed before any task starts.

---

### Task 1: Backend — percentiles and win probability on the Monte Carlo response

**Files:**

- Modify: `backend/src/worth_it/monte_carlo.py` (return dicts at ~398-401 and ~530-533)
- Modify: `backend/src/worth_it/models.py` (near line 594)
- Modify: `backend/src/worth_it/api/routers/monte_carlo.py` (REST handler ~98-102, WS complete ~199-206)
- Test: `backend/tests/test_api.py`, `backend/tests/test_router_offload_and_seed_contract.py`

**Interfaces:**

- Consumes: `run_monte_carlo_simulation(...) -> dict[str, np.ndarray]` (existing).
- Produces: `MonteCarloResponse` gains `net_outcome_percentiles: MonteCarloPercentiles | None`, `payout_percentiles: MonteCarloPercentiles | None`, `probability_offer_wins: float | None`; `MonteCarloPercentiles` has `p10, p25, p50, p75, p90: float`. The WS `complete` message carries the same three keys. Frontend tasks 5/8/12 rely on these exact names.

- [ ] **Step 1: Write the failing tests** — append to `backend/tests/test_api.py` (reuse the request body from `test_monte_carlo_simulation` at :307, plus `"seed": 20260820`):

```python
def test_monte_carlo_returns_percentiles_and_win_probability():
    """The response carries server-computed statistics (spec C1 §7)."""
    request_data = {
        "num_simulations": 200,
        "seed": 20260820,
        "base_params": {
            "exit_year": 5, "current_job_monthly_salary": 10000.0,
            "startup_monthly_salary": 8000.0, "current_job_salary_growth_rate": 0.03,
            "annual_roi": 0.05, "investment_frequency": "Annually", "failure_probability": 0.25,
            "startup_params": {"equity_type": "RSU", "monthly_salary": 8000.0,
                "total_equity_grant_pct": 5.0, "vesting_period": 4, "cliff_period": 1,
                "exit_valuation": 20_000_000.0, "simulate_dilution": False,
                "dilution_rounds": None},
        },
        "sim_param_configs": {"exit_valuation": {"min": 10_000_000.0, "max": 30_000_000.0}},
    }
    response = client.post("/api/monte-carlo", json=request_data)
    assert response.status_code == 200
    data = response.json()

    outcomes = np.array(data["net_outcomes"])
    pct = data["net_outcome_percentiles"]
    assert pct["p10"] <= pct["p25"] <= pct["p50"] <= pct["p75"] <= pct["p90"]
    assert pct["p50"] == pytest.approx(float(np.percentile(outcomes, 50)))
    assert data["probability_offer_wins"] == pytest.approx(float((outcomes > 0).mean()))
    ppct = data["payout_percentiles"]
    assert ppct["p10"] <= ppct["p50"] <= ppct["p90"]
    assert ppct["p10"] >= 0.0  # payouts are floored at zero
```

Add `import numpy as np` and `import pytest` at the top of `test_api.py` if absent. Also append a WS-parity test to `backend/tests/test_router_offload_and_seed_contract.py` inside `TestSeedContractHoldsOnBothTransports`, reusing its `_monte_carlo_payload` and `_run_websocket` helpers:

```python
    def test_websocket_complete_carries_the_same_statistics_as_rest(self) -> None:
        payload = _monte_carlo_payload(num_simulations=300, seed=424242)
        rest = client.post("/api/monte-carlo", json=payload).json()
        streamed = self._run_websocket(payload)
        assert streamed["net_outcome_percentiles"] == rest["net_outcome_percentiles"]
        assert streamed["payout_percentiles"] == rest["payout_percentiles"]
        assert streamed["probability_offer_wins"] == rest["probability_offer_wins"]
```

- [ ] **Step 2: Run to verify both fail.** `cd backend && uv run pytest tests/test_api.py::test_monte_carlo_returns_percentiles_and_win_probability tests/test_router_offload_and_seed_contract.py -v` — expect KeyError/assertion failures on the new keys.
- [ ] **Step 3: Expose payout values from the engine.** In `monte_carlo.py`, the vectorized path (return at ~398-401) becomes:

```python
    return {
        "net_outcomes": net_outcomes,
        "simulated_valuations": exit_price,
        "payout_values": final_payout_value,
    }
```

In the iterative path (return at ~530-533), add the same `"payout_values"` key pointing at the per-simulation gross payout array — the array multiplied into `net_outcomes` before opportunity cost is subtracted (expected local name `final_payout_value`; if the loop stores it under another name, use the array feeding the payout term, never recompute). Both paths must return the same three keys.

- [ ] **Step 4: Add the models.** In `models.py`, directly above `MonteCarloResponse` (line ~594):

```python
class MonteCarloPercentiles(BaseModel):
    """Fixed percentile summary of one simulated distribution."""

    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class MonteCarloResponse(BaseModel):
    """Response model for Monte Carlo simulation."""

    net_outcomes: list[float]
    simulated_valuations: list[float]
    seed: int | None = Field(default=None, description="Seed that reproduces this run")
    net_outcome_percentiles: MonteCarloPercentiles | None = None
    payout_percentiles: MonteCarloPercentiles | None = None
    probability_offer_wins: float | None = Field(
        default=None, ge=0.0, le=1.0,
        description="Share of simulations where the offer beats staying (net outcome > 0)",
    )
```

- [ ] **Step 5: Enrich the router.** In `api/routers/monte_carlo.py`, import `MonteCarloPercentiles`, add module-level:

```python
PERCENTILE_LEVELS = (10, 25, 50, 75, 90)


def _percentiles(values: np.ndarray) -> MonteCarloPercentiles:
    p10, p25, p50, p75, p90 = (float(np.percentile(values, q)) for q in PERCENTILE_LEVELS)
    return MonteCarloPercentiles(p10=p10, p25=p25, p50=p50, p75=p75, p90=p90)
```

REST handler return (replacing ~98-102):

```python
        net_outcomes = results["net_outcomes"]
        return MonteCarloResponse(
            net_outcomes=net_outcomes.tolist(),
            simulated_valuations=results["simulated_valuations"].tolist(),
            seed=seed,
            net_outcome_percentiles=_percentiles(net_outcomes),
            payout_percentiles=_percentiles(results["payout_values"]),
            probability_offer_wins=float((net_outcomes > 0).mean()),
        )
```

WS `complete` message (at ~199-206) gains the same three keys:

```python
        net_outcomes = results["net_outcomes"]
        await websocket.send_json({
            "type": "complete",
            "net_outcomes": net_outcomes.tolist(),
            "simulated_valuations": results["simulated_valuations"].tolist(),
            "seed": seed,
            "net_outcome_percentiles": _percentiles(net_outcomes).model_dump(),
            "payout_percentiles": _percentiles(results["payout_values"]).model_dump(),
            "probability_offer_wins": float((net_outcomes > 0).mean()),
        })
```

- [ ] **Step 6: Run the new tests.** Same command as Step 2 — expect PASS.
- [ ] **Step 7: Run the full backend gate.** `uv run ruff check --fix src/ tests/ && uv run pytest -q && uv run pyright src/`. The two seed-contract suites must be green.
- [ ] **Step 8: Commit.**

```bash
git add backend/src/worth_it/monte_carlo.py backend/src/worth_it/models.py backend/src/worth_it/api/routers/monte_carlo.py backend/tests/
git commit -m "feat(backend): return percentiles and win probability from Monte Carlo

Eyad SibAI <eyad.alsibai@gmail.com>"
```

---

### Task 2: Locale routing — next-intl, the [locale] tree, and message files

**Files:**

- Create: `frontend/i18n/routing.ts`, `frontend/i18n/navigation.ts`, `frontend/i18n/request.ts`, `frontend/middleware.ts`, `frontend/messages/en.json`, `frontend/messages/ar.json`, `frontend/app/[locale]/layout.tsx`
- Move: `frontend/app/page.tsx` → `frontend/app/[locale]/page.tsx`; `frontend/app/valuation/page.tsx` → `frontend/app/[locale]/valuation/page.tsx`; `frontend/app/about/page.tsx` → `frontend/app/[locale]/about/page.tsx`
- Delete: `frontend/app/layout.tsx`, `frontend/app/dashboard/` (spec §4: the dashboard dies; its E2E spec dies in Task 16)
- Modify: `frontend/next.config.ts` (wrap with `createNextIntlPlugin`), `frontend/components/layout/header.tsx` (nav hrefs via `i18n/navigation`)
- Test: `frontend/__tests__/lib/messages-parity.test.ts`

**Interfaces:**

- Produces: `routing` (locales `["en","ar"]`, defaultLocale `"en"`); `Link`, `useRouter`, `usePathname`, `redirect` from `@/i18n/navigation` — every internal link in later tasks imports these, never `next/link`. Message namespaces used later: `masthead`, `landing`, `verdict`, `duel`, `chapters`, `states`.

- [ ] **Step 1: Install.** `cd frontend && pnpm add next-intl`
- [ ] **Step 2: Write the failing parity test** — `frontend/__tests__/lib/messages-parity.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

type Tree = { [key: string]: string | Tree };
const flatten = (node: Tree, prefix = ""): string[] =>
  Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`)
  );

describe("message catalogs", () => {
  it("ar covers exactly the keys en defines", () => {
    expect(flatten(ar as Tree).sort()).toEqual(flatten(en as Tree).sort());
  });
  it("en has no empty strings", () => {
    const empties = flatten(en as Tree).filter((k) =>
      k.split(".").reduce<unknown>((n, part) => (n as Tree)[part], en) === ""
    );
    expect(empties).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it** — `pnpm test:unit __tests__/lib/messages-parity.test.ts` — FAILS (modules missing).
- [ ] **Step 4: Create the i18n plumbing.**

`i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});
```

`i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

`i18n/request.ts`:

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
```

`middleware.ts`:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
```

`next.config.ts`: wrap the existing export — `import createNextIntlPlugin from "next-intl/plugin"; const withNextIntl = createNextIntlPlugin(); export default withNextIntl(existingConfig);` (keep every existing option).

- [ ] **Step 5: Seed the message files.** `messages/en.json` starts with the masthead + shared strings (later tasks extend both files together — the parity test enforces it):

```json
{
  "masthead": {
    "analysis": "Analysis",
    "capTable": "Cap Table",
    "valuation": "Valuation",
    "about": "About",
    "search": "Search",
    "language": "Language",
    "theme": "Theme"
  },
  "landing": {
    "title": "Offer analysis",
    "horizon": "Horizon",
    "seed": "Simulation seed",
    "npvToggle": "Today's dollars (NPV)"
  }
}
```

`messages/ar.json` (Western digits stay; Arabic copy from the approved comp):

```json
{
  "masthead": {
    "analysis": "التحليل",
    "capTable": "جدول الملكية",
    "valuation": "التقييم",
    "about": "حول",
    "search": "بحث",
    "language": "اللغة",
    "theme": "المظهر"
  },
  "landing": {
    "title": "تحليل العرض",
    "horizon": "الأفق",
    "seed": "بذرة المحاكاة",
    "npvToggle": "بدولارات اليوم (NPV)"
  }
}
```

- [ ] **Step 6: Build the locale layout and move the pages.**

```bash
git mv "frontend/app/page.tsx" "frontend/app/[locale]/page.tsx"
git mv "frontend/app/valuation" "frontend/app/[locale]/valuation"
git mv "frontend/app/about" "frontend/app/[locale]/about"
git rm -r "frontend/app/dashboard"
git rm "frontend/app/layout.tsx"   # after copying its content into [locale]/layout.tsx
```

`app/[locale]/layout.tsx` — port everything from the old `app/layout.tsx` (fonts stay Inter/JetBrains/Noto for now; Task 3 swaps them), with these changes: it is `async`, receives `params: Promise<{ locale: string }>`, validates via `hasLocale(routing.locales, locale)` → `notFound()`, calls `setRequestLocale(locale)`, renders `<html lang={locale} dir={getTextDirection(locale)} suppressHydrationWarning>` (**drop the hardcoded `className="dark"`** — Task 3 finishes the theme change), wraps children in `<NextIntlClientProvider>` inside the existing `Providers`, and exports `generateStaticParams()` returning `routing.locales.map((locale) => ({ locale }))`. `getTextDirection` already exists at `lib/i18n-utils.ts:14`.

- [ ] **Step 7: Point the header at locale-aware navigation.** In `components/layout/header.tsx`, replace `import Link from "next/link"` with `import { Link } from "@/i18n/navigation"` and replace the literal nav labels with `useTranslations("masthead")` calls (`t("analysis")` etc.). Remove the `/dashboard` link if present.
- [ ] **Step 8: Verify.** `pnpm test:unit __tests__/lib/messages-parity.test.ts` PASSES; `pnpm type-check` clean; `pnpm build` succeeds; `pnpm dev` then manually confirm `curl -s -o /dev/null -w '%{redirect_url}' http://localhost:3000/` redirects to `/en` and `http://localhost:3000/ar` responds 200 with `dir="rtl"` in the HTML.
- [ ] **Step 9: Run the whole unit suite** — `pnpm test:unit`. Fix any test that imported the moved pages by path (update imports, not behavior). Tests for the deleted dashboard page get deleted with it: `git rm` any `__tests__/**/dashboard-page*` file that exists solely for `app/dashboard`.
- [ ] **Step 10: Commit.**

```bash
git add -A frontend
git commit -m "feat(frontend): add en/ar locale routing and retire the dashboard route

Eyad SibAI <eyad.alsibai@gmail.com>"
```

---

### Task 3: Ledger tokens, IBM Plex + Amiri fonts, light default, logical-property lint

**Files:**

- Modify: `frontend/app/globals.css` (add Ledger tokens to `@theme inline`, `:root`, `.dark`), `frontend/app/[locale]/layout.tsx` (fonts), `frontend/lib/providers.tsx` (ThemeProvider default), `frontend/eslint.config.mjs` (logical-utilities rule)

**Interfaces:**

- Produces: Tailwind utilities `bg-paper`, `text-ink`, `border-rule`, `border-rule-strong`, `text-annotation`, `text-market`, `bg-market-soft`, `text-loss`, `font-serif`, `font-sans`, `font-mono`. Every later component uses these names.

- [ ] **Step 1:** Append to `@theme inline` in `globals.css`:

```css
  --color-paper: var(--paper);
  --color-ink: var(--ink);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  --color-annotation: var(--annotation);
  --color-market: var(--market);
  --color-market-soft: var(--market-soft);
  --color-loss: var(--loss);
  --font-serif: var(--font-plex-serif), var(--font-amiri), Georgia, serif;
```

and change the existing font lines to fall through to Arabic faces:

```css
  --font-sans: var(--font-plex-sans), var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), var(--font-plex-arabic), ui-monospace, monospace;
```

Add to `:root` (spec §3 values):

```css
  --paper: #fbfaf7;
  --ink: #1c1b17;
  --rule: rgb(28 27 23 / 0.14);
  --rule-strong: rgb(28 27 23 / 0.32);
  --annotation: #6e6b63;
  --market: #0a7a3d;
  --market-soft: rgb(10 122 61 / 0.07);
  --loss: #b42318;
```

Add to `.dark`:

```css
  --paper: #151412;
  --ink: #edebe4;
  --rule: rgb(237 235 228 / 0.16);
  --rule-strong: rgb(237 235 228 / 0.36);
  --annotation: #a5a199;
  --market: #31a863;
  --market-soft: rgb(49 168 99 / 0.1);
  --loss: #e5544a;
```

Also add one RTL guard to `@layer base`: `[dir="rtl"] .tracking-eyebrow { letter-spacing: 0.02em; }` plus the utility `@layer utilities { .tracking-eyebrow { letter-spacing: 0.14em; } }` — labels use `.tracking-eyebrow` instead of `tracking-widest` so Arabic stays untracked.

- [ ] **Step 2: Swap the fonts** in `app/[locale]/layout.tsx`:

```ts
import { Amiri, IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, IBM_Plex_Serif } from "next/font/google";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans" });
const plexSerif = IBM_Plex_Serif({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-plex-serif" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], variable: "--font-plex-arabic" });
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri" });
```

Body className becomes `` `${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} ${plexArabic.variable} ${amiri.variable} antialiased` ``. Delete the Inter/JetBrains_Mono/Noto_Sans_Arabic declarations.

- [ ] **Step 3: Light by default.** In `lib/providers.tsx` change `defaultTheme="system"` to `defaultTheme="light"` (keep `enableSystem` so users can still choose System). Confirm no other file re-adds a `dark` class to `<html>` (`grep -rn '"dark"' frontend/app frontend/lib/providers.tsx`).
- [ ] **Step 4: Lint rule for logical utilities.** Add an override block to `eslint.config.mjs` (after the existing overrides):

```js
  {
    files: ["components/ledger/**/*.tsx", "app/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(^|[\\s'\"])(ml-|mr-|pl-|pr-|border-l(-|\\s|$)|border-r(-|\\s|$)|rounded-l|rounded-r|text-left|text-right|left-[0-9]|right-[0-9])/]",
          message:
            "Physical direction utility — use logical ones (ms-/me-/ps-/pe-/border-s/border-e/rounded-s/rounded-e/text-start/text-end/start-/end-) so RTL mirrors for free.",
        },
      ],
    },
  },
```

- [ ] **Step 5: Prove the rule bites.** Create a scratch file `components/ledger/_lint-probe.tsx` containing `export const probe = <div className="ml-4" />;` plus the React import, run `pnpm lint` — expect the new error — then delete the probe file. (This is the test for a lint rule; no unit test applies.)
- [ ] **Step 6: Verify.** `pnpm lint && pnpm type-check && pnpm build`; `pnpm dev` and confirm the app boots **light** with IBM Plex rendering (inspect any heading's computed font-family), and `/ar` shows IBM Plex Sans Arabic for Arabic text.
- [ ] **Step 7: Commit** — `git add -A frontend && git commit -m "feat(frontend): add Ledger tokens, IBM Plex/Amiri fonts, light default, logical-utility lint` + trailer as usual.

---

### Task 4: formatMoney and the display-currency setting

**Files:**

- Create: `frontend/lib/ledger/format-money.ts`
- Modify: `frontend/lib/store.ts` (displayCurrency + persistence)
- Test: `frontend/__tests__/lib/ledger/format-money.test.ts`, extend `frontend/__tests__/lib/store.test.ts` if it exists (create otherwise)

**Interfaces:**

- Produces: `formatMoney(value: number, opts: { currency: DisplayCurrency; locale: string; signed?: boolean; compact?: boolean }): string`; `type DisplayCurrency = "USD" | "SAR"`; store: `displayCurrency: DisplayCurrency`, `setDisplayCurrency(c: DisplayCurrency): void`, selector `useDisplayCurrency()`. Tasks 5+ format ALL money through this — never `formatCurrency` from `format-utils.ts` in ledger components.

- [ ] **Step 1: Failing tests** — `__tests__/lib/ledger/format-money.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatMoney } from "@/lib/ledger/format-money";

describe("formatMoney", () => {
  it("formats whole USD in English", () => {
    expect(formatMoney(22542, { currency: "USD", locale: "en" })).toBe("$22,542");
  });
  it("adds an explicit plus when signed", () => {
    expect(formatMoney(22542, { currency: "USD", locale: "en", signed: true })).toBe("+$22,542");
  });
  it("compacts at one million and above", () => {
    expect(formatMoney(81_810_164, { currency: "USD", locale: "en" })).toBe("$81.8M");
  });
  it("never compacts below the threshold", () => {
    expect(formatMoney(999_999, { currency: "USD", locale: "en" })).toBe("$999,999");
  });
  it("uses Western digits in Arabic", () => {
    const out = formatMoney(22542, { currency: "SAR", locale: "ar" });
    expect(out).toMatch(/22/);
    expect(out).not.toMatch(/[٠-٩]/);
  });
  it("keeps the minus sign for losses when signed", () => {
    expect(formatMoney(-82985, { currency: "USD", locale: "en", signed: true })).toMatch(/^-\$82,985$/);
  });
});
```

- [ ] **Step 2:** `pnpm test:unit __tests__/lib/ledger/format-money.test.ts` — FAILS (module not found).
- [ ] **Step 3: Implement** `lib/ledger/format-money.ts`:

```ts
export type DisplayCurrency = "USD" | "SAR";

export interface FormatMoneyOptions {
  currency: DisplayCurrency;
  locale: string;
  signed?: boolean;
  compact?: boolean;
}

const COMPACT_THRESHOLD = 1_000_000;
const COMPACT_FRACTION_DIGITS = 1;

export function formatMoney(value: number, options: FormatMoneyOptions): string {
  const { currency, locale, signed = false } = options;
  const compact = options.compact ?? Math.abs(value) >= COMPACT_THRESHOLD;
  const formatter = new Intl.NumberFormat(`${locale}-u-nu-latn`, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: compact ? COMPACT_FRACTION_DIGITS : 0,
    ...(compact ? { notation: "compact" as const, compactDisplay: "short" as const } : {}),
    ...(signed ? { signDisplay: "exceptZero" as const } : {}),
  });
  return formatter.format(value);
}
```

If the compact test yields `"$81.81M"`, set `maximumSignificantDigits: 3` for the compact branch instead of fraction digits and re-run — lock whichever produces `"$81.8M"`.

- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5: Store setting.** In `lib/store.ts`: add `displayCurrency: DisplayCurrency` (initial `"USD"`), action `setDisplayCurrency`, include `displayCurrency` in the `partialize` block (key `worth-it-app-state` is versioned by zustand persist — bump `version` and provide a `migrate` that defaults the field), and export `export const useDisplayCurrency = () => useAppStore((s) => s.displayCurrency);`. Test: setting persists through `useAppStore.getState().setDisplayCurrency("SAR")` → `getState().displayCurrency === "SAR"`.
- [ ] **Step 6:** `pnpm test:unit && pnpm type-check` clean.
- [ ] **Step 7: Commit** — `feat(frontend): add formatMoney and the USD|SAR display-currency setting`.

---

### Task 5: Frontend Monte Carlo contract — schemas and the WS hook

**Files:**

- Modify: `frontend/lib/schemas.ts` (:285-289 request, :345-349 response), `frontend/lib/api-client.ts` (WS `complete` handling in `useMonteCarloWebSocket`, ~:921)
- Test: `frontend/__tests__/lib/schemas-monte-carlo.test.ts`

**Interfaces:**

- Consumes: Task 1's wire fields.
- Produces: `MonteCarloPercentilesSchema`; `MonteCarloResponseSchema` gains `seed`, `net_outcome_percentiles`, `payout_percentiles`, `probability_offer_wins` (all optional/nullable); `MonteCarloRequestSchema` gains `seed: z.number().int().min(0).optional()`. `MonteCarloWSResult.result` carries the new fields. Tasks 8/12 read `result.net_outcome_percentiles?.p50` etc.

- [ ] **Step 1: Failing test** — `__tests__/lib/schemas-monte-carlo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { MonteCarloResponseSchema } from "@/lib/schemas";

const percentiles = { p10: -82985, p25: -40185, p50: 22542, p75: 127215, p90: 289615 };

describe("MonteCarloResponseSchema", () => {
  it("accepts the enriched backend payload", () => {
    const parsed = MonteCarloResponseSchema.parse({
      net_outcomes: [1, 2],
      simulated_valuations: [3, 4],
      seed: 20260820,
      net_outcome_percentiles: percentiles,
      payout_percentiles: { ...percentiles, p10: 0 },
      probability_offer_wins: 0.64,
    });
    expect(parsed.net_outcome_percentiles?.p50).toBe(22542);
    expect(parsed.probability_offer_wins).toBe(0.64);
  });
  it("still accepts the legacy two-field payload", () => {
    const parsed = MonteCarloResponseSchema.parse({ net_outcomes: [], simulated_valuations: [] });
    expect(parsed.seed ?? null).toBeNull();
  });
});
```

- [ ] **Step 2:** Run — FAILS (unknown keys are stripped but `net_outcome_percentiles` comes back undefined → first assertion fails).
- [ ] **Step 3: Extend `schemas.ts`:**

```ts
export const MonteCarloPercentilesSchema = z.object({
  p10: z.number(), p25: z.number(), p50: z.number(), p75: z.number(), p90: z.number(),
});
export type MonteCarloPercentiles = z.infer<typeof MonteCarloPercentilesSchema>;

export const MonteCarloResponseSchema = z.object({
  net_outcomes: z.array(z.number()),
  simulated_valuations: z.array(z.number()),
  seed: z.number().int().nullable().optional(),
  net_outcome_percentiles: MonteCarloPercentilesSchema.nullable().optional(),
  payout_percentiles: MonteCarloPercentilesSchema.nullable().optional(),
  probability_offer_wins: z.number().min(0).max(1).nullable().optional(),
});
```

Add `seed: z.number().int().min(0).optional()` to `MonteCarloRequestSchema`.

- [ ] **Step 4:** In `useMonteCarloWebSocket` (`api-client.ts` ~:921), find where the `complete` message becomes `result` and make it parse via `MonteCarloResponseSchema.parse(message)` (excluding the `type` key) so the new fields flow through typed; on parse failure fall through to the existing error path — do not swallow.
- [ ] **Step 5:** Tests PASS; `pnpm type-check` clean; `pnpm test:unit` full suite green (existing WS hook tests may need the new optional fields added to fixtures — extend fixtures, don't weaken assertions).
- [ ] **Step 6: Commit** — `feat(frontend): extend Monte Carlo schemas with seed, percentiles, win probability`.

---

### Task 6: Ledger primitives — Money, Field, Chapter, RuledTable, PresetChips

**Files:**

- Create: `frontend/components/ledger/money.tsx`, `field.tsx`, `chapter.tsx`, `ruled-table.tsx`, `preset-chips.tsx`
- Test: `frontend/__tests__/components/ledger/money.test.tsx`, `field.test.tsx`, `chapter.test.tsx`, `preset-chips.test.tsx`

**Interfaces:**

- Consumes: `formatMoney`, `useDisplayCurrency` (Task 4); `useLocale` from next-intl.
- Produces:
  - `<Money value={number} signed?: boolean className?: string />` — renders `<bdi dir="ltr">` with mono tabular text.
  - `<Field label={string} value={number|null} onValueChange={(v: number|null) => void} unit?: string hint?: string error?: string min?: number max?: number step?: number />` — typed number input on a hairline baseline; hint renders in annotation color; `error` only shows once the field has been touched (blur), matching spec §5 states.
  - `<Chapter index={string} title={string} sub?: ReactNode>{children}</Chapter>` — `<section>` with serif `<h2>`, mono index, bottom rule, `sub` pushed to the inline end.
  - `<RuledTable head={ReactNode[]} align?: ("start"|"end")[]>{rows}</RuledTable>` — table with eyebrow `<th>`s and hairline row rules; numeric columns get `text-end font-mono tabular-nums`.
  - `<PresetChips options={{label: string; value: number}[]} selected?: number onSelect={(v: number) => void} />`.

Tests-first for each (all four test files before implementing). Representative tests the executor must include:

- [ ] **Step 1: Failing tests.** Money:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { Money } from "@/components/ledger/money";

const wrap = (ui: React.ReactNode, locale = "en") => render(
  <NextIntlClientProvider locale={locale} messages={{}}>{ui}</NextIntlClientProvider>
);

describe("Money", () => {
  it("renders a signed amount inside an LTR isolate", () => {
    wrap(<Money value={22542} signed />);
    const bdi = screen.getByText("+$22,542");
    expect(bdi.tagName).toBe("BDI");
    expect(bdi).toHaveAttribute("dir", "ltr");
  });
});
```

Field (user-event): typing `12000` then blur calls `onValueChange(12000)`; clearing calls `onValueChange(null)`; `error` text is absent before first blur and present after. Chapter: renders `<h2>` with the title, the index text, and `role`-discoverable section. PresetChips: clicking a chip fires `onSelect(100_000_000)` and the selected chip carries `aria-pressed="true"`.

- [ ] **Step 2:** Run all four — FAIL (modules missing).
- [ ] **Step 3: Implement.** `money.tsx`:

```tsx
"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/ledger/format-money";
import { useDisplayCurrency } from "@/lib/store";

interface MoneyProps {
  value: number;
  signed?: boolean;
  className?: string;
}

export function Money({ value, signed = false, className }: MoneyProps) {
  const locale = useLocale();
  const currency = useDisplayCurrency();
  return (
    <bdi dir="ltr" className={cn("font-mono tabular-nums", className)}>
      {formatMoney(value, { currency, locale, signed })}
    </bdi>
  );
}
```

`field.tsx` — controlled input, internal string state, parse on blur (`Number` with empty → `null`), `touched` state gating the error line, structure:

```tsx
<label className="flex items-baseline justify-between gap-4 border-b border-rule py-2">
  <span className="text-sm text-annotation">{label}</span>
  <span className="flex items-baseline gap-1">
    <input
      inputMode="decimal"
      className="w-28 bg-transparent text-end font-mono text-sm tabular-nums text-ink outline-none focus-visible:border-b focus-visible:border-market"
      ...
    />
    {unit ? <span className="text-xs text-annotation">{unit}</span> : null}
  </span>
</label>
{touched && error ? <p role="alert" className="py-1 text-xs text-loss">{error}</p> : null}
{hint && !(touched && error) ? <p className="py-1 text-xs text-annotation">{hint}</p> : null}
```

`chapter.tsx` — `<section aria-labelledby={id}>`, head row `flex items-baseline gap-3 border-b border-ink pb-2`, `<span className="font-mono text-xs text-annotation">{index}</span>`, `<h2 id={id} className="font-serif text-2xl font-medium">{title}</h2>`, `sub` in `ms-auto text-xs text-annotation`. `ruled-table.tsx` and `preset-chips.tsx` follow the same token vocabulary (chips: `border border-rule px-2 py-0.5 font-mono text-xs rounded-sm aria-pressed:border-market aria-pressed:text-market aria-pressed:bg-market-soft`). All layout classes logical (`ms-`, `text-start`/`text-end`).

- [ ] **Step 4:** All primitive tests PASS; `pnpm lint` (the logical-utility rule now polices these files) and `pnpm type-check` clean.
- [ ] **Step 5: Commit** — `feat(frontend): add Ledger primitives (Money, Field, Chapter, RuledTable, PresetChips)`.

---

### Task 7: OutcomeBand — the honest fan chart

The Monte Carlo result is a terminal distribution (outcomes at exit), not a time series, so the "fan" renders as a horizontal p10–p90 band with an emphasized median — visually echoing the comp without fabricating time paths. Note this divergence from the comp is deliberate (data honesty); the comp's time-fan was stylized.

**Files:**

- Create: `frontend/components/ledger/outcome-band.tsx`
- Test: `frontend/__tests__/components/ledger/outcome-band.test.tsx`

**Interfaces:**

- Consumes: `MonteCarloPercentiles` type (Task 5), `Money` (Task 6).
- Produces: `<OutcomeBand percentiles={MonteCarloPercentiles} ariaLabel={string} />` — an SVG spanning p10→p90 (fill `--market-soft`), inner p25→p75 (stronger fill), a median line at p50 colored market/loss by sign, zero-line tick when 0 ∈ [p10, p90], `<Money>` labels at both ends and the median.

- [ ] **Step 1: Failing test:** renders with `role="img"` and the given aria-label; median label shows `+$22,542`; with all-negative percentiles the median label carries the loss color class (`text-loss`).
- [ ] **Step 2:** FAIL. **Step 3:** implement (pure SVG; linear scale from p10..p90 padded 8%; constants named: `BAND_WIDTH = 280`, `BAND_HEIGHT = 56`, `PAD_RATIO = 0.08`). Wrap the SVG in `<div dir="ltr">` so RTL pages keep the value axis left-to-right (spec §6). **Step 4:** PASS + lint/type-check. **Step 5: Commit** — `feat(frontend): add OutcomeBand distribution chart`.

---

### Task 8: Verdict — pure selection logic, then the VerdictBand

**Files:**

- Create: `frontend/lib/ledger/verdict.ts`, `frontend/components/ledger/verdict-band.tsx`
- Modify: `frontend/messages/en.json` + `ar.json` (namespace `verdict`)
- Test: `frontend/__tests__/lib/ledger/verdict.test.ts`, `frontend/__tests__/components/ledger/verdict-band.test.tsx`

**Interfaces:**

- Consumes: `OutcomeBand`, `Money`, percentiles from Task 5.
- Produces:

```ts
export interface OfferOutcome {
  id: string;
  name: string;
  complete: boolean;
  missingField: "salary" | "equity" | "exit" | null;
  medianNet: number | null;      // MC p50 when available, deterministic net benefit otherwise
}
export type VerdictState =
  | { kind: "incomplete"; offerName: string; missingField: "salary" | "equity" | "exit" }
  | { kind: "take-offer"; offerName: string; medianNet: number; runnersUp: { name: string; delta: number }[] }
  | { kind: "stay"; bestOfferName: string; bestMedianNet: number };
export function selectVerdict(offers: OfferOutcome[]): VerdictState;
```

`<VerdictBand verdict={VerdictState} stats={{ probabilityOfferWins: number | null; equityAtExit: number | null; costOfLeaving: number | null; breakevenLabel: string | null }} percentiles={MonteCarloPercentiles | null} onFocusMissing={() => void} />` — Task 13 mounts it; the sentence area is `aria-live="polite"`.

- [ ] **Step 1: Failing logic tests** (`verdict.test.ts`): one per branch —

```ts
const offer = (over: Partial<OfferOutcome>): OfferOutcome => ({
  id: "a", name: "Atlas", complete: true, missingField: null, medianNet: 22542, ...over,
});

it("takes the best offer and ranks the rest", () => {
  const v = selectVerdict([offer({}), offer({ id: "b", name: "Borealis", medianNet: 13442 })]);
  expect(v).toEqual({ kind: "take-offer", offerName: "Atlas", medianNet: 22542,
    runnersUp: [{ name: "Borealis", delta: 9100 }] });
});
it("stays when every offer loses", () => {
  const v = selectVerdict([offer({ medianNet: -5000 })]);
  expect(v.kind).toBe("stay");
});
it("reports the first incomplete offer's missing field", () => {
  const v = selectVerdict([offer({ complete: false, missingField: "equity", medianNet: null })]);
  expect(v).toEqual({ kind: "incomplete", offerName: "Atlas", missingField: "equity" });
});
it("throws on an empty offer list", () => {
  expect(() => selectVerdict([])).toThrow();
});
```

- [ ] **Step 2:** FAIL. **Step 3:** implement `selectVerdict` (sort complete offers by `medianNet` desc; deltas = best − each runner-up). **Step 4:** PASS.
- [ ] **Step 5: Message keys** (both catalogs; ICU interpolation via next-intl `t.rich`):

`en.json` → `"verdict": { "takeOffer": "Take {offer} — it nets you {amount} in today's dollars.", "takeOfferRanked": "Take {offer} — {amount} over staying, {delta} over {runnerUp}.", "stay": "Stay — {offer} comes up {amount} short of your current job.", "incomplete": "Enter {field} for {offer} to compute a verdict.", "fields": { "salary": "the monthly salary", "equity": "the equity grant", "exit": "the exit valuation" }, "stats": { "probability": "P(offer wins)", "equityAtExit": "Equity at exit", "costOfLeaving": "Cost of leaving", "breakeven": "Break-even exit" }, "basis": "Median of {runs} simulated outcomes over {years} years, after dilution, against staying and investing the salary difference." }`

`ar.json` → `"verdict": { "takeOffer": "اقبل {offer} — فستكسب {amount} إضافية بقيمة اليوم.", "takeOfferRanked": "اقبل {offer} — {amount} فوق البقاء، و{delta} فوق {runnerUp}.", "stay": "ابقَ في وظيفتك — {offer} يقل عنها بمقدار {amount}.", "incomplete": "أدخل {field} لعرض {offer} لحساب الحكم.", "fields": { "salary": "الراتب الشهري", "equity": "منحة الأسهم", "exit": "تقييم التخارج" }, "stats": { "probability": "احتمال تفوق العرض", "equityAtExit": "قيمة الأسهم عند التخارج", "costOfLeaving": "تكلفة ترك الوظيفة", "breakeven": "تخارج التعادل" }, "basis": "وسيط {runs} نتيجة محاكاة على مدى {years} سنوات، بعد التخفيف، مقارنةً بالبقاء مع استثمار فرق الراتب." }`

- [ ] **Step 6: Failing component test** (`verdict-band.test.tsx`): renders take-offer state → serif sentence contains "+$22,542" inside a `<bdi>`; `aria-live="polite"` present; incomplete state renders a button whose click fires `onFocusMissing`.
- [ ] **Step 7:** Implement `verdict-band.tsx`: tinted section (`bg-gradient-to-b from-market-soft to-transparent border-y border-ink`), `<h2 className="font-serif text-4xl font-medium leading-tight text-balance">` with `t.rich("verdict.takeOffer", { amount: () => <Money value={...} signed className="text-market" /> , offer: ... })`; stat row of four labeled `<Money>`/text stats (loss color when negative); `<OutcomeBand>` on the inline-end side behind a `border-s border-rule ps-7`; the incomplete branch renders the sentence as a `<button>` styled as prose. Sizes/paddings as named constants where numeric.
- [ ] **Step 8:** PASS; parity test still green (`pnpm test:unit`). **Step 9: Commit** — `feat(frontend): add verdict selection and the VerdictBand`.

---

### Task 9: Store — multiple named offers and draft v2

**Files:**

- Modify: `frontend/lib/store.ts`, `frontend/lib/hooks/use-draft-auto-save.ts`
- Test: `frontend/__tests__/lib/store-offers.test.ts`

**Interfaces:**

- Consumes: existing `RSUForm | StockOptionsForm` types from `lib/schemas`.
- Produces:

```ts
export interface Offer { id: string; name: string; equityDetails: RSUForm | StockOptionsForm | null; }
// store additions:
offers: Offer[];                                  // initial: [{ id: uuid, name: "Offer A"-equivalent from messages at render time — store keeps "" and UI shows default }],
addOffer(): boolean;                              // false when at MAX_OFFERS (3)
removeOffer(id: string): void;                    // keeps at least one offer
renameOffer(id: string, name: string): void;
setOfferEquityDetails(id: string, details: RSUForm | StockOptionsForm | null): void;
```

The legacy singular `equityDetails` field REMAINS until Task 15 deletes the legacy dashboard (both read paths coexist; the landing reads `offers`, legacy components keep reading `equityDetails`). Draft shape becomes `{ version: 2, globalSettings, currentJob, offers }`; version-1 drafts are dropped on read (precedent: commit 03ad7f9).

- [ ] **Step 1: Failing tests:** `addOffer` caps at 3 (returns false on the 4th, `MAX_OFFERS` exported); `removeOffer` refuses to empty the list (removing the last offer is a no-op); `renameOffer` updates only the target; offers are included in `partialize` (persist round-trip via `useAppStore.persist.getOptions().partialize(state)` snapshot contains `offers`).
- [ ] **Step 2:** FAIL. **Step 3:** implement store changes (persist `version` bump + `migrate` seeding `offers` from legacy `equityDetails` when present — a v1→v2 migration keeps the user's single scenario as Offer A). **Step 4:** PASS.
- [ ] **Step 5:** Update `use-draft-auto-save.ts` to write/read draft v2 (`offers` array instead of `equityDetails`); its unit tests updated the same way — old-shape drafts must parse to `null` (dropped), asserted in a test.
- [ ] **Step 6:** Full unit suite + type-check green. **Step 7: Commit** — `feat(frontend): support up to three named offers with v2 drafts`.

---

### Task 10: The duel — StayColumn, OfferColumn, AddOfferSlot

**Files:**

- Create: `frontend/components/ledger/stay-column.tsx`, `offer-column.tsx`, `add-offer-slot.tsx`
- Modify: `frontend/messages/en.json` + `ar.json` (namespace `duel`)
- Test: `frontend/__tests__/components/ledger/stay-column.test.tsx`, `offer-column.test.tsx`

**Interfaces:**

- Consumes: `Field`, `PresetChips`, `Money` (Task 6); store state/actions (`globalSettings`, `currentJob` setters exist; `offers` from Task 9); `useScenarioCalculation` (existing, unchanged).
- Produces:
  - `<StayColumn />` — reads/writes `currentJob` + `globalSettings` via existing store actions; fields: monthly salary, annual raise %, surplus ROI % + frequency select; footer line "take-home over the horizon" using `opportunityCost` final value when available.
  - `<OfferColumn offerId={string} onOutcome={(o: OfferOutcome) => void} onScenarioData={(id: string, r: ScenarioCalculationResult) => void} />` — editable name, grant-type toggle (RSU | Options, existing form field sets), the per-type `Field`s, exit-valuation `PresetChips` (`$10M/$50M/$100M/$500M/$1B` as `PRESET_EXIT_VALUATIONS` const), a "not sure what it's worth? estimate it →" `Link` to `/valuation` under the exit-valuation field (key `duel.estimateValuation`, spec §4), and dilution toggle + summary line. Internally calls `useScenarioCalculation({ globalSettings, currentJob, equityDetails: offer.equityDetails })` and reports upward through `onOutcome` in a `useEffect` keyed on the derived values (derive `medianNet` = `final_payout_value(_npv) − final_opportunity_cost(_npv)` per the NPV toggle; MC refines it later in Task 12 for the leading offer). `complete`/`missingField` derive from which required field is null/zero.
  - `<AddOfferSlot />` — dashed slot, disabled at cap, calls `addOffer()`.
- Produces for Task 13: the landing wires columns in a grid `grid-cols-[1fr_1fr_150px]` (stacking on mobile via `max-md:grid-cols-1`).

- [ ] **Step 1: Failing tests.** StayColumn: renders the three fields with translated labels; typing a salary calls the store setter (spy via `useAppStore.setState`). OfferColumn: renders name input; switching grant type swaps the field set (options shows strike-price field, RSU shows equity-% field); with `equityDetails` missing equity → `onOutcome` reports `{ complete: false, missingField: "equity" }`. Mock `useScenarioCalculation` (the repo already mocks it in `__tests__/components/dashboard/employee-dashboard.test.tsx` — copy that pattern).
- [ ] **Step 2:** FAIL. **Step 3:** implement the three components with ledger tokens, logical utilities, `duel.*` message keys in both catalogs (labels: monthlySalary, annualRaise, surplusRoi, investFrequency, takeHome, offerName, grantType, rsu, options, equityGrant, optionCount, strikePrice, vesting, cliff, exitValuation, exitPricePerShare, dilutionToExit, addOffer, removeOffer, stay, currentJob, startupTag). **Step 4:** PASS + lint + type-check. **Step 5: Commit** — `feat(frontend): add the Stay/Offer duel columns`.

---

### Task 11: Chapters — Vesting, Dilution, Sensitivity, Waterfall pointer

**Files:**

- Create: `frontend/components/ledger/chapters/vesting-chapter.tsx`, `dilution-chapter.tsx`, `sensitivity-chapter.tsx`, `waterfall-chapter.tsx`
- Modify: `messages/*.json` (namespace `chapters`)
- Test: `frontend/__tests__/components/ledger/chapters/*.test.tsx` (one per chapter)

**Interfaces:**

- Consumes: `Chapter`, `RuledTable`, `Money`; scenario data via props (Task 13 passes the leading offer's `ScenarioCalculationResult` down — chapters never fetch).
- Produces: `<VestingChapter monthlyData={...} vestingPeriod={number} cliffPeriod={number} exitYear={number} />` (Recharts `AreaChart` styled by tokens: stroke `var(--market)`, fill `var(--market-soft)`, hairline grid `var(--rule)`, mono tick labels; wrapped `dir="ltr"`); `<DilutionChapter rounds={DilutionRoundForm[]} totalDilution={number | null} dilutedEquityPct={number | null} />` (RuledTable; renders only when dilution simulation is on — parent gates); `<SensitivityChapter result={...} currentJob={...} equityDetails={...} />` (reuses `lib/sensitivity-utils` thresholds; the copy includes the approximation label from `chapters.sensitivity.approximation`); `<WaterfallChapter hasTiers={boolean} />` (one-line pointer to the Cap Table route via `Link` from `@/i18n/navigation` when no tiers).

- [ ] **Step 1: Failing tests** — each chapter renders its `Chapter` heading with translated title and its core content: vesting asserts an `svg` exists and the cliff annotation text renders; dilution asserts one row per round plus the resulting-stake column; sensitivity asserts the approximation label is present; waterfall asserts the link targets `/cap-table` when `hasTiers` is false.
- [ ] **Step 2:** FAIL. **Step 3:** implement (chapter numbers "01"–"04" as displayed strings come from the parent, not hardcoded). **Step 4:** PASS. **Step 5: Commit** — `feat(frontend): add vesting, dilution, sensitivity, waterfall chapters`.

---

### Task 12: Outcomes chapter — Monte Carlo integration with seed and assumptions

**Files:**

- Create: `frontend/components/ledger/chapters/outcomes-chapter.tsx`
- Modify: `messages/*.json` (`chapters.outcomes`)
- Test: `frontend/__tests__/components/ledger/chapters/outcomes-chapter.test.tsx`

**Interfaces:**

- Consumes: `useMonteCarloWebSocket` (existing, results now typed by Task 5), `OutcomeBand`, `RuledTable`, `Money`; base params built with the existing request-shaping used by `components/forms/monte-carlo-form.tsx` (reuse its param-assembly helper if exported; otherwise lift that assembly into `lib/ledger/monte-carlo-request.ts` and have both call it — do not duplicate).
- Produces: `<OutcomesChapter globalSettings currentJob equityDetails onPercentiles={(p: MonteCarloPercentiles | null, probability: number | null, seed: number | null) => void} />` — runs the simulation over WS on demand ("Run 10,000 simulations" action; `DEFAULT_RUNS = 10_000` const), renders: percentile RuledTable (rows p10/p25/p50/p75/p90 with labels weak exit/median/strong exit; columns equity value = `payout_percentiles`, net vs staying = `net_outcome_percentiles`), the `OutcomeBand`, a caption with runs + seed (`<bdi dir="ltr">{seed}</bdi>` — the bidi regression), an "Assumptions" `<details>` disclosure holding the runs input and a re-roll seed button, and a thin progress rule (`<div role="progressbar">` with width from `progress.percentage`) while `isRunning`. Calls `onPercentiles` when a result lands — Task 13 feeds this into the verdict.

- [ ] **Step 1: Failing test** — mock `useMonteCarloWebSocket` to return a completed `result` with the Task 5 fixture; assert: the table renders `+$22,542` in the median row, the seed renders inside `<bdi dir="ltr">`, and `onPercentiles` was called with the percentiles and probability.
- [ ] **Step 2:** FAIL. **Step 3:** implement. **Step 4:** PASS + full suite. **Step 5: Commit** — `feat(frontend): add the Monte Carlo outcomes chapter`.

---

### Task 13: Landing assembly — the comparison document

**Files:**

- Create: `frontend/components/ledger/masthead.tsx`, `sample-notice.tsx`
- Rewrite: `frontend/app/[locale]/page.tsx`
- Modify: `messages/*.json` (`landing`, `states` namespaces), `frontend/lib/store.ts` only if `loadExample` needs an offers-shaped example (extend the existing example to seed `offers[0]`)
- Test: `frontend/__tests__/app/landing-page.test.tsx`

**Interfaces:**

- Consumes: everything above.
- Produces the page, top to bottom (spec §5): Masthead (wordmark, nav links Analysis/Cap Table/Valuation/About via `@/i18n/navigation`, ⌘K button reusing the existing command-palette open action, language switcher — a `Link` to the same pathname in the other locale — and the existing ThemeToggle plus a currency select bound to `setDisplayCurrency`); SampleNotice (visible while `sampleActive`; "Clear the sample" empties `currentJob`/`globalSettings`/offers to nulls); document header (title, horizon `Field`, seed display once known, NPV toggle bound to the existing NPV state); the duel grid; `VerdictBand` (fed by `selectVerdict` over per-offer `OfferOutcome`s — MC p50/probability override the leading offer's deterministic numbers when `OutcomesChapter` reports them); chapters 01–05 gated on data presence; footer. **First visit** (`use-first-visit`'s `worth_it_onboarded` key): instead of the modal, call `loadExample` and show the SampleNotice; the WelcomeModal import and render are REMOVED from the page. Failure state: when `useScenarioCalculation().error` is set, VerdictBand renders the `states.failure` notice with a retry button wired to `retry()`.

- [ ] **Step 1: Failing test** — renders the page inside providers with mocked `useScenarioCalculation` + WS hook: asserts the two column headings render (`Stay` / offer name), the verdict sentence appears, the sample notice shows on first visit, and no `dialog` is present (the modal is gone).
- [ ] **Step 2:** FAIL. **Step 3:** implement, moving the old `page.tsx` content aside entirely — `FounderDashboard`/`ModeToggle` usage leaves this file (Task 14 gives the founder side its route). Grid: `grid gap-0 border-t border-ink md:grid-cols-[1fr_1fr_10rem]` with columns `border-e border-rule` — all logical. Mobile: verdict stats collapse into a sticky bottom bar (`fixed bottom-0 inset-x-0 border-t border-ink bg-paper p-3 md:hidden`) showing the sentence's short form + `<Money>`. Computing state (spec §5): while `isFetching` is true, wrap the verdict sentence and chapter values in `className={cn(isFetching && "opacity-60 transition-opacity")}` — stale numbers dim rather than disappear; no spinners, no skeletons.
- [ ] **Step 4:** PASS; `pnpm dev` manual check EN + AR: duel mirrors, verdict reads correctly in both, sample notice clears, computing state shows the progress rule (throttle network to observe). **Step 5: Commit** — `feat(frontend): replace the landing with the Ledger comparison document`.

---

### Task 14: Cap Table route and masthead completion

**Files:**

- Create: `frontend/app/[locale]/cap-table/page.tsx`
- Modify: `frontend/components/command-palette.tsx` (navigation entries), `frontend/components/layout/bottom-nav.tsx` (route links)
- Test: extend `frontend/__tests__/app/landing-page.test.tsx` sibling: `cap-table-page.test.tsx`

**Interfaces:**

- Consumes: existing `FounderDashboard` (unchanged, legacy styling).
- Produces: `/[locale]/cap-table` rendering `<FounderDashboard />` under the new Masthead; command palette gains "Cap Table", "Valuation", "Switch language" commands via `useRouter` from `@/i18n/navigation`.

- [ ] **Step 1: Failing test:** the cap-table page renders `FounderDashboard`'s top-level heading (mock heavy children as the dashboard tests do).
- [ ] **Step 2:** FAIL → implement (`"use client"` page: Masthead + FounderDashboard; the old `ModeToggle` component is no longer rendered anywhere). **Step 3:** PASS. **Step 4:** manual check `/en/cap-table` works, founder flows unaffected. **Step 5: Commit** — `feat(frontend): give the cap-table tool its own route`.

---

### Task 15: Deletions and documentation

**Files:**

- Delete: `frontend/components/onboarding/welcome-modal.tsx` (+ its tests), `frontend/components/dashboard/employee-dashboard.tsx` (+ its tests), the walkthrough wiring (`WalkthroughProvider`/`WalkthroughOverlay` usage in `lib/providers.tsx`, then `frontend/components/walkthrough/` and `lib/walkthrough/` if nothing else imports them — verify with `grep -rn "walkthrough" frontend --include="*.tsx" --include="*.ts" -il`), the Saved Scenarios panel component (locate via `grep -rn "Saved Scenarios" frontend/components`), and `frontend/components/mode-toggle.tsx`
- Modify: `CLAUDE.md` (root) and `frontend/CLAUDE.md` — replace the "Clone Fundcy exactly"/design-references mandate with: "Design reference: `docs/superpowers/specs/2026-08-20-c1-ledger-comparison-design.md` and its comp asset. The Fundcy references are retired."; fix the documented coverage threshold (functions: 60, matching `vitest.config.ts`)
- Test: the full unit suite is the test.

- [ ] **Step 1:** Delete each file; after each deletion run `pnpm type-check` — any survivor import is fixed by removing the dead usage, never by resurrecting the file.
- [ ] **Step 2:** `pnpm test:unit` full green (delete tests that exist solely for deleted components; keep and fix any test asserting still-live behavior).
- [ ] **Step 3:** Update both CLAUDE.md files.
- [ ] **Step 4: Commit** — `refactor(frontend): delete the onboarding modal, walkthrough, legacy dashboard, and mode toggle` + a separate `docs: point CLAUDE.md at the Ledger design reference`.

---

### Task 16: E2E — rewrite the landing suites, Arabic smoke, helpers

**Files:**

- Modify: `frontend/tests/ux-improvements.spec.ts` (onboarding-modal tests → sample-notice tests), `frontend/tests/empty-state-actions.spec.ts` (focus lands on the equity `Field` input, not a slider), `frontend/tests/accessibility.spec.ts` (selector updates only — the axe pass itself is unchanged), `frontend/tests/basic-ui.spec.ts` (unchanged expected; verify), `playwright/utils/helpers.ts` (`fillCurrentJobForm`, `fillRSUForm`, `fillStockOptionsForm`, `dismissWelcomeDialog` → no-op removal, selectors for `Field` inputs by accessible name), `.github/workflows/playwright.yml` (add the Arabic smoke spec to `SMOKE_SPECS`)
- Create: `playwright/tests/33-arabic-rtl-smoke.spec.ts`
- Delete: `playwright/tests/24-dashboard.spec.ts`, `playwright/tests/25-walkthrough.spec.ts`
- Update: the smoke trio `01-api-health` (should pass untouched), `05-rsu-scenario-flow`, `09-waterfall-analysis` — selector updates to drive the new duel (via helpers, so most changes concentrate in `helpers.ts`)

**Interfaces:** none new — this task makes the gates describe the new product.

- [ ] **Step 1: Arabic smoke spec** (write first — it fails against nothing yet only if the app is broken):

```ts
import { test, expect } from "@playwright/test";

test.describe("Arabic locale smoke", () => {
  test("the Arabic landing renders RTL with a verdict area", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { name: "تحليل العرض" })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').first()).toBeVisible();
  });
});
```

- [ ] **Step 2:** Update `helpers.ts` selectors: salary/equity fields are now reached by `getByLabel` with the translated English labels (helpers stay EN; only the smoke spec above uses AR). `dismissWelcomeDialog` becomes a no-op and every call site is removed (the fixture's `page.goto` wrapper in `playwright/fixtures/base.ts:19` drops the dialog-dismissal logic).
- [ ] **Step 3:** Rewrite the `ux-improvements` onboarding describe into "Sample comparison": first visit shows the sample notice; "Clear the sample" empties the salary field; no `dialog` ever appears. `empty-state-actions`: after clearing, the verdict sentence names the missing field and clicking it focuses the matching input (`toBeFocused()` on the equity `Field` input).
- [ ] **Step 4:** Run locally: `./scripts/run-e2e-tests.sh playwright/tests/01-api-health.spec.ts playwright/tests/05-rsu-scenario-flow.spec.ts playwright/tests/09-waterfall-analysis.spec.ts playwright/tests/33-arabic-rtl-smoke.spec.ts` — all green. Then `cd frontend && pnpm test:e2e` for the five frontend specs (chromium project is enough locally: `--project=chromium`).
- [ ] **Step 5:** Add `playwright/tests/33-arabic-rtl-smoke.spec.ts` to `SMOKE_SPECS` in `.github/workflows/playwright.yml`.
- [ ] **Step 6: Commit** — `test(e2e): describe the Ledger landing, add the Arabic RTL smoke gate`.

---

### Task 17: Final verification

**Files:** none new.

- [ ] **Step 1: The rebase gate.** PR #295 must be merged by now (coordinate with the user if not — this task BLOCKS). `git fetch origin master && git rebase origin/master`; resolve conflicts favoring master's math fixes; rerun everything below after the rebase.
- [ ] **Step 2: Full gates.** Backend: `uv run ruff check src/ tests/ && uv run pytest -q && uv run pyright src/`. Frontend: `pnpm lint && pnpm type-check && pnpm test:unit:coverage` (thresholds: lines 70 / functions 60 / branches 70 / statements 70 must hold) `&& pnpm build`. E2E: `./scripts/run-e2e-tests.sh` (full root suite) and `cd frontend && pnpm test:e2e --project=chromium`.
- [ ] **Step 3: Live bilingual walkthrough.** Boot both servers; in a real browser: EN landing (sample → verdict → clear → incomplete state → refill → chapters), AR landing (mirroring, verdict sentence, seed not reversed — the "184-002" class of bug), currency switch USD→SAR reformats every amount, theme toggle light↔dark holds contrast, mobile viewport (390px) stacks with the sticky verdict bar. Screenshot each state for the PR description.
- [ ] **Step 4:** Report results to the user with the screenshots. Do NOT push or open a PR without their go-ahead.

---

## Self-Review Notes (kept for the executor)

- Spec §5's "offer column header menu: Save / Load / Duplicate / Remove" is deliberately thinned in this plan to **rename / remove / add** (Task 9/10) with save-load via the existing `comparisonScenarios` machinery deferred to the utilities row wiring in Task 13; if the utilities row's "Save scenario" proves to need more than the existing store action, stop and surface it rather than expanding scope silently.
- Spec §7 named the components `DuelColumn`; the plan splits it into `StayColumn`/`OfferColumn` — same responsibility, clearer boundaries. `FanChart` became `OutcomeBand` for data honesty (Task 7 explains).
- The NPV toggle state: `use-scenario-calculation` already returns both nominal and `_npv` values; the toggle is landing-local UI state (Task 13), defaulting ON to match today's behavior.
- Export/Share utilities reuse `components/results/export-menu.tsx` as-is inside the verdict band's utilities row; restyling it is C2/C3-adjacent polish, not C1 scope.
