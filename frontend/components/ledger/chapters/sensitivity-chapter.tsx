"use client";

import { useLocale, useTranslations } from "next-intl";
import { Chapter } from "@/components/ledger/chapter";
import { calculateBreakevenThresholds, type SensitivityDataPoint } from "@/lib/sensitivity-utils";
import { formatMoney } from "@/lib/ledger/format-money";
import { useDisplayCurrency } from "@/lib/store";
import type {
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
  StartupScenarioResponse,
} from "@/lib/schemas";

/**
 * Sweep range mirrors the real backend sensitivity sweep's default 20%-200%
 * band (the private `SENSITIVITY.RANGE_LOW/HIGH_MULTIPLIER` constants in
 * `lib/sensitivity-utils`), so this chapter's story stays consistent with
 * that endpoint even though — per the chapters-never-fetch rule — it never
 * calls it.
 */
const RANGE_LOW_MULTIPLIER = 0.2;
const RANGE_HIGH_MULTIPLIER = 2;

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
    const low = lever.current * RANGE_LOW_MULTIPLIER;
    const high = lever.current * RANGE_HIGH_MULTIPLIER;
    const lowNet = netAtLeverValue(lever, low, result.final_opportunity_cost);
    const highNet = netAtLeverValue(lever, high, result.final_opportunity_cost);

    const dataPoint: SensitivityDataPoint = {
      variable: equityDetails.equity_type === "RSU" ? "Exit Valuation" : "Exit Price Per Share",
      low,
      high,
      impact: Math.abs(highNet - lowNet),
      lowDelta: lowNet - currentNet,
      highDelta: highNet - currentNet,
    };
    const [found] = calculateBreakevenThresholds([dataPoint], currentNet);
    threshold = found ? found.threshold : null;
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
