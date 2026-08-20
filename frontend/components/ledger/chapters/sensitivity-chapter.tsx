"use client";

import { useLocale, useTranslations } from "next-intl";
import { Chapter } from "@/components/ledger/chapter";
import {
  calculateBreakevenThresholds,
  SENSITIVITY,
  type SensitivityDataPoint,
} from "@/lib/sensitivity-utils";
import { formatMoney } from "@/lib/ledger/format-money";
import { useDisplayCurrency } from "@/lib/store";
import type {
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
  StartupScenarioResponse,
} from "@/lib/schemas";

/**
 * Controller ruling (Task 11 review, round 1, Important 1 — ledgered):
 * accepted as the plan's intended design. Chapters never fetch, so this
 * chapter can't call the real `/sensitivity` sweep; instead it backs out the
 * payout's slope against its single biggest exit-side lever from numbers the
 * backend already computed (`result.final_payout_value`), which is an exact
 * read given this backend's payout model is linear (RSU) / piecewise-linear
 * (options) in that lever, with no tax/AMT terms — not an independent
 * recalculation. It sweeps the SAME 20%-200% range as the real backend
 * sensitivity endpoint by reusing `SENSITIVITY.RANGE_LOW_MULTIPLIER`/
 * `RANGE_HIGH_MULTIPLIER` from `lib/sensitivity-utils` rather than
 * re-declaring local copies (round-1 finding: drift risk between this
 * chapter and the real endpoint's range). `calculateBreakevenThresholds`
 * itself is reused unmodified — but only for the yes/no existence check it
 * was actually designed for. Its own `.threshold` number is NOT used: that
 * value comes from `calculateThresholdValue`'s interpolation between `.low`/
 * `.high`, which (per `backend/src/worth_it/monte_carlo.py`'s real
 * `Low`/`High` = `mean_outcome` columns, mirrored by
 * `transformSensitivityResponse`) are OUTCOME values, not the swept
 * variable's own values. Feeding that function `lowDelta = low -
 * currentOutcome` (the only construction consistent with real usage) makes
 * `lowOutcome` collapse to `data.low` by algebraic identity, so the
 * interpolation always returns exactly 0 — a latent bug in the shared
 * utility discovered while writing this chapter's tests, out of scope to fix
 * here (it predates Task 11 and other consumers depend on its current
 * shape). We instead use the SAME data point purely to answer "does a
 * threshold exist in this sweep" (`calculateBreakevenThresholds`'s actual
 * job), then solve the exact linear breakeven ourselves from `payoutPerUnit`
 * — no interpolation needed since we already know the true slope.
 */

export interface SensitivityChapterProps {
  index: string;
  result: StartupScenarioResponse;
  currentJob: CurrentJobForm;
  equityDetails: RSUForm | StockOptionsForm;
}

interface ExitLever {
  /** Current value of the swept variable: exit valuation (RSU) or exit price/share (options). */
  current: number;
  /** $ payout gained per unit of the lever, backed out of the already-computed deterministic payout. */
  payoutPerUnit: number;
  /** Value below which the lever contributes nothing (the strike price for options; 0 for RSU). */
  floor: number;
}

/**
 * Backs out the payout's slope against its single biggest lever from numbers
 * the backend already computed — it does not recompute the payout formula
 * itself. Both RSU and option payouts are linear in this lever at a fixed
 * vesting/dilution schedule, so this is an exact read of that already-known
 * line, not a new financial calculation.
 */
function deriveExitLever(
  equityDetails: RSUForm | StockOptionsForm,
  payout: number
): ExitLever | null {
  if (payout <= 0) return null;
  if (equityDetails.equity_type === "RSU") {
    const current = equityDetails.exit_valuation;
    if (current <= 0) return null;
    return { current, payoutPerUnit: payout / current, floor: 0 };
  }
  const current = equityDetails.exit_price_per_share;
  const floor = equityDetails.strike_price;
  if (current <= floor) return null;
  return { current, payoutPerUnit: payout / (current - floor), floor };
}

function netAtLeverValue(lever: ExitLever, leverValue: number, opportunityCost: number): number {
  const payout = Math.max(0, leverValue - lever.floor) * lever.payoutPerUnit;
  return payout - opportunityCost;
}

/**
 * Chapter 04: "what would change the answer" — names the exit-value threshold
 * at which this offer stops beating staying, framed explicitly as a linear
 * approximation (currentJob is accepted per the chapter contract but doesn't
 * factor into this exit-side sweep; opportunity cost is held fixed across it).
 */
export function SensitivityChapter({
  index,
  result,
  currentJob: _currentJob,
  equityDetails,
}: SensitivityChapterProps) {
  const t = useTranslations("chapters");
  const locale = useLocale();
  const currency = useDisplayCurrency();

  const currentNet = result.final_payout_value - result.final_opportunity_cost;
  const lever = deriveExitLever(equityDetails, result.final_payout_value);

  let threshold: number | null = null;
  if (lever) {
    const low = lever.current * SENSITIVITY.RANGE_LOW_MULTIPLIER;
    const high = lever.current * SENSITIVITY.RANGE_HIGH_MULTIPLIER;
    const lowNet = netAtLeverValue(lever, low, result.final_opportunity_cost);
    const highNet = netAtLeverValue(lever, high, result.final_opportunity_cost);

    // .low/.high are OUTCOME values (see the file comment above) so the gate
    // — "can the low scenario push the outcome negative" — matches what the
    // real backend sweep would report for this lever.
    const dataPoint: SensitivityDataPoint = {
      variable: equityDetails.equity_type === "RSU" ? "Exit Valuation" : "Exit Price Per Share",
      low: lowNet,
      high: highNet,
      impact: Math.abs(highNet - lowNet),
      lowDelta: lowNet - currentNet,
      highDelta: highNet - currentNet,
    };
    const [found] = calculateBreakevenThresholds([dataPoint], currentNet);
    if (found) {
      // Exact closed-form breakeven for our already-known linear model:
      // netAtLeverValue(lever, x, cost) = 0  =>  x = floor + cost / payoutPerUnit.
      threshold = lever.floor + result.final_opportunity_cost / lever.payoutPerUnit;
    }
  }

  const variableLabel =
    equityDetails.equity_type === "RSU"
      ? t("sensitivity.exitValuation")
      : t("sensitivity.exitPricePerShare");

  return (
    <Chapter index={index} title={t("sensitivity.title")}>
      <p className="mt-3 text-sm">
        {threshold !== null
          ? t("sensitivity.flipThreshold", {
              variable: variableLabel,
              value: formatMoney(threshold, { currency, locale }),
            })
          : t("sensitivity.noFlip")}
      </p>
      <p className="text-annotation mt-2 text-xs">{t("sensitivity.approximation")}</p>
    </Chapter>
  );
}
