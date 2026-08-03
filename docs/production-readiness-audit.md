# Production Readiness Audit

Generated 2026-08-02 by a 286-agent audit workflow: three recon scouts mapped the
codebase, a planner selected 11 review dimensions from what they found, live `lcli`
quality gates were executed (3 of 8 passing), every finding faced 1–3 adversarial
verifiers instructed to refute it, and two gap-hunt rounds chased uncovered ground.
83 findings survived verification: 7 blockers, 19 high, 38 medium, 19 low.

The three math blockers and the render-loop blocker were independently re-verified
against the source before this report was filed.

---

## 1. Verdict

**NO-GO.** Not for security reasons — the honest read on posture is that this is a stateless calculator with no auth, no database, no PII, and nothing to steal, and the audit did not find anything that justifies launch-blocking panic on that axis. The blocker is simpler and worse: **the product's headline numbers are wrong.** A stock-options scenario runs its Monte Carlo with the exit valuation substituted for price-per-share (`backend/src/worth_it/services/serializers.py:142` feeding `backend/src/worth_it/monte_carlo.py:305`), inflating outcomes by roughly seven orders of magnitude. RSU vesting is computed off a lost DataFrame index (`backend/src/worth_it/services/startup_service.py:145`), so every scenario vests a full year late — a 4-year grant at a 4-year exit reports 75% vested. The Waterfall panel returns HTTP 400 for any cap table containing a preferred stakeholder, because the frontend never assigns stakeholders to tiers (`frontend/components/cap-table/waterfall-analysis.tsx:63`, `frontend/components/cap-table/preference-stack-editor.tsx:93`) and the engine then divides preferred shares by a common-only denominator (`backend/src/worth_it/calculations/waterfall_engine.py:320`). An app whose entire value proposition is "here is the number, is this offer worth it" cannot ship while the number is wrong and one of its three analysis surfaces is dead on arrival. The good news is that this is a short, bounded list — seven concrete defects, most of them one-to-five-line fixes, in a codebase that is otherwise well-layered and genuinely well-tested. This is a two-to-three-day NO-GO, not a rewrite.

## 2. Launch blockers

**1. Stock-options Monte Carlo consumes exit valuation as price-per-share**
`backend/src/worth_it/services/serializers.py:142` — `"exit_price_per_share": "valuation",  # Maps to same key as exit_valuation`. Both RSU's `exit_valuation` and options' `exit_price_per_share` collapse into one internal key, and `backend/src/worth_it/monte_carlo.py:305` consumes it per-share: `profit_per_share = np.maximum(0, sim_params["valuation"] - options_params.get("strike_price", 0))`. **Failure:** a $50M exit with 10,000 options at a $1 strike yields ~$5e11 instead of ~$490K. Every options user sees a fantasy number, and the simulation's percentile bands, breakeven, and "worth it" verdict are all built on it. **Fix:** give options a distinct internal key (`price_per_share`) in `_VARIABLE_PARAM_TO_INTERNAL_KEY` and branch on `equity_type` in `monte_carlo.py` so RSU reads a valuation and options reads a share price. Add a regression test asserting an options scenario's median net outcome sits within the same order of magnitude as the deterministic result.

**2. Lost pandas index shifts all vesting one year late**
`backend/src/worth_it/services/startup_service.py:145` — `opportunity_cost_df = pd.DataFrame(opportunity_cost_data)` rebuilds the frame from `to_dict(orient="records")` output with no `set_index`, producing a 0-based `RangeIndex`. `backend/src/worth_it/calculations/startup_scenario.py:66-71` then derives vesting positionally: `years = results_df.index` / `np.where(years >= cliff_years, np.clip((years / total_vesting_years) * 100, 0, 100), 0)`. **Failure:** year 1 lands at index 0, below a 1-year cliff, and reports 0% vested; a 4-year exit on a 4-year vest reports 75% (750,000 of 1,000,000 shares). Every payout, net outcome, and breakeven year is understated. It also silently desynchronizes the PDF export from the Monte Carlo mean. **Fix:** `set_index("year")` (or restore the index explicitly) at `startup_service.py:145`, and assert `results_df.index[0] == 1` in `startup_scenario.py` so the contract can never be re-broken by a serialization round-trip.

**3. Waterfall returns HTTP 400 for any cap table with preferred stock**
`backend/src/worth_it/calculations/waterfall_engine.py:320` sets `shares_for_remaining = common_shares` and only adds tier shares for converted or participating tiers. Any preferred stakeholder not attached to a tier falls through to the common branch at `:356` (`share_pct = s["shares"] / shares_for_remaining`), dividing by a denominator that excludes its own shares — `share_pct` exceeds 1.0. Separately, `:372` pays converted preferred `share_pct * self.exit_valuation` while common is paid from `remaining`, double-counting proceeds already consumed by senior preferences. Totals exceed the exit, `common_pct` at `:445` exceeds 100, and `backend/src/worth_it/models.py:719` (`Field(..., ge=0, le=100)`) raises a `ValidationError` — a `ValueError` subclass caught at `backend/src/worth_it/api/routers/cap_table.py:150` and re-raised as `CalculationError`. This is guaranteed to fire because the UI *never* populates tiers: both `frontend/components/cap-table/waterfall-analysis.tsx:63` and `frontend/components/cap-table/preference-stack-editor.tsx:93` hardcode `stakeholder_ids: []`. **Fix:** include all non-tiered preferred shares in `shares_for_remaining`; change `:372` to `share_pct * remaining`; add a stakeholder-picker to the tier editor so `stakeholder_ids` is actually populated; add an engine invariant asserting `sum(payouts) <= exit_valuation + epsilon`.

**4. Frontend recomputes dilution and masks a backend contract mismatch**
`frontend/components/results/scenario-results.tsx:42-55` defines `calculateTotalDilutionFromRounds`, reading `round.dilution_pct`, and `:173` prefers it over the API: `const displayTotalDilution = calculatedTotalDilution ?? displayResults.total_dilution;`. The backend's `DilutionRound` TypedDict (`backend/src/worth_it/types.py:14-33`) uses `dilution` as a 0-1 fraction, while `frontend/lib/hooks/use-scenario-calculation.ts:165` sends `dilution_pct` already divided by 100. **Failure:** the card shows a large dilution percentage next to a payout figure that was computed without it — internally contradictory advice on the primary results screen — and it violates the project's own rule that no business logic lives in the frontend. **Fix:** delete `calculateTotalDilutionFromRounds`, render `displayResults.total_dilution` only, and reconcile the `dilution_pct` / `dilution` field name across `types.py`, `models.py`, and `frontend/lib/schemas.ts`.

**5. TanStack mutation objects in effect dependency arrays cause unbounded request loops**
`frontend/components/cap-table/dilution-preview.tsx:62` lists `dilutionMutation` in the deps of the effect that calls `dilutionMutation.mutate(...)`; `frontend/components/scenarios/scenario-comparison.tsx:72` does the same with `compareMutation`. The mutation result object is a new identity on every state transition, so mutate → state change → effect → mutate. **Failure:** opening either panel pins a CPU core and floods the backend (measured ~700 req/s) until the tab is closed; with a shared rate-limit key this takes the API down for everyone. **Fix:** drop the mutation object from both dep arrays — `waterfall-analysis.tsx:92-94` already does exactly this with the correct comment ("mutate is stable"); apply the same treatment. Add an ESLint guard or a test that asserts one mutate call per input change.

**6. Unauthenticated SSRF and indefinite event-loop stall in PDF export**
`backend/src/worth_it/api/routers/export.py:123` — `async def export_first_chicago(...)` calls `pdf_bytes = generate_pdf_report(report_data)` inline on the event loop. `company_name` (`backend/src/worth_it/models.py:1108`, `Field(..., description=...)` with no `max_length`, no `pattern`, no validator) flows unescaped into ReportLab `Paragraph` markup, where `<img src="http://169.254.169.254/...">` is parsed and fetched via `urlopen`. `_safe_filename` only replaces spaces and slashes, so quotes and CRLF survive into the `Content-Disposition` header. `grep -c "limiter" backend/src/worth_it/api/routers/export.py` returns **0** — the only router with no rate limiting at all. **Failure:** one unauthenticated POST reaches internal network endpoints from the server, and a `src` pointing at a non-responsive host blocks the entire worker indefinitely (ReportLab's `trustedHosts` guard is inert when unset). **Fix:** constrain `company_name` with `max_length` and a `pattern`, HTML-escape it before it reaches `Paragraph`, harden `_safe_filename` against quotes and control characters, move `generate_pdf_report` into `run_in_threadpool` with a timeout, and attach the shared limiter from `backend/src/worth_it/api/dependencies.py:29` to this router.

**7. Unbounded `/api/waterfall` request body**
`backend/src/worth_it/models.py:728` — `exit_valuations: list[float] = Field(..., min_length=1)` with no `max_length`, and `cap_table.stakeholders` is likewise unbounded; cost is the product of the two. **Failure:** a 99KB request produced 13.7s of synchronous event-loop-blocking CPU, a 158MB response, and 2.0GB RSS. Four uvicorn workers are trivially exhausted by four requests. **Fix:** cap `exit_valuations` (`max_length=100`) and stakeholders, add a combined-product guard in the router before calling the engine, and enforce a request body size limit at the ASGI layer.

## 3. Fix before you have real traffic

**1. Monte Carlo is unseedable and non-reproducible.** `backend/src/worth_it/monte_carlo.py:310` and `:435` use the legacy global RNG (`np.random.rand(num_simulations)`); no `seed` parameter or `default_rng` exists anywhere in the module. Two identical runs give different advice, and no deterministic test can pin the simulation. Replace with `np.random.default_rng(seed)` threaded through the request model.

**2. Rate limiting keys on the socket peer address.** `backend/src/worth_it/api/dependencies.py:29` — `Limiter(key_func=get_remote_address, ...)`. Behind any reverse proxy, CDN, or PaaS router every user collapses into a single bucket, so 60 req/min is the limit for the entire internet. Meanwhile the WebSocket path at `dependencies.py:~189` trusts `x-forwarded-for` unconditionally — its own docstring admits the values are spoofable. Pick one trust model: parse `X-Forwarded-For` against a configured trusted-proxy list, and use it consistently for both HTTP and WS.

**3. The documented `.env` file is never loaded.** `backend/src/worth_it/config.py:21-86` reads every setting via `os.getenv` at class-definition time, with no `load_dotenv()` and no pydantic `BaseSettings`/`env_file`. `backend/CLAUDE.md` documents a `backend/.env`; it has no effect. Production deploys silently get `API_HOST=127.0.0.1`, `ENVIRONMENT=development`, and the default CORS list. Adopt `pydantic-settings` with `env_file` support.

**4. E2E never gates a backend or frontend change.** `.github/workflows/playwright.yml` is `workflow_dispatch:` only ("Disabled automatic runs to reduce CI costs"), and `.github/workflows/playwright-pr.yaml` triggers only on `paths: ["playwright/**"]`. A PR touching `backend/` or `frontend/` runs zero E2E. This is precisely why a Waterfall panel that 400s on every non-empty preference stack shipped. Run at least a smoke subset on every PR.

**5. Type checking is scoped to hide failures.** `.github/workflows/test.yml:82` and `:85` run mypy and pyright against four paths only, excluding `monte_carlo.py`, `config.py`, `types.py`, and `exceptions.py`. Repo-wide `lcli typecheck` fails today. Either widen the CI scope or fix the excluded modules — right now the gate reports green on code it never inspected.

**6. Frontend build is skipped on PRs.** `.github/workflows/test.yml:120-123` — "Only build on push to main branches (not needed for PR validation)". A build-breaking change is only discovered after merge.

## 4. Worth knowing

| Issue | Location | Fix |
| --- | --- | --- |
| Slider thumbs have no accessible name (WCAG 4.1.2); `aria-valuetext` is conditional and no `aria-label`/`aria-labelledby` reaches the `role="slider"` element | `frontend/components/ui/slider.tsx:59-64` | Forward a required label prop to `SliderPrimitive.Thumb` |
| Breakeven threshold extrapolates outside the tested range; `t` is unclamped so the returned value can fall outside `[low, high]` | `frontend/lib/sensitivity-utils.ts:227-267` | Clamp `t` to `[0,1]` and return `null` when no sign change occurs |
| Sensitivity threshold assumes a linear response across the range, which the underlying option payoff is not | `frontend/lib/sensitivity-utils.ts:220-226` | Solve on the backend or label the value as an approximation |
| `result` and `params` accepted as unbounded `dict[str, Any]` on the export endpoint | `backend/src/worth_it/models.py:1131-1135` | Replace with typed models |
| `format` defaults to `"pdf"`, so the riskiest code path is the default | `backend/src/worth_it/models.py:1120` | Default to `"json"` until blocker 6 lands |
| Waterfall response `common_pct`/`preferred_pct` bounds are load-bearing validation doing double duty as an error check | `backend/src/worth_it/models.py:719-720` | Keep the bounds, but assert the invariant in the engine so failures surface as engine errors, not 400s |
| Preference tiers auto-generated from priced rounds sort by date but silently no-op when dates are absent | `frontend/components/cap-table/waterfall-analysis.tsx:48-54` | Fall back to explicit round ordering |
| `zodResolver` cast through `as any` with a lint suppression, disabling form type safety | `frontend/components/cap-table/preference-stack-editor.tsx:65-66` | Align the Zod schema's input/output types and drop the cast |
| Chart valuation range is hardcoded $1M–$500M regardless of the user's own exit assumption | `frontend/components/cap-table/waterfall-analysis.tsx:8-10` | Derive the range from the scenario's exit valuation |
| Currency is USD-hardcoded throughout formatting | `frontend/lib/format-utils.ts` | Thread a currency setting through; low priority for a US-first launch |
| No `LICENSE` file in a public-looking repo | repo root | Add one |
| `frontend/node_modules` is a partial install (445 entries; `zustand`, `sonner`, `framer-motion`, `uuid`, `jspdf`, `cmdk`, `date-fns`, several `@radix-ui/*` missing) though all are in `package.json` and `pnpm-lock.yaml` | `frontend/` working tree | `lcli install` — local environment only, not a repo defect |

## 5. What is genuinely solid

The audit was not one-sided, and several areas came back clean under adversarial verification.

- **Layering discipline is real.** The three-tier split (`calculations/` pure functions → `services/` orchestration → `api/routers/` thin handlers) is followed consistently. `backend/src/worth_it/api/routers/cap_table.py:92-151` is a textbook thin handler: validate, delegate, map, translate errors. The bugs found are *inside* single layers, not smeared across them — which is exactly why each fix is small.
- **The query-chaining hook is well-built.** `frontend/lib/hooks/use-scenario-calculation.ts` correctly memoizes each of the three request bodies (`:83`, `:112`, `:142`), gates each step on the previous one's data (`:138`, `:189`), and carefully distinguishes `isPending` from `isFetching` for stale-while-revalidate (`:194-206`). Its `retry` (`:270-274`) invalidates the whole chain properly. This is the file most likely to have been a mess, and it is not.
- **Error taxonomy is thought through.** `APIError` with a code enum, mapped to display types with a message-parsing fallback for legacy errors (`use-scenario-calculation.ts:213-267`), plus a custom exception hierarchy on the backend. Failures degrade into typed UI states rather than blank screens.
- **`waterfall-analysis.tsx` gets the TanStack dependency subtlety right** (`:92-94`, with an explanatory comment) — the same trap that blockers 5 fall into elsewhere. The knowledge exists in the codebase; it just was not applied uniformly.
- **Validation is present and mostly well-specified.** Pydantic constraints are used idiomatically throughout `models.py` (`gt=0`, `ge=0, le=100`, `min_length=1`, `Literal` unions). The gaps are omissions in two or three specific fields, not an absent culture of validation.
- **Test volume is substantial and CI is real.** `.github/workflows/test.yml` runs on push and PR with lint, mypy, pyright, and pytest for the backend plus lint, type-check, and unit tests with enforced coverage thresholds for the frontend. Three of seven live quality gates pass cleanly right now; the failures are attributable to the specific defects above and to the incomplete local `node_modules`, not to a broken pipeline.
- **Documentation is unusually good.** `CLAUDE.md`, `backend/CLAUDE.md`, and `frontend/CLAUDE.md` encode real architectural rules (business logic stays in the backend; Zod must mirror Pydantic), and the codebase mostly honors them. Blocker 4 is notable precisely because it is one of the few places that violates a rule the project itself wrote down.

## 6. Enhancement roadmap

**Top 3 — do these first, in this order.**

**1. Reproducible, seeded simulation.** Thread an explicit seed through `backend/src/worth_it/monte_carlo.py` (replacing the global RNG at `:310`/`:435`) and return it in the response. This is listed as a fix in section 3 *and* is the single highest-leverage enhancement: it makes results shareable ("here is the exact run I saw"), makes regressions testable, and is a hard prerequisite for share links, PDF reproducibility, and any A/B comparison of scenarios. Unlocked by section 3, item 1.

**2. Offer-vs-offer as the primary flow.** The comparison machinery already exists (`frontend/components/scenarios/scenario-comparison.tsx`, backend winner/diff endpoints), but it is a secondary panel. The actual job to be done is "I have two offers." Promote comparison to the landing experience. Blocked today by the render loop at `scenario-comparison.tsx:72` — fixing blocker 5 unlocks this directly.

**3. Exercise cost and tax modeling for options.** Right now an options holder sees a gross payout with no strike outlay timing, no AMT, and no ordinary-vs-capital treatment — which is the difference between "worth it" and "life-ruining." This is the largest genuine gap between what the tool says and what the user experiences. It depends on blocker 1: modeling tax on a number that is 10^7 too large is pointless.

**4. "What would have to be true" reverse solver.** Given a target net outcome, solve for the required exit valuation or growth rate. The sensitivity infrastructure in `frontend/lib/sensitivity-utils.ts` is 80% of the way there; replacing the unclamped linear interpolation at `:227-267` with a real solver serves both this feature and the correctness fix in section 4.

**5. Shareable scenario links.** Encode scenario state into a URL. Cheap given the app is already stateless, and it is the main organic growth loop for a tool people discuss with a spouse or a mentor. Requires items 1 and the blocker fixes first — a viral link to a wrong number is worse than no link.

**6. Cap-table import.** Manual stakeholder entry is the highest-friction step in the Waterfall flow. CSV or Carta-shaped import removes it. Requires blocker 3, since the panel currently 400s on any realistic cap table.

**7. Stakeholder assignment UI for preference tiers.** Currently impossible to express which investors sit in which tier (`preference-stack-editor.tsx:93` hardcodes `stakeholder_ids: []`). This is half of blocker 3's fix and unlocks genuinely useful modeling — pari passu stacks, side letters, seniority experiments.

**8. Scenario-diff view.** Change one assumption, see exactly which downstream numbers moved and by how much. Directly leverages the seeded-run work in item 1.

**9. Server-rendered PDF one-pager.** A single page a candidate can bring to a negotiation. The generator exists in `backend/src/worth_it/api/routers/export.py`; it needs blocker 6's hardening and blocker 2's vesting fix before its output can be trusted.

**10. Multi-currency and locale support.** Currency is hardcoded USD across `frontend/lib/format-utils.ts`. Real, but genuinely last — it widens the audience without deepening the product, and every earlier item raises the value of doing it.

**Deliberately not doing:** accounts, persistence, and a backend database. The statelessness is the reason this audit's security section is short. Adding auth and stored user financials would convert a low-blast-radius calculator into a system holding compensation data for identifiable people, and would invalidate most of the "genuinely solid" column above.

## 7. The one thing

**Fix the math trio — `backend/src/worth_it/services/serializers.py:142`, `backend/src/worth_it/services/startup_service.py:145`, and `backend/src/worth_it/calculations/waterfall_engine.py:320`/`:372` — and land a regression test for each before touching anything else.**

Three files. Roughly a dozen lines. Together they are the difference between a tool that tells someone whether to take a job and a tool that confidently tells them the wrong thing. Every other item on this list — the SSRF, the render loops, the roadmap, the share links — is either cheap to do afterward or actively harmful to do first. The roadmap's own governing constraint says it best: shipping distribution features on top of wrong math is the one thing to refuse. Fix the numbers, prove them with tests, then ship.
