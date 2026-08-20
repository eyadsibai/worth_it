"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Masthead } from "@/components/ledger/masthead";
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
import { selectVerdict, type OfferOutcome, type VerdictState } from "@/lib/ledger/verdict";
import { useFirstVisit } from "@/lib/hooks/use-first-visit";
import type { ScenarioCalculationResult } from "@/lib/hooks";
import { useAppStore, useOffers, usePreferenceTiers, type Offer } from "@/lib/store";
import { cn } from "@/lib/utils";
import { VALIDATION } from "@/lib/constants/validation";
import type { MonteCarloPercentiles } from "@/lib/schemas";

/** Example loaded into the document the first time a visitor arrives (spec §5.2). */
const SAMPLE_EXAMPLE_ID = "early-stage";
/** Horizon (years) a cleared document falls back to until the user sets one. */
const DEFAULT_EXIT_YEAR = 5;
/** Row field carrying the cumulative invested-surplus total (see `charts/opportunity-cost-chart.tsx`). */
const OPPORTUNITY_COST_FIELD = "cumulative_opportunity_cost";

/**
 * Fixed grid-template-columns per offer count, keyed so Tailwind's JIT scanner
 * sees each complete literal class (a runtime-interpolated template string
 * would never match — see `RuledTable`'s own note on this). `MAX_OFFERS` caps
 * the key space at 3.
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

/** Final (last-row) cumulative opportunity cost, or `null` before it's known. */
function deriveTakeHomeOverHorizon(
  opportunityCost: ScenarioCalculationResult["opportunityCost"]
): number | null {
  const rows = opportunityCost?.data;
  if (!rows || rows.length === 0) return null;
  const lastValue = rows[rows.length - 1]?.[OPPORTUNITY_COST_FIELD];
  return typeof lastValue === "number" ? lastValue : null;
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
  const loadExample = useAppStore((state) => state.loadExample);
  const clearSample = useAppStore((state) => state.clearSample);
  const offers = useOffers();
  const preferenceTiers = usePreferenceTiers();

  const { isFirstVisit, isLoaded, markAsOnboarded } = useFirstVisit();
  const [sampleActive, setSampleActive] = React.useState(false);

  React.useEffect(() => {
    if (isLoaded && isFirstVisit) {
      loadExample(SAMPLE_EXAMPLE_ID);
      setSampleActive(true);
      markAsOnboarded();
    }
  }, [isLoaded, isFirstVisit, loadExample, markAsOnboarded]);

  const handleClearSample = React.useCallback(() => {
    clearSample();
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
    if (!incompleteOutcome) return;
    const container = columnRefs.current[incompleteOutcome.id];
    if (!container) return;
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>("input"));
    (inputs.find((input) => input.value === "") ?? inputs[0])?.focus();
  }, [incompleteOutcome]);

  const leadingScenario = leadingOfferId ? scenariosById[leadingOfferId] : undefined;
  const leading = resolveLeadingData(offers, scenariosById, leadingOfferId);
  // Read straight off `leadingScenario`, not `leading`: `leading` requires a
  // successful `result`, so a failed calculation would never resolve it —
  // exactly the case this error/retry pair needs to handle.
  const isFetching = leadingScenario?.isFetching ?? false;
  const leadingError = leadingScenario?.error ?? null;

  const stats: VerdictStats = {
    probabilityOfferWins: mcOverride.probability,
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
    breakevenLabel: leading?.result.breakeven_label ?? null,
  };

  const dilutionRounds =
    leading &&
    leading.equityDetails.equity_type === "RSU" &&
    leading.equityDetails.simulate_dilution
      ? leading.equityDetails.dilution_rounds
      : null;

  const stayTakeHome = deriveTakeHomeOverHorizon(leading?.scenario.opportunityCost);
  const mobile = shortVerdict(verdict, tDuel("stay"));

  return (
    <div className="bg-paper text-ink min-h-screen">
      <Masthead />

      {sampleActive ? <SampleNotice onClear={handleClearSample} /> : null}

      <main className="pb-20 md:pb-0">
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

        <footer className="border-rule mx-auto max-w-5xl border-t px-6 py-6">
          {mcOverride.seed !== null ? (
            <p className="text-annotation text-xs">
              {tLanding("seed")}: <bdi dir="ltr">{mcOverride.seed}</bdi>
            </p>
          ) : null}
        </footer>
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
