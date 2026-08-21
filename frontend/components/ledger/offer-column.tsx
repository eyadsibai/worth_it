"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field } from "@/components/ledger/field";
import { PresetChips } from "@/components/ledger/preset-chips";
import { Link } from "@/i18n/navigation";
import { useScenarioCalculation } from "@/lib/hooks";
import type { ScenarioCalculationResult } from "@/lib/hooks";
import { formatMoney } from "@/lib/ledger/format-money";
import { formatStakePercent } from "@/lib/ledger/percent";
import type { OfferOutcome } from "@/lib/ledger/verdict";
import { useAppStore, useOffers, useDisplayCurrency } from "@/lib/store";
import { VALIDATION } from "@/lib/constants/validation";
import type { RSUForm, StockOptionsForm, StartupScenarioResponse } from "@/lib/schemas";

const EXIT_VALUATION_10M = 10_000_000;
const EXIT_VALUATION_50M = 50_000_000;
const EXIT_VALUATION_100M = 100_000_000;
const EXIT_VALUATION_500M = 500_000_000;
const EXIT_VALUATION_1B = 1_000_000_000;

/** Round-number quick picks for the exit valuation field. */
export const PRESET_EXIT_VALUATIONS = [
  EXIT_VALUATION_10M,
  EXIT_VALUATION_50M,
  EXIT_VALUATION_100M,
  EXIT_VALUATION_500M,
  EXIT_VALUATION_1B,
] as const;

/** Char code for "A" — offset by an offer's position to derive its default "Offer A/B/C" letter. */
const LETTER_A_CHAR_CODE = 65;

function buildDefaultRSU(monthlySalary: number): RSUForm {
  return {
    equity_type: "RSU",
    monthly_salary: monthlySalary,
    total_equity_grant_pct: 0,
    vesting_period: VALIDATION.VESTING_PERIOD_DEFAULT,
    cliff_period: VALIDATION.CLIFF_PERIOD_DEFAULT,
    simulate_dilution: false,
    dilution_rounds: [],
    exit_valuation: 0,
  };
}

function buildDefaultOptions(monthlySalary: number): StockOptionsForm {
  return {
    equity_type: "STOCK_OPTIONS",
    monthly_salary: monthlySalary,
    num_options: 0,
    strike_price: 0,
    vesting_period: VALIDATION.VESTING_PERIOD_DEFAULT,
    cliff_period: VALIDATION.CLIFF_PERIOD_DEFAULT,
    exercise_strategy: "AT_EXIT",
    exit_price_per_share: 0,
  };
}

/**
 * The first required field that's still null/zero, in priority order: an
 * offer with no equity details at all is missing "equity" (grant type never
 * chosen); once details exist, salary is checked before the type-specific
 * grant size, then the exit figure.
 */
function deriveMissingField(
  equityDetails: RSUForm | StockOptionsForm | null
): OfferOutcome["missingField"] {
  if (!equityDetails) return "equity";
  if (equityDetails.monthly_salary <= 0) return "salary";
  if (equityDetails.equity_type === "RSU") {
    if (equityDetails.total_equity_grant_pct <= 0) return "equity";
    if (equityDetails.exit_valuation <= 0) return "exit";
  } else {
    if (equityDetails.num_options <= 0) return "equity";
    if (equityDetails.exit_price_per_share <= 0) return "exit";
  }
  return null;
}

/** `final_payout_value(_npv) − final_opportunity_cost(_npv)`, per the NPV toggle. Null NPV fields count as "not yet available" rather than producing NaN. */
function deriveMedianNet(
  result: StartupScenarioResponse | undefined,
  useNpv: boolean
): number | null {
  if (!result) return null;
  if (useNpv) {
    const payoutNpv = result.final_payout_value_npv;
    const opportunityCostNpv = result.final_opportunity_cost_npv;
    if (
      payoutNpv === null ||
      payoutNpv === undefined ||
      opportunityCostNpv === null ||
      opportunityCostNpv === undefined
    ) {
      return null;
    }
    return payoutNpv - opportunityCostNpv;
  }
  return result.final_payout_value - result.final_opportunity_cost;
}

export interface OfferColumnProps {
  offerId: string;
  onOutcome: (outcome: OfferOutcome) => void;
  onScenarioData: (id: string, result: ScenarioCalculationResult) => void;
  /**
   * Whether `medianNet` reads today's-dollars (NPV) fields. Defaults to
   * `true`; the landing's NPV toggle is document-level state (Task 13) that
   * gets threaded down through this prop.
   */
  useNpv?: boolean;
}

/**
 * One named offer in the duel: an editable grant-type field set over the
 * shared `useScenarioCalculation` chain, reporting its completeness and
 * derived net benefit upward on every change.
 */
export function OfferColumn({
  offerId,
  onOutcome,
  onScenarioData,
  useNpv = true,
}: OfferColumnProps) {
  const t = useTranslations("duel");
  const locale = useLocale();
  const currency = useDisplayCurrency();
  const offers = useOffers();
  const offerIndex = offers.findIndex((candidate) => candidate.id === offerId);
  const offer = offers[offerIndex];
  const currentJob = useAppStore((state) => state.currentJob);
  const globalSettings = useAppStore((state) => state.globalSettings);
  const renameOffer = useAppStore((state) => state.renameOffer);
  const removeOffer = useAppStore((state) => state.removeOffer);
  const setOfferEquityDetails = useAppStore((state) => state.setOfferEquityDetails);

  const equityDetails = offer?.equityDetails ?? null;
  const equityType = equityDetails?.equity_type ?? "RSU";
  const rsuDetails = equityDetails?.equity_type === "RSU" ? equityDetails : null;
  const optionsDetails = equityDetails?.equity_type === "STOCK_OPTIONS" ? equityDetails : null;

  const calculation = useScenarioCalculation({ globalSettings, currentJob, equityDetails });

  const missingField = deriveMissingField(equityDetails);
  const complete = missingField === null;
  const medianNet = complete ? deriveMedianNet(calculation.result, useNpv) : null;

  const defaultName = t("offerDefaultName", {
    letter: String.fromCharCode(LETTER_A_CHAR_CODE + Math.max(offerIndex, 0)),
  });
  const displayName = offer?.name || defaultName;

  useEffect(() => {
    if (!offer) return;
    onOutcome({ id: offerId, name: displayName, complete, missingField, medianNet });
    // onOutcome and offer identity aren't tracked: only the derived values below should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId, displayName, complete, missingField, medianNet]);

  useEffect(() => {
    if (!offer) return;
    onScenarioData(offerId, calculation);
    // onScenarioData isn't tracked: only the fields that meaningfully change should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    offerId,
    calculation.result,
    calculation.isPending,
    calculation.isFetching,
    calculation.error,
    calculation.hasValidData,
  ]);

  if (!offer) return null;

  const updateRSU = (patch: Partial<RSUForm>) => {
    const base = rsuDetails ?? buildDefaultRSU(equityDetails?.monthly_salary ?? 0);
    setOfferEquityDetails(offerId, { ...base, ...patch });
  };

  const updateOptions = (patch: Partial<StockOptionsForm>) => {
    const base = optionsDetails ?? buildDefaultOptions(equityDetails?.monthly_salary ?? 0);
    setOfferEquityDetails(offerId, { ...base, ...patch });
  };

  const handleGrantTypeChange = (type: "RSU" | "STOCK_OPTIONS") => {
    const salary = equityDetails?.monthly_salary ?? 0;
    setOfferEquityDetails(
      offerId,
      type === "RSU" ? buildDefaultRSU(salary) : buildDefaultOptions(salary)
    );
  };

  const handleMonthlySalaryChange = (value: number | null) => {
    if (equityType === "RSU") {
      updateRSU({ monthly_salary: value ?? 0 });
    } else {
      updateOptions({ monthly_salary: value ?? 0 });
    }
  };

  const exitPresetOptions = PRESET_EXIT_VALUATIONS.map((value) => ({
    value,
    label: formatMoney(value, { currency, locale }),
  }));

  const dilutedEquityPct = calculation.result?.diluted_equity_pct;
  const dilutedPct =
    rsuDetails?.simulate_dilution && dilutedEquityPct !== null && dilutedEquityPct !== undefined
      ? formatStakePercent(dilutedEquityPct)
      : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <input
          type="text"
          aria-label={t("offerName")}
          placeholder={defaultName}
          value={offer.name}
          onChange={(event) => renameOffer(offerId, event.target.value)}
          className="text-ink placeholder:text-annotation w-full bg-transparent font-serif text-xl font-medium outline-none"
        />
        <button
          type="button"
          aria-label={t("removeOffer")}
          disabled={offers.length <= 1}
          onClick={() => removeOffer(offerId)}
          className="text-annotation hover:text-loss shrink-0 text-xs disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("removeOffer")}
        </button>
      </div>
      <span className="text-annotation tracking-eyebrow text-xs uppercase">{t("startupTag")}</span>

      <div role="group" aria-label={t("grantType")} className="flex gap-2 py-1">
        <button
          type="button"
          aria-pressed={equityType === "RSU"}
          onClick={() => handleGrantTypeChange("RSU")}
          className="border-rule aria-pressed:border-market aria-pressed:bg-market-soft aria-pressed:text-market rounded-sm border px-2 py-0.5 font-mono text-xs"
        >
          {t("rsu")}
        </button>
        <button
          type="button"
          aria-pressed={equityType === "STOCK_OPTIONS"}
          onClick={() => handleGrantTypeChange("STOCK_OPTIONS")}
          className="border-rule aria-pressed:border-market aria-pressed:bg-market-soft aria-pressed:text-market rounded-sm border px-2 py-0.5 font-mono text-xs"
        >
          {t("options")}
        </button>
      </div>

      <Field
        label={t("monthlySalary")}
        value={equityDetails?.monthly_salary ?? null}
        onValueChange={handleMonthlySalaryChange}
        min={0}
        dataField="salary"
      />

      {equityType === "RSU" ? (
        <>
          <Field
            label={t("equityGrant")}
            value={rsuDetails?.total_equity_grant_pct ?? null}
            onValueChange={(value) => updateRSU({ total_equity_grant_pct: value ?? 0 })}
            min={VALIDATION.PCT_MIN}
            max={VALIDATION.PCT_MAX}
            unit="%"
            dataField="equity"
          />
          <Field
            label={t("vesting")}
            value={rsuDetails?.vesting_period ?? null}
            onValueChange={(value) =>
              updateRSU({ vesting_period: value ?? VALIDATION.VESTING_PERIOD_DEFAULT })
            }
            min={VALIDATION.VESTING_PERIOD_MIN}
            max={VALIDATION.VESTING_PERIOD_MAX}
          />
          <Field
            label={t("cliff")}
            value={rsuDetails?.cliff_period ?? null}
            onValueChange={(value) =>
              updateRSU({ cliff_period: value ?? VALIDATION.CLIFF_PERIOD_DEFAULT })
            }
            min={VALIDATION.CLIFF_PERIOD_MIN}
            max={VALIDATION.CLIFF_PERIOD_MAX}
          />
          <Field
            label={t("exitValuation")}
            value={rsuDetails?.exit_valuation ?? null}
            onValueChange={(value) => updateRSU({ exit_valuation: value ?? 0 })}
            min={0}
            dataField="exit"
          />
          <PresetChips
            options={exitPresetOptions}
            selected={rsuDetails?.exit_valuation}
            onSelect={(value) => updateRSU({ exit_valuation: value })}
          />
          <Link href="/valuation" className="text-market text-xs">
            {t("estimateValuation")}
          </Link>

          <div className="border-rule mt-1 flex items-center justify-between border-t pt-2">
            <button
              type="button"
              aria-pressed={rsuDetails?.simulate_dilution ?? false}
              onClick={() =>
                updateRSU({ simulate_dilution: !(rsuDetails?.simulate_dilution ?? false) })
              }
              className="border-rule aria-pressed:border-market aria-pressed:bg-market-soft aria-pressed:text-market rounded-sm border px-2 py-0.5 font-mono text-xs"
            >
              {t("dilutionToExit")}
            </button>
            {dilutedPct !== null ? (
              <span className="text-annotation text-xs">
                {t("dilutionSummary", { pct: dilutedPct })}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <Field
            label={t("optionCount")}
            value={optionsDetails?.num_options ?? null}
            onValueChange={(value) => updateOptions({ num_options: value ?? 0 })}
            min={0}
            dataField="equity"
          />
          <Field
            label={t("strikePrice")}
            value={optionsDetails?.strike_price ?? null}
            onValueChange={(value) => updateOptions({ strike_price: value ?? 0 })}
            min={0}
          />
          <Field
            label={t("vesting")}
            value={optionsDetails?.vesting_period ?? null}
            onValueChange={(value) =>
              updateOptions({ vesting_period: value ?? VALIDATION.VESTING_PERIOD_DEFAULT })
            }
            min={VALIDATION.VESTING_PERIOD_MIN}
            max={VALIDATION.VESTING_PERIOD_MAX}
          />
          <Field
            label={t("cliff")}
            value={optionsDetails?.cliff_period ?? null}
            onValueChange={(value) =>
              updateOptions({ cliff_period: value ?? VALIDATION.CLIFF_PERIOD_DEFAULT })
            }
            min={VALIDATION.CLIFF_PERIOD_MIN}
            max={VALIDATION.CLIFF_PERIOD_MAX}
          />
          <Field
            label={t("exitPricePerShare")}
            value={optionsDetails?.exit_price_per_share ?? null}
            onValueChange={(value) => updateOptions({ exit_price_per_share: value ?? 0 })}
            min={0}
            dataField="exit"
          />
        </>
      )}
    </div>
  );
}
