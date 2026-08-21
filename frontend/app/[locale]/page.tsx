"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Masthead } from "@/components/ledger/masthead";
import { SkipLink } from "@/components/layout/skip-link";
import { SampleNotice } from "@/components/ledger/sample-notice";
import { Field } from "@/components/ledger/field";
import { Money } from "@/components/ledger/money";
import { StayColumn } from "@/components/ledger/stay-column";
import { OfferColumn } from "@/components/ledger/offer-column";
import { AddOfferSlot } from "@/components/ledger/add-offer-slot";
import { VerdictBand, type VerdictStats } from "@/components/ledger/verdict-band";
import { VestingChapter } from "@/components/ledger/chapters/vesting-chapter";
import { OutcomesChapter, DEFAULT_RUNS } from "@/components/ledger/chapters/outcomes-chapter";
import { DilutionChapter } from "@/components/ledger/chapters/dilution-chapter";
import { SensitivityChapter } from "@/components/ledger/chapters/sensitivity-chapter";
import { WaterfallChapter } from "@/components/ledger/chapters/waterfall-chapter";
import {
  selectVerdict,
  type OfferOutcome,
  type VerdictState,
  type MissingField,
} from "@/lib/ledger/verdict";
import { useFirstVisit } from "@/lib/hooks/use-first-visit";
import {
  useDraftAutoSave,
  getDraft,
  clearDraft,
  safeParseDraftData,
} from "@/lib/hooks/use-draft-auto-save";
import type { ScenarioCalculationResult } from "@/lib/hooks";
import { ExportMenu } from "@/components/results/export-menu";
import type { ScenarioData } from "@/lib/export-utils";
import { useAppStore, useOffers, usePreferenceTiers, type Offer } from "@/lib/store";
import { cn } from "@/lib/utils";
import { VALIDATION } from "@/lib/constants/validation";
import type { CurrentJobForm, MonteCarloPercentiles } from "@/lib/schemas";

/** Example loaded into the document the first time a visitor arrives (spec §5.2). */
const SAMPLE_EXAMPLE_ID = "early-stage";
/** Horizon (years) a cleared document falls back to until the user sets one. */
const DEFAULT_EXIT_YEAR = 5;

/**
 * Fixed grid-template-columns per offer count, keyed so Tailwind's JIT scanner
 * sees each complete literal class (a runtime-interpolated template string
 * would never match — see `RuledTable`'s own note on this). The key space is
 * capped at 3 offers, matching the store's own cap on how many offers can
 * exist at once.
 */
const DUEL_GRID_TEMPLATES: Record<number, string> = {
  1: "md:grid-cols-[1fr_1fr_10rem]", // Stay + 1 offer + Add-offer slot
  2: "md:grid-cols-[1fr_1fr_1fr_10rem]", // Stay + 2 offers + Add-offer slot
  3: "md:grid-cols-[1fr_1fr_1fr_1fr]", // Stay + 3 offers, at cap: no Add-offer slot
};

/** Ranks offers the same way `selectVerdict` does, so the "leading" offer always matches who's winning. */
function pickLeadingOfferId(outcomes: OfferOutcome[]): string | null {
  if (outcomes.length === 0) return null;
  const ranked = [...outcomes].sort((a, b) => (b.medianNet ?? 0) - (a.medianNet ?? 0));
  return ranked[0].id;
}

type LeadingEquityDetails = NonNullable<Offer["equityDetails"]>;

interface LeadingData {
  equityDetails: LeadingEquityDetails;
  monthlyData: NonNullable<ScenarioCalculationResult["monthlyData"]>;
  result: NonNullable<ScenarioCalculationResult["result"]>;
  scenario: ScenarioCalculationResult;
}

/** Resolves the leading offer's equity details + latest calculation, or `null` until both exist. */
function resolveLeadingData(
  offers: Offer[],
  scenariosById: Record<string, ScenarioCalculationResult>,
  leadingOfferId: string | null
): LeadingData | null {
  if (!leadingOfferId) return null;
  const offer = offers.find((candidate) => candidate.id === leadingOfferId);
  const scenario = scenariosById[leadingOfferId];
  if (!offer?.equityDetails || !scenario?.result || !scenario.monthlyData) return null;
  return {
    equityDetails: offer.equityDetails,
    monthlyData: scenario.monthlyData,
    result: scenario.result,
    scenario,
  };
}

/**
 * Builds the `ScenarioData` shape `ExportMenu` expects from the leading
 * offer's live state — the same camelCase mirror of the snake_case backend
 * fields `components/results/scenario-results.tsx` already builds for its
 * own export button, so exported files stay in one consistent format.
 */
function buildLeadingScenarioData(
  leading: LeadingData,
  currentJob: CurrentJobForm,
  exitYear: number,
  offerName: string
): ScenarioData {
  const { equityDetails, result } = leading;
  return {
    name: offerName,
    timestamp: new Date().toISOString(),
    globalSettings: { exitYear },
    currentJob: {
      monthlySalary: currentJob.monthly_salary,
      annualGrowthRate: currentJob.annual_salary_growth_rate,
      assumedROI: currentJob.assumed_annual_roi,
      investmentFrequency: currentJob.investment_frequency,
    },
    equity:
      equityDetails.equity_type === "RSU"
        ? {
            type: "RSU",
            monthlySalary: equityDetails.monthly_salary,
            vestingPeriod: equityDetails.vesting_period,
            cliffPeriod: equityDetails.cliff_period,
            equityPct: equityDetails.total_equity_grant_pct,
            exitValuation: equityDetails.exit_valuation,
            simulateDilution: equityDetails.simulate_dilution,
          }
        : {
            type: "STOCK_OPTIONS",
            monthlySalary: equityDetails.monthly_salary,
            vestingPeriod: equityDetails.vesting_period,
            cliffPeriod: equityDetails.cliff_period,
            numOptions: equityDetails.num_options,
            strikePrice: equityDetails.strike_price,
            exitPricePerShare: equityDetails.exit_price_per_share,
          },
    results: {
      finalPayoutValue: result.final_payout_value,
      finalOpportunityCost: result.final_opportunity_cost,
      netOutcome: result.final_payout_value - result.final_opportunity_cost,
      breakeven: result.breakeven_label,
    },
  };
}

/**
 * Whether a parsed draft actually carries anything worth restoring — mirrors
 * `useDraftAutoSave`'s own "has data" gate so the two agree on what counts
 * as a meaningful draft.
 */
function hasRestorableContent(parsed: ReturnType<typeof safeParseDraftData>): boolean {
  return (
    parsed.globalSettings !== null ||
    parsed.currentJob !== null ||
    (parsed.offers?.some((offer) => offer.equityDetails !== null) ?? false)
  );
}

/** Western-digit count, matching `formatMoney`'s own `-u-nu-latn` technique so Arabic never reformats it. */
function formatWesternCount(value: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`).format(value);
}

/** Short offer name + signed delta for the mobile sticky bar; `null` amount when there's nothing to show yet. */
function shortVerdict(
  verdict: VerdictState | null,
  stayLabel: string
): { label: string; amount: number | null } | null {
  if (!verdict) return null;
  switch (verdict.kind) {
    case "incomplete":
      return { label: verdict.offerName, amount: null };
    case "stay":
      return { label: stayLabel, amount: verdict.bestMedianNet };
    case "take-offer":
      return { label: verdict.offerName, amount: verdict.medianNet };
  }
}

export default function Home() {
  const locale = useLocale();
  const tLanding = useTranslations("landing");
  const tStates = useTranslations("states");
  const tVerdict = useTranslations("verdict");
  const tDuel = useTranslations("duel");

  const globalSettings = useAppStore((state) => state.globalSettings);
  const currentJob = useAppStore((state) => state.currentJob);
  const setGlobalSettings = useAppStore((state) => state.setGlobalSettings);
  const setCurrentJob = useAppStore((state) => state.setCurrentJob);
  const loadExample = useAppStore((state) => state.loadExample);
  const clearSample = useAppStore((state) => state.clearSample);
  const restoreOffers = useAppStore((state) => state.restoreOffers);
  const offers = useOffers();
  const preferenceTiers = usePreferenceTiers();

  const { isFirstVisit, isLoaded, markAsOnboarded } = useFirstVisit();
  const [sampleActive, setSampleActive] = React.useState(false);

  // Auto-save the live document to a draft; on mount, a valid draft takes
  // priority over the first-visit sample (below) — a returning visitor's own
  // numbers must never be clobbered by the example.
  useDraftAutoSave({ globalSettings, currentJob, equityDetails: null, offers });

  const hasInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isLoaded || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const draft = getDraft();
    const parsed = draft ? safeParseDraftData(draft.data) : null;

    if (parsed && hasRestorableContent(parsed)) {
      if (parsed.globalSettings) setGlobalSettings(parsed.globalSettings);
      if (parsed.currentJob) setCurrentJob(parsed.currentJob);
      if (parsed.offers && parsed.offers.length > 0) restoreOffers(parsed.offers);
      clearDraft();
      if (isFirstVisit) markAsOnboarded();
      return;
    }

    if (isFirstVisit) {
      loadExample(SAMPLE_EXAMPLE_ID);
      setSampleActive(true);
      markAsOnboarded();
    }
  }, [
    isLoaded,
    isFirstVisit,
    loadExample,
    markAsOnboarded,
    setGlobalSettings,
    setCurrentJob,
    restoreOffers,
  ]);

  const handleClearSample = React.useCallback(() => {
    clearSample();
    // A stale sample-derived draft could otherwise resurrect the sample on
    // the very next reload, defeating the point of clearing it.
    clearDraft();
    setSampleActive(false);
  }, [clearSample]);

  const [useNpv, setUseNpv] = React.useState(true);
  const [outcomesById, setOutcomesById] = React.useState<Record<string, OfferOutcome>>({});
  const [scenariosById, setScenariosById] = React.useState<
    Record<string, ScenarioCalculationResult>
  >({});
  const [mcOverride, setMcOverride] = React.useState<{
    percentiles: MonteCarloPercentiles | null;
    probability: number | null;
    seed: number | null;
  }>({ percentiles: null, probability: null, seed: null });

  const handleOutcome = React.useCallback((outcome: OfferOutcome) => {
    setOutcomesById((prev) => ({ ...prev, [outcome.id]: outcome }));
  }, []);

  const handleScenarioData = React.useCallback((id: string, result: ScenarioCalculationResult) => {
    setScenariosById((prev) => ({ ...prev, [id]: result }));
  }, []);

  const handlePercentiles = React.useCallback(
    (
      percentiles: MonteCarloPercentiles | null,
      probability: number | null,
      seed: number | null
    ) => {
      setMcOverride({ percentiles, probability, seed });
    },
    []
  );

  const columnRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const orderedOutcomes = React.useMemo(
    () =>
      offers
        .map((offer) => outcomesById[offer.id])
        .filter((outcome): outcome is OfferOutcome => outcome !== undefined),
    [offers, outcomesById]
  );

  const leadingOfferId = React.useMemo(
    () => pickLeadingOfferId(orderedOutcomes),
    [orderedOutcomes]
  );

  // A fresh Monte Carlo run belongs to whichever offer led when it was launched;
  // if editing the duel promotes a different offer to the lead in the meantime,
  // that run's numbers no longer describe the new leader and must not be reused.
  const previousLeadingIdRef = React.useRef(leadingOfferId);
  React.useEffect(() => {
    if (previousLeadingIdRef.current !== leadingOfferId) {
      previousLeadingIdRef.current = leadingOfferId;
      setMcOverride({ percentiles: null, probability: null, seed: null });
    }
  }, [leadingOfferId]);

  const effectiveOutcomes = React.useMemo(
    () =>
      orderedOutcomes.map((outcome) =>
        outcome.id === leadingOfferId && mcOverride.percentiles
          ? { ...outcome, medianNet: mcOverride.percentiles.p50 }
          : outcome
      ),
    [orderedOutcomes, leadingOfferId, mcOverride.percentiles]
  );

  const verdict = orderedOutcomes.length > 0 ? selectVerdict(effectiveOutcomes) : null;
  const incompleteOutcome = orderedOutcomes.find((outcome) => !outcome.complete) ?? null;

  const handleFocusMissing = React.useCallback(() => {
    if (!incompleteOutcome?.missingField) return;
    const container = columnRefs.current[incompleteOutcome.id];
    if (!container) return;
    // Target the field the verdict sentence actually names via `data-field`
    // (stamped by `OfferColumn` to match `deriveMissingField`'s own priority
    // order) rather than guessing from DOM order — an offer's "Offer name"
    // and "Monthly salary" inputs are also empty by default and would win a
    // DOM-order race against the field the sentence names. The `MissingField`
    // annotation binds this query to the same union `Field`'s `dataField`
    // prop accepts, so a future edit to that union fails to compile here too.
    const missingField: MissingField = incompleteOutcome.missingField;
    const target = container.querySelector<HTMLInputElement>(`[data-field="${missingField}"]`);
    target?.focus();
  }, [incompleteOutcome]);

  const leadingScenario = leadingOfferId ? scenariosById[leadingOfferId] : undefined;
  const leading = resolveLeadingData(offers, scenariosById, leadingOfferId);
  // Read straight off `leadingScenario`, not `leading`: `leading` requires a
  // successful `result`, so a failed calculation would never resolve it —
  // exactly the case this error/retry pair needs to handle.
  const isFetching = leadingScenario?.isFetching ?? false;
  const leadingError = leadingScenario?.error ?? null;

  const stats: VerdictStats = {
    // `handlePercentiles` always sets percentiles/probability/seed together
    // (and clears them together — see the leading-offer-change effect above);
    // gating on `percentiles` here makes that atomic-triple invariant provable
    // from this file alone, without having to trust the callback's contract.
    probabilityOfferWins: mcOverride.percentiles ? mcOverride.probability : null,
    equityAtExit: leading
      ? useNpv
        ? (leading.result.final_payout_value_npv ?? null)
        : leading.result.final_payout_value
      : null,
    costOfLeaving: leading
      ? useNpv
        ? (leading.result.final_opportunity_cost_npv ?? null)
        : leading.result.final_opportunity_cost
      : null,
    breakevenValue: leading?.result.final_breakeven_value ?? null,
  };

  // `StockOptionsForm` (lib/schemas.ts) has no `simulate_dilution`/`dilution_rounds`
  // fields at all — options equity dilutes through the exit price per share
  // directly, not a modeled round schedule — so this gate is also the only
  // place dilution rounds can ever come from; a stock-options leading offer
  // always resolves to `null` here and the Dilution chapter never renders for
  // one. Chapter numbering stays fixed ("03"/"04"/"05") rather than shifting
  // up when it's absent: the numbers are stable references into this
  // document's structure, not a strict "nth visible chapter" count, so
  // Sensitivity is always chapter 04 and Waterfall always chapter 05 whether
  // or not this offer happens to show a Dilution chapter.
  const dilutionRounds =
    leading &&
    leading.equityDetails.equity_type === "RSU" &&
    leading.equityDetails.simulate_dilution
      ? leading.equityDetails.dilution_rounds
      : null;

  const stayTakeHome = leading?.result.final_take_home_value ?? null;
  const mobile = shortVerdict(verdict, tDuel("stay"));

  const leadingOfferName = leadingOfferId ? (outcomesById[leadingOfferId]?.name ?? "") : "";
  const leadingScenarioData: ScenarioData | null =
    leading && currentJob && globalSettings
      ? buildLeadingScenarioData(leading, currentJob, globalSettings.exit_year, leadingOfferName)
      : null;

  return (
    <div className="bg-paper text-ink min-h-screen">
      <SkipLink />
      <Masthead />

      <main id="main-content" className="pb-20 md:pb-0">
        {sampleActive ? <SampleNotice onClear={handleClearSample} /> : null}
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h1 className="font-serif text-3xl font-medium">{tLanding("title")}</h1>
            <div className="flex flex-wrap items-end gap-6">
              <Field
                label={tLanding("horizon")}
                value={globalSettings?.exit_year ?? null}
                onValueChange={(value) =>
                  setGlobalSettings({ exit_year: value ?? DEFAULT_EXIT_YEAR })
                }
                min={VALIDATION.EXIT_YEAR_MIN}
                max={VALIDATION.EXIT_YEAR_MAX}
                className="w-40"
              />
              {mcOverride.seed !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-annotation text-sm">{tLanding("seed")}</span>
                  <bdi dir="ltr" className="font-mono text-sm">
                    {mcOverride.seed}
                  </bdi>
                </div>
              ) : null}
              <button
                type="button"
                aria-pressed={useNpv}
                onClick={() => setUseNpv((value) => !value)}
                className="border-rule aria-pressed:border-market aria-pressed:bg-market-soft aria-pressed:text-market rounded-sm border px-2 py-0.5 font-mono text-xs"
              >
                {tLanding("npvToggle")}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl">
          <div
            className={cn(
              "border-ink grid gap-0 border-t",
              DUEL_GRID_TEMPLATES[offers.length] ?? DUEL_GRID_TEMPLATES[1]
            )}
          >
            <div className="border-rule border-e p-6">
              <StayColumn takeHomeOverHorizon={stayTakeHome} />
            </div>
            {offers.map((offer) => (
              <div
                key={offer.id}
                ref={(element) => {
                  columnRefs.current[offer.id] = element;
                }}
                className="border-rule border-e p-6"
              >
                <OfferColumn
                  offerId={offer.id}
                  onOutcome={handleOutcome}
                  onScenarioData={handleScenarioData}
                  useNpv={useNpv}
                />
              </div>
            ))}
            <div className="p-6">
              <AddOfferSlot />
            </div>
          </div>
        </div>

        {leadingError ? (
          <section className="border-ink border-y px-6 py-10 text-center" aria-live="polite">
            <p className="font-serif text-2xl">{tStates("failure.message")}</p>
            <button
              type="button"
              onClick={() => leadingScenario?.retry()}
              className="border-market bg-market-soft text-market mt-4 rounded-sm border px-3 py-1.5 font-mono text-xs"
            >
              {tStates("failure.retry")}
            </button>
          </section>
        ) : verdict ? (
          <div className={cn(isFetching && "opacity-60 transition-opacity")}>
            <VerdictBand
              verdict={verdict}
              stats={stats}
              percentiles={mcOverride.percentiles}
              onFocusMissing={handleFocusMissing}
            />
            <p className="text-annotation mx-auto max-w-5xl px-6 py-3 text-xs">
              {tVerdict("basis", {
                runs: formatWesternCount(DEFAULT_RUNS, locale),
                years: formatWesternCount(globalSettings?.exit_year ?? DEFAULT_EXIT_YEAR, locale),
              })}
            </p>
          </div>
        ) : null}

        {leadingScenarioData ? (
          <div className="mx-auto flex max-w-5xl justify-end gap-2 px-6 py-3">
            <ExportMenu scenario={leadingScenarioData} />
          </div>
        ) : null}

        {globalSettings && currentJob && leading ? (
          <div
            className={cn(
              "mx-auto max-w-5xl space-y-12 px-6 py-12",
              isFetching && "opacity-60 transition-opacity"
            )}
          >
            <VestingChapter
              index="01"
              monthlyData={leading.monthlyData}
              vestingPeriod={leading.equityDetails.vesting_period}
              cliffPeriod={leading.equityDetails.cliff_period}
              exitYear={globalSettings.exit_year}
            />
            <OutcomesChapter
              index="02"
              globalSettings={globalSettings}
              currentJob={currentJob}
              equityDetails={leading.equityDetails}
              onPercentiles={handlePercentiles}
            />
            {dilutionRounds && dilutionRounds.length > 0 ? (
              <DilutionChapter
                index="03"
                rounds={dilutionRounds}
                totalDilution={leading.result.total_dilution ?? null}
                dilutedEquityPct={leading.result.diluted_equity_pct ?? null}
                dilutionSchedule={leading.result.dilution_schedule ?? null}
              />
            ) : null}
            <SensitivityChapter
              index="04"
              result={leading.result}
              currentJob={currentJob}
              equityDetails={leading.equityDetails}
            />
            <WaterfallChapter index="05" hasTiers={preferenceTiers.length > 0} />
          </div>
        ) : null}
      </main>

      {mobile ? (
        <div className="border-ink bg-paper fixed inset-x-0 bottom-0 border-t p-3 md:hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="font-serif text-sm">{mobile.label}</span>
            {mobile.amount !== null ? (
              <Money
                value={mobile.amount}
                signed
                className={cn("text-sm", mobile.amount < 0 && "text-loss")}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
